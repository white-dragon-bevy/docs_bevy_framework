# 插件调度配置设计说明

## 问题背景

GitHub issue #6 提出了关于插件是否应该"主动进行调度配置"的疑问。本文档说明 White Dragon Bevy 框架的调度配置设计理念。

## Rust Bevy 的设计模式

### 核心原则

**Rust Bevy 中，插件直接配置调度是标准且正确的做法。**

### 示例：TimePlugin

```rust
// bevy_time/src/lib.rs
impl Plugin for TimePlugin {
    fn build(&self, app: &mut App) {
        // ✅ 直接配置系统到调度阶段
        app.add_systems(First, time_system.in_set(TimeSystem));
        app.add_systems(
            RunFixedMainLoop,
            run_fixed_main_schedule.in_set(RunFixedMainLoopSystem::FixedMainLoop)
        );
    }
}
```

**关键点**:
- 插件自己知道系统应该在哪个调度阶段运行
- 这是插件的核心职责之一
- 不存在"调度配置中心"来统一管理

### 示例：StatesPlugin

```rust
// bevy_state/src/app.rs
impl Plugin for StatesPlugin {
    fn build(&self, app: &mut App) {
        // ✅ 直接配置调度顺序
        let mut schedule = app.world_mut().resource_mut::<MainScheduleOrder>();
        schedule.insert_after(PreUpdate, StateTransition);
    }
}
```

**关键点**:
- StatesPlugin 配置 StateTransition 调度的位置
- 这是状态系统的核心需求
- 不需要通过其他插件间接配置

## White Dragon Bevy 的实现

### 设计原则

1. **遵循 Rust Bevy 模式** - 插件直接配置调度
2. **职责明确** - 每个插件负责自己的调度需求
3. **系统集文档化** - 定义系统集用于文档和未来扩展

### TimePlugin 实现

```typescript
// bevy_time/time-plugin.ts
export class TimePlugin extends BasePlugin implements Plugin {
    build(app: App): void {
        // 1. 初始化资源
        app.insertResource<RealTime>(realTime);
        app.insertResource<VirtualTime>(virtualTime);
        // ...

        // 2. 添加系统到调度
        // ✅ 直接指定调度阶段（符合 Rust Bevy 设计）
        app.addSystems(BuiltinSchedules.FIRST, timeSystem);
        app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, runFixedMainLoop);
        app.addSystems(BuiltinSchedules.LAST, updateFrameCount);
    }
}
```

### StatesPlugin 实现

```typescript
// bevy_state/plugin.ts
export class StatesPlugin extends BasePlugin implements Plugin {
    build(app: App): void {
        // ✅ 直接配置 StateTransition 调度位置
        // 对应 Rust: schedule.insert_after(PreUpdate, StateTransition)
        const mainSubApp = app.main();
        mainSubApp.configureScheduleOrder(
            BuiltinSchedules.UPDATE,
            StateTransitionSchedule
        );
    }
}
```

### 系统集定义

虽然插件直接配置调度，但我们定义了系统集用于文档和未来扩展：

```typescript
// bevy_time/system-sets.ts
export const TimeSystems = {
    TimeUpdate: "TimeUpdate" as SystemSet,        // 时间更新
    FixedMainLoop: "FixedMainLoop" as SystemSet,  // 固定主循环
    FrameCount: "FrameCount" as SystemSet,        // 帧计数器
} as const;

// bevy_state/system-sets.ts
export const StateTransitionSteps = {
    DependentTransitions: "DependentTransitions",  // 依赖状态转换
    ExitSchedules: "ExitSchedules",                // 退出调度
    TransitionSchedules: "TransitionSchedules",    // 转换调度
    EnterSchedules: "EnterSchedules",              // 进入调度
} as const;
```

**系统集的作用**:
- 文档化：明确系统的逻辑分组
- 未来扩展：为实现 `.in_set()` API 做准备
- 依赖声明：可以让用户系统通过 `.after(TimeSystems.TimeUpdate)` 声明依赖

## 为什么没有 SchedulePlugin？

### 曾经的误解

在初始实现中，我创建了一个 `SchedulePlugin` 来"集中管理"调度配置。但这是**过度工程化**的：

```typescript
// ❌ 错误的设计（已移除）
export class SchedulePlugin extends BasePlugin {
    build(app: App): void {
        // 试图集中配置所有调度
        // 但实际上是空的，因为每个插件都自己配置了
    }
}
```

### 为什么移除

1. **Rust Bevy 中不存在** - 没有对应的概念
2. **没有实际功能** - 因为插件自己配置调度
3. **违背设计理念** - 插件应该拥有配置调度的权限
4. **增加复杂性** - 用户需要理解不必要的抽象

### 正确的设计

**插件直接配置调度就是最佳实践。**

```typescript
// ✅ 正确的设计
export class DefaultPlugins extends BasePluginGroup {
    build(): PluginGroupBuilder {
        const builder = new PluginGroupBuilder();

        // 每个插件自己配置调度
        builder.add(new LogPlugin());
        builder.add(new TimePlugin());      // 自己配置到 First/Last
        builder.add(new StatesPlugin());    // 自己配置 StateTransition

        return builder;
    }
}
```

## 调度配置的职责

### 谁负责配置？

| 插件 | 配置内容 | 理由 |
|------|---------|------|
| TimePlugin | 添加系统到 First/RunFixedMainLoop/Last | 时间系统是框架基础，必须在特定阶段运行 |
| StatesPlugin | 配置 StateTransition 调度顺序 | 状态转换必须在 PreUpdate 和 Update 之间 |
| 用户插件 | 添加系统到合适的调度阶段 | 用户最了解自己系统的执行时机 |

### 为什么这样设计？

1. **职责明确** - 插件知道自己的需求
2. **灵活性** - 用户可以根据需要配置
3. **简单性** - 不需要额外的抽象层
4. **一致性** - 与 Rust Bevy 保持一致

## 对比总结

### ❌ 过度设计（已移除）

```typescript
// 错误的"集中化"设计
SchedulePlugin (统一入口)
    └──> 配置所有插件的调度
         ├──> TimePlugin 系统
         └──> StatesPlugin 系统
```

问题：
- Rust Bevy 中不存在这种模式
- 增加不必要的抽象
- 插件失去了自主权

### ✅ 正确设计（当前实现）

```typescript
// 遵循 Rust Bevy 的分散设计
TimePlugin ──> 直接配置到 First/RunFixedMainLoop/Last
StatesPlugin ──> 直接配置 StateTransition 调度顺序
UserPlugin ──> 直接配置到合适的调度阶段
```

优势：
- 符合 Rust Bevy 设计
- 简单直观
- 职责明确

## 最佳实践

### 创建自定义插件

```typescript
export class MyGamePlugin extends BasePlugin implements Plugin {
    build(app: App): void {
        // 1. 初始化资源
        app.insertResource(new MyGameConfig());

        // 2. 直接配置系统到调度
        app.addSystems(BuiltinSchedules.UPDATE, myGameSystem);
        app.addSystems(BuiltinSchedules.POST_UPDATE, myRenderSystem);

        // 可选：声明系统集归属（用于文档）
        // 系统 myGameSystem 属于 MyGameSystems.Logic 系统集
        // 系统 myRenderSystem 属于 MyGameSystems.Render 系统集
    }
}

// 定义系统集（用于文档和未来扩展）
export const MyGameSystems = {
    Logic: "MyGameLogic" as SystemSet,
    Render: "MyGameRender" as SystemSet,
} as const;
```

### 关键要点

1. **直接配置调度** - 不要通过其他插件间接配置
2. **选择合适的调度阶段** - 根据系统的功能选择 First/PreUpdate/Update/PostUpdate/Last
3. **定义系统集** - 用于文档化和未来扩展
4. **添加注释** - 说明为什么选择这个调度阶段

## 未来扩展

### 可能的改进

1. **实现 `.in_set()` API**
   ```typescript
   app.addSystems(Update, mySystem.inSet(MyGameSystems.Logic));
   ```

2. **系统依赖声明**
   ```typescript
   app.addSystems(Update, mySystem.after(TimeSystems.TimeUpdate));
   ```

3. **系统集排序**
   ```typescript
   app.configureSet(Update, MyGameSystems.Logic.after(TimeSystems.TimeUpdate));
   ```

但即使实现这些功能，**插件仍然直接配置调度**，这是不变的原则。

## 结论

**插件直接配置调度是 Rust Bevy 的标准做法，也是 White Dragon Bevy 的正确设计。**

- ✅ 插件拥有配置调度的权限
- ✅ 不存在"调度配置中心"
- ✅ 简单、直观、符合 Rust Bevy
- ✅ 系统集用于文档和未来扩展

如果您在其他框架中看到"集中化调度配置"的设计，那不是 Bevy 的设计模式。Bevy 的哲学是：**插件自治，职责明确**。

## 相关文件

- `src/bevy_time/time-plugin.ts` - TimePlugin 实现
- `src/bevy_time/system-sets.ts` - TimeSystems 定义
- `src/bevy_state/plugin.ts` - StatesPlugin 实现
- `src/bevy_state/system-sets.ts` - StateTransitionSteps 定义
- `src/bevy_internal/default-plugins.ts` - DefaultPlugins 实现

## 参考

- [Rust Bevy Plugin 文档](https://docs.rs/bevy/latest/bevy/app/trait.Plugin.html)
- [Rust Bevy Scheduling 文档](https://docs.rs/bevy/latest/bevy/ecs/schedule/index.html)
- GitHub issue #6: 插件调度配置设计讨论

---
name: bevy-state
description: White Dragon Bevy 的状态管理系统。当你需要管理游戏全局状态机(菜单、游戏中、暂停等)、实现状态转换、条件系统执行时使用。适用于游戏流程控制、UI 状态管理等场景。
license: See project root LICENSE
---

# bevy-state 与 Rust Bevy 对比

> 本文档假设读者熟悉 Rust Bevy 0.16+ 的 `bevy_state` crate

## 核心概念对比

### 1. States trait 映射

**Rust Bevy**:
- 使用 trait 约束: `States: 'static + Send + Sync + Clone + PartialEq + Eq + Hash + Debug`
- 使用 `#[derive(States)]` 宏自动实现
- 基于枚举的类型安全设计
- `DEPENDENCY_DEPTH` 常量用于依赖深度检测

**TypeScript 实现**:
- 使用 `States` 接口: `getStateId()`, `equals()`, `clone()`
- 无宏支持，提供三种创建方式：
  - `createStates()` 辅助函数（推荐）
  - `EnumStates` 基类
  - 手动实现 `States` 接口
- 基于 string/number ID 而非枚举类型
- `DEPENDENCY_DEPTH` 是可选静态属性

**关键差异**: TS 使用运行时 ID 比较而非编译时类型检查

### 2. State 资源

**Rust**:

```rust
pub struct State<S: States>(pub S);
pub enum NextState<S: States> {
    Unchanged,
    Pending(S),
}
```

**TypeScript**:

```typescript
class State<S extends States> {
    get(): S;
    is(state: S): boolean;
}

class NextState<S extends States> {
    set(state: S): void;
    clear(): void;
}
```

**差异**: TS 的 `NextState` 是类而非枚举，提供 `.is()` 便捷方法

### 3. 状态转换调度

**Rust**: `OnEnter<S>`, `OnExit<S>`, `OnTransition<S>` 是编译时类型

**TypeScript**: `OnEnter(state)`, `OnExit(state)`, `OnTransition(from, to)` 是运行时构造的调度标签

**差异**: TS 使用 `getTypeDescriptor()` 实现动态类型标识

### 4. ComputedStates

**Rust**:

```rust
pub trait ComputedStates: States {
    type SourceStates: StateSet;  // 支持多源
    fn compute(sources: Self::SourceStates) -> Option<Self>;
}
```

**TypeScript**:

```typescript
abstract class BaseComputedStates<TSource extends States> {
    abstract compute(source: TSource | undefined): this | undefined;  // 单源
}
```

**关键差异**: TS 当前仅支持单源状态，Rust 支持多源元组

### 5. SubStates

**Rust**: 使用 `#[derive(SubStates)]` 和 `#[source(...)]` 属性，支持复杂模式匹配

**TypeScript**: 使用显式配置对象 `SubStateConfig`，通过 `allowedParentStates: Set` 匹配

**差异**: TS 简化为 ID 集合匹配，Rust 支持更复杂的条件

### 6. 运行条件

**Rust**:

```rust
in_state(state: S) -> impl FnMut(Option<Res<State<S>>>) -> bool
```

**TypeScript**:

```typescript
inState<S>(ctor: Constructor<S>, state: S): RunConditionFn
enteringState<S>(ctor: Constructor<S>, state: S): RunConditionFn  // TS 额外提供
exitingState<S>(ctor: Constructor<S>, state: S): RunConditionFn   // TS 额外提供
```

**差异**: TS 需要显式传递构造函数，额外提供基于事件的转换条件

### 7. State Scoped Entities

**Rust 0.16+**:

```rust
#[derive(Component)]
struct StateScoped<S: States> { ... }
```

**TypeScript**:

```typescript
markForDespawnOnExit(world, entity, state)
markForDespawnOnEnter(world, entity, state)

// 内部组件
class DespawnOnExit<S> { }
class DespawnOnEnter<S> { }
```

**差异**: TS 使用两个独立组件提供更细粒度控制

### 8. StateTransitionEvent

**Rust**: `StateTransitionEvent<S>`

**TypeScript**: `StateTransitionMessage<S>` (框架内命名约定)，提供便捷查询方法 `isExitingFrom()`, `isEnteringTo()`

## API 对比表

| 功能 | Rust Bevy | TypeScript |
|------|-----------|------------|
| 初始化状态 | `app.init_state::<S>()` | `app.insertState(initialState)` |
| 插入状态 (v0.5.0+) | 无 | `app.insertState(state)` |
| 注册计算状态 | `app.add_computed_state::<CS>()` | `app.addComputedState(S.constructor, CS)` |
| 注册子状态 | `app.add_sub_state::<SS>()` | `app.addSubState(SS)` |
| 系统条件 | `.run_if(in_state(S::Variant))` | `addSystemWithCondition(sched, sys, inState(S.constructor, S.VARIANT))` |
| 多源计算状态 | ✅ 支持 | ❌ 不支持 |
| Send + Sync | ✅ 需要 | ❌ 不需要(单线程) |

## 功能完整性

### 已实现 ✅
- 标准状态（States）
- 状态转换生命周期 (OnEnter/OnExit/OnTransition)
- 计算状态（单源）
- 子状态
- 运行条件（含组合条件）
- 状态作用域实体
- 状态转换事件

### 简化实现 ⚠️
- ComputedStates 仅支持单源
- SubStates 使用 Set 匹配而非模式匹配
- 无 FreelyMutableState trait（TS 不需要）

### 平台适配 🔧
- 移除 `Send + Sync` 约束（单线程环境）
- 使用 `Constructor<T>` 类型
- 使用框架 `Message` 系统替代 Bevy Event

## 快速示例

### 基础状态机

```typescript
import { App } from "bevy_app";
import { createStates, OnEnter, OnExit } from "bevy_state";

const GameState = createStates({
	MENU: "menu",
	PLAYING: "playing"
});

const app = App.create()
	.insertState(GameState.MENU);

app.addSystems(OnEnter(GameState.PLAYING), (world) => {
	print("游戏开始");
});
```

### 计算状态

```typescript
class UiMode extends BaseComputedStates<typeof GameState.MENU> {
	compute(source: typeof GameState.MENU | undefined) {
		if (source?.equals(GameState.MENU)) return new UiMode("full");
		if (source?.equals(GameState.PLAYING)) return new UiMode("minimal");
		return undefined;
	}
}

app.addComputedState(GameState.constructor, UiMode);
```

### 子状态

```typescript
const MenuPage = createEnumSubState(
	{
		parentType: GameState.constructor,
		allowedParentStates: new Set(["menu"])
	},
	{
		MAIN: "main",
		SETTINGS: "settings"
	}
);

app.addSubState(MenuPage.type);
```

### 状态作用域

```typescript
app.addSystems(OnEnter(GameState.MENU), (world) => {
	const ui = world.spawn();
	markForDespawnOnExit(world, ui, GameState.MENU);
});
```

## 迁移提示

从 Rust Bevy 迁移时需注意：

1. **状态定义**: 用 `createStates()` 替代 `#[derive(States)]`
2. **类型参数**: 多数 API 需显式传递构造函数
3. **运行条件**: 使用 `addSystemWithCondition` 而非 `.run_if()`
4. **多源计算状态**: 当前不支持，需拆分为多个单源状态
5. **事件监听**: 使用 `getStateTransitionReader()` 而非 EventReader

---

## 版本变更 (v0.5.0-alpha)

### StatesPlugin 架构重构

**变更原因**: 对齐 Rust Bevy 的 `bevy_state` 设计，使用非泛型基础设施插件

**旧版本 (v0.4.x)**:
```typescript
// 泛型插件，需为每个状态类型创建插件
app.addPlugins(StatesPlugin.create<GameState>({
    defaultState: GameState.MENU
}));
```

**新版本 (v0.5.0+)**:
```typescript
// 非泛型基础设施插件（包含在 DefaultPlugins 中）
app.addPlugins(new DefaultPlugins())  // 自动包含 StatesPlugin
   .insertState(GameState.MENU);       // 动态注册状态
```

**API 变更**:
- ✅ `app.insertState(state)` - 新增，插入初始状态
- ⚠️ `app.initState(() => state)` - 已弃用，仍可用但推荐使用 `insertState`
- ❌ `StatesPlugin.create<S>({ ... })` - 已移除，使用非泛型 `StatesPlugin`

---

**源码路径**: `D:/projects/white-dragon-bevy/bevy_framework/src/bevy_state/`
**对应 Rust 版本**: Bevy 0.16 (bevy_state 0.17.0-dev)
**当前版本**: v0.5.0-alpha
**最后更新**: 2025-10-27

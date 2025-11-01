---
name: bevy-app
description: White Dragon Bevy 应用程序和插件系统 - Rust Bevy 0.16 的 TypeScript/Roblox 移植版本
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_app/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/__examples__/app/**)
  - Bash(npm test bevy_app)
  - Bash(npm run build)
---

# bevy_app - 与 Rust Bevy 0.16 的对应关系

> 假设读者精通 Rust Bevy 0.16，本文档仅说明 TypeScript/Roblox 移植版的关键差异。

## 核心架构映射

### App 类

**API 对应表**：

| Rust Bevy | TypeScript | 差异说明 |
|-----------|-----------|---------|
| `App::new()` | `App.create(options?)` | 包含默认调度和插件，支持环境选项 |
| `App::empty()` | `App.empty()` | 空白应用，无默认配置 |
| `add_plugins()` | `addPlugins()` | **统一 API**：支持单个/多个插件和插件组 |
| `add_systems()` | `addSystems()` | 驼峰命名 |
| `insert_resource()` | `insertResource()` | 需显式泛型参数 |
| `world().resource::<T>()` | `getResource<T>()` | 可能返回 `undefined` |
| `world_mut()` | `world()` | 直接返回可变引用，无需区分 `&` / `&mut` |
| `run()` | `run()` | 返回 `void`，非 `AppExit` |

**关键差异**：
1. **可变性语义**：TypeScript 无需区分 `&App` / `&mut App`，所有方法返回 `this` 支持链式调用
2. **类型擦除**：资源通过运行时 `TypeDescriptor` 识别，而非编译期泛型
3. **资源安全性**：`getResource()` 可能返回 `undefined`，需手动检查

---

## Plugin 系统

### 接口差异

**Rust Bevy**:
- 支持函数式插件 `fn(&mut App)` 通过 `impl<T: Fn(&mut App)> Plugin for T`
- 通过 trait 扩展提供额外功能
- 泛型在编译期解析

**TypeScript**:
- **必须用类实现** `Plugin` 接口，不支持函数式插件
- 通过插件扩展接口（`extension` 字段）替代 trait 扩展
- 新增 `robloxContext` 字段支持客户端/服务端隔离

### 扩展系统（替代 Rust trait 扩展）

TypeScript 通过插件扩展工厂提供功能，对应 Rust 的 trait 扩展：

```typescript
// 定义扩展工厂
export interface TimePluginExtension {
	getDeltaSeconds: ExtensionFactory<() => number>;
}

// 插件实现扩展
export class TimePlugin implements Plugin<TimePluginExtension> {
	extension = {
		getDeltaSeconds: (world, context, plugin) => {
			return () => plugin.getDelta();
		}
	};

	build(app: App): void { }
	name(): string { return "TimePlugin"; }
}

// 系统中使用
function mySystem(world: World): void {
	const timeExt = context.getExtension<TimePluginExtension>();
	const dt = timeExt?.getDeltaSeconds() ?? 0;
}
```

**差异原因**：TypeScript 缺乏编译期 trait 系统，使用运行时扩展工厂机制。

### Roblox 环境隔离（TypeScript 特有）

新增功能，Rust Bevy 无此概念：

```typescript
export class RenderPlugin implements Plugin {
	robloxContext = RobloxContext.Client;  // 仅客户端执行

	build(app: App): void {
		// 此代码仅在客户端环境运行
	}
}
```

**使用场景**：
- `RobloxContext.Client`：渲染、UI、输入系统
- `RobloxContext.Server`：权威游戏逻辑、网络同步
- `RobloxContext.Both`：共享逻辑（默认）

---

## 调度系统

### 内置调度完全对应

```typescript
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_app";

// 启动阶段（一次性）
BuiltinSchedules.PRE_STARTUP   // PreStartup
BuiltinSchedules.STARTUP       // Startup
BuiltinSchedules.POST_STARTUP  // PostStartup

// 主循环（每帧）
BuiltinSchedules.FIRST         // First
BuiltinSchedules.PRE_UPDATE    // PreUpdate
BuiltinSchedules.UPDATE        // Update
BuiltinSchedules.POST_UPDATE   // PostUpdate
BuiltinSchedules.LAST          // Last
```

**执行顺序与 Rust 完全一致**。

### 系统签名差异（最大差异）

**Rust Bevy**：使用 `SystemParam` trait 自动注入参数
- `Query<&Transform>`, `Res<Time>`, `Commands` 等

**TypeScript**：统一签名 `(world: World) => void`
- 手动查询组件：`world.query(Transform)`
- 手动获取扩展：`context.getExtension<T>()`

```typescript
function movementSystem(world: World): void {
	// 手动获取时间扩展（对应 Rust 的 Res<Time>）
	const timeExt = context.getExtension<TimePluginExtension>();
	const dt = timeExt?.getDeltaSeconds() ?? 0;

	// 手动查询组件（对应 Rust 的 Query<(&mut Transform, &Velocity)>）
	for (const [id, transform, velocity] of world.query(Transform, Velocity)) {
		// Matter ECS 组件不可变，需重新插入
		world.insert(id, transform.translate(velocity.scale(dt)));
	}
}
```

**差异原因**：TypeScript 无法实现 Rust 的 `SystemParam` trait 系统。

---

## 资源管理

### 类型识别机制

**Rust**：编译期泛型 `#[derive(Resource)]`
**TypeScript**：运行时 `TypeDescriptor`

```typescript
class GameConfig {
	static readonly TYPE_ID = new TypeDescriptor("GameConfig");  // 必需
	constructor(public difficulty: number) {}
}

app.insertResource(new GameConfig(1));
const config = app.getResource<GameConfig>();  // 可能为 undefined
```

**关键差异**：
1. 必须手动定义 `static TYPE_ID`（Rust 通过宏自动生成）
2. 运行时查找，可能返回 `undefined`
3. 需手动类型检查（Rust 编译期保证）

### World API 风格

```typescript
// ✅ 推荐：Bevy 风格（对应 Rust world.resource() / world.insert_resource()）
world.insertResource(new MyResource());
const res = world.getResource<MyResource>();
world.hasResource<MyResource>();
world.removeResource<MyResource>();

// ⚠️ 已弃用但可用
world.resources.getResource<MyResource>();
```

---

## Roblox 平台适配

### Runner 插件

**Rust**：`WinitPlugin` / `ScheduleRunnerPlugin` 驱动事件循环
**TypeScript**：`RobloxRunnerPlugin` 使用 Roblox RunService

```typescript
app.addPlugins(new RobloxRunnerPlugin({
	mode: "Heartbeat",      // 每帧执行（默认）
	// mode: "Stepped",     // 物理步进前
	// mode: "RenderStepped", // 渲染前（仅客户端）
}));
```

### ECS 实现差异

使用 `@rbxts/matter` 替代 Bevy ECS：

**组件查询**（相似）：
```typescript
for (const [id, transform, velocity] of world.query(Transform, Velocity)) {
	// 处理实体
}
```

**组件修改**（不同）：
- **Rust**：组件可变引用，直接修改 `transform.position.x += 1;`
- **TypeScript**：组件不可变，需重新插入

```typescript
// ❌ 错误（Rust 风格）
transform.position.x += 1;

// ✅ 正确（Matter 风格）
world.insert(id, new Transform(
	transform.position.add(new Vec3(1, 0, 0))
));
```

---

## Hook 系统（TypeScript 特有）

受 React Hooks 启发，简化系统状态管理（Rust 无对应）：

```typescript
function mySystem(world: World): void {
	// 状态管理
	const [count, setCount] = world.useState(0);
	const lastTime = world.useRef(0);

	// 防抖打印（避免每帧输出刷屏）
	world.useDebugPrint(`Count: ${count}`);

	// 监听 Roblox 事件
	for (const player of world.useEvent(Players, "PlayerAdded")) {
		print(`${player.Name} joined`);
		setCount(count + 1);
	}
}
```

**约束**：
- ❌ 不能用 `try` 包裹 hook（内存泄漏）
- ✅ Hook 调用顺序必须一致（类似 React）

---

## SubApp

完全对应 Rust 的 `SubApp`，用途相同：
- 隔离不同功能域（渲染、网络）
- 独立调度控制
- 资源隔离

---

## PluginGroup

对应 Rust 的 `PluginGroup` trait，用法相同：

```typescript
export class MyPluginGroup extends BasePluginGroup {
	build(): PluginGroupBuilder {
		return new PluginGroupBuilder()
			.add(new Plugin1())
			.add(new Plugin2());
	}
}

// 使用
app.addPlugins(...new MyPluginGroup().build());
app.addPlugins(...new MyPluginGroup().disable(Plugin1).build());
```

---

## 常见陷阱

### 1. 资源未定义 TYPE_ID

```typescript
// ❌ 运行时错误
class MyResource { value: number = 0; }

// ✅ 正确
class MyResource {
	static readonly TYPE_ID = new TypeDescriptor("MyResource");
	value: number = 0;
}
```

### 2. 假设资源存在

```typescript
// ❌ 危险（Rust 风格，编译期保证存在）
const config = app.getResource<GameConfig>()!;

// ✅ 安全（TypeScript 需手动检查）
const config = app.getResource<GameConfig>();
if (config) { /* 使用 config */ }
```

### 3. 系统中阻塞操作

```typescript
// ❌ 错误（卡住主线程）
function badSystem(world: World): void {
	task.wait(1);
}

// ✅ 正确（异步执行）
function goodSystem(world: World): void {
	task.spawn(() => task.wait(1));
}
```

### 4. Matter 组件不可变

```typescript
// ❌ 错误（Rust 可直接修改）
for (const [id, transform] of world.query(Transform)) {
	transform.position.x += 1;  // 无效
}

// ✅ 正确（重新插入）
for (const [id, transform] of world.query(Transform)) {
	world.insert(id, new Transform(
		transform.position.add(new Vec3(1, 0, 0))
	));
}
```

---

## 迁移指南

### 从 Rust Bevy 插件迁移

**关键步骤**：
1. **函数插件 → 类实现**：`fn(&mut App)` → `class implements Plugin`
2. **添加 TYPE_ID**：所有资源类添加 `static TYPE_ID`
3. **trait 扩展 → 插件扩展**：通过 `extension` 字段提供
4. **系统参数 → 手动查询**：`Query<T>` / `Res<R>` → 手动调用 API

**模板**：
```typescript
import { Plugin, App, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
import { TypeDescriptor } from "@white-dragon-bevy/bevy_core";

export class MyPlugin implements Plugin {
	constructor(private config?: Partial<MyConfig>) {}

	build(app: App): void {
		app.addSystems(BuiltinSchedules.STARTUP, initSystem)
		   .addSystems(BuiltinSchedules.UPDATE, updateSystem)
		   .insertResource(new MyResource(this.config));
	}

	name(): string { return "MyPlugin"; }
	isUnique(): boolean { return true; }
}
```

### 系统迁移关键改动

1. **去除参数注入**：`Query<&T>`, `Res<R>`, `Commands` → 手动查询
2. **组件不可变**：`&mut T` → 重新插入组件
3. **异步处理**：阻塞调用 → `task.spawn()`

---

## 最佳实践

### 1. 插件开发规范

```typescript
export class WellDesignedPlugin implements Plugin {
	constructor(config?: Partial<PluginConfig>) {
		this.config = { ...defaultConfig, ...config };
	}

	build(app: App): void {
		app.addSystems(BuiltinSchedules.STARTUP, initSystem)
		   .addSystems(BuiltinSchedules.UPDATE, updateSystem);
		app.insertResource(new PluginResource(this.config));
	}

	name(): string { return "WellDesignedPlugin"; }
	isUnique(): boolean { return true; }
}
```

### 2. 使用调度常量

```typescript
// ✅ 推荐
app.addSystems(BuiltinSchedules.UPDATE, gameSystem);

// ❌ 避免硬编码
app.addSystems("Update", gameSystem);
```

### 3. 安全资源访问

```typescript
function mySystem(world: World): void {
	const config = context.getApp().getResource<GameConfig>();
	if (config) {
		const difficulty = config.difficulty;
	}
}
```

---

## 哲学一致性

### 保留的核心理念
- ✅ 插件化架构
- ✅ 调度系统（执行顺序控制）
- ✅ 资源管理（全局单例）
- ✅ 链式 API（流畅构建器）
- ✅ 生命周期钩子（`build/ready/finish/cleanup`）

### 平台适配差异
- **类型系统**：编译期泛型 → 运行时 `TypeDescriptor`
- **系统参数**：自动注入 → 手动查询
- **并发模型**：多线程 → 单线程（Roblox Luau）
- **错误处理**：`panic!` → `pcall`
- **Runner**：Winit → Roblox RunService

**设计目标**：保留 Bevy 的 API 风格和使用体验，同时适配 TypeScript/Roblox 平台限制。

---

## 版本迁移指南

### v0.1.0+ Breaking Changes

#### API 统一：`addPlugin` 已移除

**变更原因**：完全对齐 Rust Bevy 的 API 设计（只有 `add_plugins()`）

**迁移步骤**：

```typescript
// ❌ v0.0.x (已移除)
app.addPlugin(MyPlugin);
app.addPlugin(AnotherPlugin);

// ✅ v0.1.0+ (统一使用 addPlugins)
app.addPlugins(MyPlugin);
app.addPlugins(AnotherPlugin);

// 或批量添加
app.addPlugins(MyPlugin, AnotherPlugin);
```

**API 功能对比**：

| 功能 | v0.0.x | v0.1.0+ |
|------|--------|---------|
| 单个插件 | `addPlugin(p)` | `addPlugins(p)` |
| 多个插件 | 多次 `addPlugin()` | `addPlugins(p1, p2, ...)` |
| 插件组 | `addPlugins(...group)` | `addPlugins(group)` |

**自动迁移**：

```bash
# 全局搜索替换（VS Code）
Find: \.addPlugin\(
Replace: .addPlugins(
```

**类型安全增强**：

```typescript
// v0.1.0+ 新增：PluginGroup 接口必须包含 __brand
export interface PluginGroup {
    readonly __brand: "PluginGroup";  // 编译时强制检查
    build(): PluginGroupBuilder;
    name(): string;
}
```

这确保运行时类型检查（`isPluginGroup()`）与编译时类型系统一致。

### v0.3.0+ 环境模拟支持

**变更原因**：支持测试环境下的环境模拟，允许在客户端环境运行服务端逻辑

**新增功能**：

```typescript
// 创建带环境选项的 App
const app = App.create({
    env: {
        isServer: true,    // 模拟服务端环境
        isClient: false,
        isStudio: true,
        isInCloud: false,
        isEnableTest: true
    }
});
```

**使用场景**：
- 单元测试：在客户端环境测试服务端逻辑
- 集成测试：模拟不同环境组合
- 开发调试：快速切换环境状态

**注意事项**：
- 仅在测试环境有效（`RunService.IsStudio()` 为 true）
- 生产环境会忽略环境选项，使用真实环境
- 环境选项会传递给所有 SubApp

---

## 相关资源

### 源代码
- **TypeScript 实现**: `src/bevy_app/`
- **Rust 原版**: `bevy-origin/crates/bevy_app/`
- **示例**: `src/__examples__/app/`
- **测试**: `src/bevy_app/__tests__/`

### 文档
- [插件扩展系统](../architecture/plugin-extensions.md)
- [World API 对比](../architecture/world-api-comparison.md)

### 外部链接
- [Rust Bevy 0.16 Docs](https://docs.rs/bevy/0.16/bevy/app/)
- [Matter ECS](https://eryn.io/matter/)
- [roblox-ts](https://roblox-ts.com/)

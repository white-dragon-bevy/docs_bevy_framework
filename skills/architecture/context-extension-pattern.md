# Context 扩展模式

> **版本**: v0.9.0-alpha
> **更新日期**: 2025-10-31

## 概述

Context 扩展模式允许插件模块通过类型安全的方式向 `Context` 对象添加资源引用访问器，实现类似 Rust trait 扩展的功能。这是 White Dragon Bevy 框架中实现模块化和可扩展性的核心机制之一。

## 核心机制

### 1. 资源引用注册

使用 `setContextResourceRef<T>(name, id?, text?)` 函数注册资源引用：

```typescript
import { setContextResourceRef } from "bevy_ecs/context";
import type { MyResource } from "./my-resource";

// 注册资源引用
setContextResourceRef<MyResource>("myResource");
```

### 2. TypeScript 类型扩展

通过 TypeScript 的模块扩展（module augmentation）添加类型定义：

```typescript
declare module "../bevy_ecs/context" {
	interface Context {
		myResource: MyResource;
	}
}
```

### 3. 使用扩展

在系统中通过 `world.context` 访问扩展的资源：

```typescript
function mySystem(world: World): void {
	// 直接通过 context 访问资源（懒加载）
	const resource = world.context.myResource;

	// 使用资源
	print(resource.someProperty);
}
```

## 完整示例

### 创建 context-extension.ts 文件

```typescript
// src/my_module/context-extension.ts
import { setContextResourceRef } from "bevy_ecs/context";
import type { MyPluginResource } from "./types";

// 1. 声明模块扩展（类型定义）
declare module "../bevy_ecs/context" {
	interface Context {
		myPlugin: MyPluginResource;
	}
}

// 2. 注册资源引用
setContextResourceRef<MyPluginResource>("myPlugin");
```

### 在插件中初始化资源

```typescript
// src/my_module/plugin.ts
import "./context-extension"; // 导入扩展定义

export class MyPlugin implements Plugin {
	build(app: App): void {
		// 初始化资源
		app.insertResource(new MyPluginResource());

		// 添加系统
		app.addSystems(BuiltinSchedules.UPDATE, mySystem);
	}
}
```

### 在系统中使用

```typescript
// src/my_module/systems.ts
import type { World } from "bevy_ecs";

function mySystem(world: World): void {
	// 方式 1: 通过 context 访问（推荐）
	const resource = world.context.myPlugin;

	// 方式 2: 直接从 world 获取（备选）
	const resource2 = world.getResource<MyPluginResource>();
}
```

## 工作原理

### Metatable 懒加载

Context 类使用 Lua 的 metatable `__index` 机制实现懒加载：

```typescript
// 简化版实现
constructor(readonly world: World) {
	const metatable = getmetatable(this) as Record<string, unknown>;
	metatable.__index = function (tbl: Context, name: string) {
		const handler = properties.get(name);
		if (handler !== undefined) {
			const result = handler(tbl);
			// 缓存结果，避免重复查询
			(tbl as unknown as Record<string, unknown>)[name] = result;
			return result;
		}
		return (Context as unknown as Record<string, unknown>)[name];
	};
}
```

### 资源工厂函数

每个注册的资源引用都有一个工厂函数：

```typescript
const resourceFactory = (context: Context) => {
	const resource = context.world.resources.getResource<T>(id, text);
	if (resource === undefined) {
		error(`context.${name}: Resource Reference ${name} not found`);
	}
	return resource;
};
```

### 首次访问流程

1. 首次访问 `context.myPlugin` 时
2. 触发 metatable 的 `__index`
3. 执行资源工厂函数，从 world 获取资源
4. 将资源缓存到 context 对象上
5. 返回资源

### 后续访问

直接从 context 对象获取缓存的资源，无需再次查询。

## 最佳实践

### ✅ 推荐做法

1. **统一的文件命名**：使用 `context-extension.ts` 作为扩展文件名
2. **导入扩展**：在插件文件顶部导入扩展定义
3. **资源初始化**：在插件的 `build` 方法中初始化资源
4. **错误处理**：确保资源在使用前已被初始化

```typescript
// ✅ 正确的扩展结构
src/my_module/
├── context-extension.ts  // Context 扩展定义
├── plugin.ts             // 导入扩展，初始化资源
├── types.ts              // 资源类型定义
└── systems.ts            // 使用 context 访问资源
```

### ❌ 避免的做法

1. **不要在系统中直接修改 context**
```typescript
// ❌ 错误
function badSystem(world: World): void {
	world.context.myResource = new MyResource(); // 不要这样做！
}
```

2. **不要跳过类型扩展**
```typescript
// ❌ 错误：只注册了资源引用，没有类型定义
setContextResourceRef<MyResource>("myResource");
// 缺少 declare module 语句
```

3. **不要忘记初始化资源**
```typescript
// ❌ 错误：注册了扩展但没有初始化资源
export class MyPlugin implements Plugin {
	build(app: App): void {
		// 忘记调用 app.insertResource(...)
		app.addSystems(BuiltinSchedules.UPDATE, mySystem);
	}
}
// 运行时错误：Resource Reference myResource not found
```

## 现有扩展示例

### bevy_time 模块

```typescript
// src/bevy_time/context-extension.ts
import { setContextResourceRef } from "bevy_ecs/context";
import type {
	FixedTime,
	GenericTime,
	RealTime,
	VirtualTime,
	TimePluginResource,
	TimeStatsManager,
	TimeUpdateStrategyResource,
	FrameCountResource
} from "./time-resources";

declare module "../bevy_ecs/context" {
	interface Context {
		fixedTime: FixedTime;
		frameCount: FrameCountResource;
		genericTime: GenericTime;
		realTime: RealTime;
		timeResource: TimePluginResource;
		timeStats: TimeStatsManager;
		timeUpdateStrategy: TimeUpdateStrategyResource;
		virtualTime: VirtualTime;
	}
}

setContextResourceRef<TimePluginResource>("timeResource");
setContextResourceRef<GenericTime>("genericTime");
setContextResourceRef<FrameCountResource>("frameCount");
setContextResourceRef<VirtualTime>("virtualTime");
setContextResourceRef<RealTime>("realTime");
setContextResourceRef<FixedTime>("fixedTime");
setContextResourceRef<TimeStatsManager>("timeStats");
setContextResourceRef<TimeUpdateStrategyResource>("timeUpdateStrategy");
```

使用示例：
```typescript
function printTime(world: World): void {
	const time = world.context.virtualTime;
	print(`Elapsed: ${time.elapsedSeconds()}s`);
}
```

### bevy_log 模块

```typescript
// src/bevy_log/context-extension.ts
import { setContextResourceRef } from "bevy_ecs/context";
import type { LogPluginResource } from "./types";

declare module "../bevy_ecs/context" {
	interface Context {
		logger: LogPluginResource;
	}
}

setContextResourceRef<LogPluginResource>("logger");
```

使用示例：
```typescript
function checkLogLevel(world: World): void {
	const logger = world.context.logger;
	print(`Current log level: ${logger.level}`);
}
```

### bevy_ecs_debugger 模块

```typescript
// src/bevy_ecs_debugger/context-extension.ts
import { setContextResourceRef } from "bevy_ecs/context";
import type { DebuggerWidgets } from "./types";

declare module "../bevy_ecs/context" {
	interface Context {
		debuggerWidgets: DebuggerWidgets;
	}
}

setContextResourceRef<DebuggerWidgets>("debuggerWidgets");
```

使用示例：
```typescript
function debugUI(world: World): void {
	const widgets = world.context.debuggerWidgets;
	widgets.window("Debug Info", () => {
		widgets.label("Debug information here");
	});
}
```

## 性能考虑

### 懒加载优势

- **首次访问开销**：资源查询 + 缓存写入
- **后续访问开销**：直接读取缓存（O(1) 查找）
- **内存占用**：仅缓存已访问的资源

### 与直接访问对比

```typescript
// 方式 1: 通过 context (有缓存)
const time1 = world.context.virtualTime; // 首次查询
const time2 = world.context.virtualTime; // 直接读取缓存

// 方式 2: 直接从 world (每次查询)
const time3 = world.getResource<VirtualTime>(); // 每次都查询
const time4 = world.getResource<VirtualTime>(); // 每次都查询
```

**性能建议**：在需要多次访问同一资源的系统中，使用 `context` 方式可以减少重复查询开销。

## 调试技巧

### 检查已注册的扩展

```typescript
// 在运行时检查 context 上的属性
const context = world.context;
for (const [key, value] of pairs(context as unknown as Map<string, unknown>)) {
	print(`${key}: ${value}`);
}
```

### 错误排查

常见错误及解决方案：

1. **错误**: `context.xxx: Resource Reference xxx not found`
   - **原因**: 资源未初始化
   - **解决**: 在插件的 `build` 方法中调用 `app.insertResource(...)`

2. **错误**: TypeScript 类型错误 `Property 'xxx' does not exist on type 'Context'`
   - **原因**: 缺少类型扩展声明
   - **解决**: 添加 `declare module "../bevy_ecs/context"` 语句

3. **错误**: 访问 context 属性返回 `undefined`
   - **原因**: 资源引用未注册
   - **解决**: 调用 `setContextResourceRef<T>("name")`

## 迁移指南

### 从旧的 getExtension 模式迁移

**旧模式** (已废弃):
```typescript
function oldSystem(world: World, context: Context): void {
	const extension = context.getExtension<MyExtension>();
	const resource = extension.myResource;
}
```

**新模式** (推荐):
```typescript
function newSystem(world: World): void {
	const resource = world.context.myResource;
}
```

**迁移步骤**:
1. 创建 `context-extension.ts` 文件
2. 声明模块扩展和注册资源引用
3. 在插件中导入扩展定义
4. 更新系统签名，移除 `context` 参数
5. 通过 `world.context.xxx` 访问资源

## 相关文档

- [App 扩展模式](./app-extension-guide.md)
- [插件开发规范](./plugin-development-specification.md)
- [插件扩展机制](./plugin-extensions.md)
- [系统签名变更指南](./migration/system-signature-changes.md)

## 总结

Context 扩展模式提供了一种类型安全、性能优化的方式来访问插件资源：

- ✅ 类型安全：通过 TypeScript 模块扩展确保类型正确
- ✅ 懒加载：首次访问时查询，后续访问使用缓存
- ✅ 简洁语法：`world.context.myResource` 而不是 `world.getResource<MyResource>()`
- ✅ 模块化：每个插件管理自己的扩展定义
- ✅ 可维护：清晰的文件结构和命名约定

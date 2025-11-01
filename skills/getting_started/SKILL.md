---
name: getting-started
description: White Dragon Bevy 框架快速入门指南。当你初次接触框架、想要快速了解核心概念、创建第一个应用或学习基础用法时使用。适用于新手入门、框架概览、快速原型开发等场景。
---

# White Dragon Bevy 快速入门指南

## 📖 欢迎来到 White Dragon Bevy

White Dragon Bevy 是一个将 Rust Bevy 游戏引擎框架移植到 Roblox 平台的 TypeScript 框架。它提供了现代化的 ECS（实体组件系统）架构、完整的插件系统和生命周期管理，让你能够在 Roblox 上使用先进的游戏开发模式。

### 为什么选择 White Dragon Bevy？

- **模块化架构** - 通过插件系统实现功能的高度模块化和复用
- **类型安全** - 充分利用 TypeScript 的类型系统提供编译时保障
- **高性能** - 基于 @rbxts/matter ECS 框架，提供高效的实体管理
- **Bevy 理念** - 继承 Rust Bevy 的设计哲学，保持 API 一致性
- **丰富的插件** - 内置时间、状态、日志、诊断等常用插件

### 与 Rust Bevy 的关系

White Dragon Bevy 是 Rust Bevy 框架的精神继承者：
- **相同的架构模式** - App、Plugin、Schedule、System、Resource 等核心概念保持一致
- **相似的 API 设计** - 尽可能保持与 Rust Bevy 相似的 API 接口
- **适应性改造** - 针对 Roblox 平台特性和 TypeScript 语言特性进行优化

**主要差异**:
- 使用 @rbxts/matter 替代 Rust 的 ECS 实现
- 使用 TypeScript 的类型系统替代 Rust 的泛型系统
- 针对 Roblox 的客户端/服务端架构进行特殊优化

## 🎯 何时使用这个指南

这个指南适合以下场景：
- ✅ 第一次接触 White Dragon Bevy 框架
- ✅ 想要快速了解框架的核心概念
- ✅ 需要在 5 分钟内创建第一个应用
- ✅ 寻找常见任务的快速参考
- ✅ 想要通过完整示例学习框架
- ✅ 计划系统性学习框架的各个模块

**不适合的场景**:
- ❌ 需要深入了解特定模块的实现细节（请查看对应的 core-skills）
- ❌ 需要高级功能和最佳实践（请查看架构文档）
- ❌ 需要解决特定问题（请查看常见问题或进阶主题）

## 🚀 5 分钟快速开始

### 前置要求

确保你已经安装：
- Node.js (v16+)
- pnpm (推荐) 或 npm
- roblox-ts 编译器

### 步骤 1: 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 步骤 2: 创建第一个应用

创建一个新文件 `src/main.ts`:

```typescript
import { App, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";

// 定义一个简单的系统
function helloSystem(world: World): void {
	print("Hello, White Dragon Bevy!");
}

// 创建并运行应用
const app = App.create()
	.addSystems(BuiltinSchedules.UPDATE, helloSystem)
	.run();
```

### 步骤 3: 编译和运行

```bash
# 编译项目
pnpm build

# 或监视模式
pnpm watch
```

在 Roblox Studio 中打开项目，应该能看到 "Hello, White Dragon Bevy!" 输出。

**恭喜！** 你已经创建了第一个 Bevy 应用！

## 📚 核心概念速览

White Dragon Bevy 有 6 个核心概念，理解这些概念是掌握框架的关键。

### 概念 1: App（应用程序）

`App` 是整个框架的核心，管理应用的生命周期、插件、系统和资源。

**一句话说明**: App 是你的游戏的总控制器，负责组织和运行所有功能模块。

**快速示例**:
```typescript
const app = App.create();  // 创建应用
app.run();                 // 运行应用
```

**深入学习**: [@bevy-app skill](../core-skills/bevy-app/SKILL.md)

### 概念 2: Plugin（插件）

插件是功能模块化的载体，每个插件封装一组相关的功能。

**一句话说明**: Plugin 是可复用的功能包，如时间管理、状态管理、输入处理等。

**快速示例**:
```typescript
import { TimePlugin } from "@white-dragon-bevy/bevy_time";

app.addPlugin(new TimePlugin());  // 添加时间插件
```

**深入学习**: [插件开发规范](../architecture/plugin-development-specification.md)

### 概念 3: Schedule（调度）

调度控制系统的执行顺序和时机，框架提供多个内置调度阶段。

**一句话说明**: Schedule 决定你的游戏逻辑在什么时候、以什么顺序执行。

**快速示例**:
```typescript
app.addSystems(BuiltinSchedules.UPDATE, gameSystem);     // 主逻辑
app.addSystems(BuiltinSchedules.STARTUP, initSystem);    // 初始化（仅一次）
```

**调度执行顺序**:
```
FIRST → PRE_UPDATE → UPDATE → POST_UPDATE → LAST
```

**深入学习**: [@bevy-app skill](../core-skills/bevy-app/SKILL.md)

### 概念 4: System（系统）

系统是处理游戏逻辑的函数，接收 World 和 Context 参数。

**一句话说明**: System 是你的游戏逻辑代码，每帧或特定时机执行。

**快速示例**:
```typescript
function movementSystem(world: World): void {
	// 移动所有具有 Position 和 Velocity 的实体
	for (const [id, pos, vel] of world.query(Position, Velocity)) {
		world.insert(id, Position({
			x: pos.x + vel.x,
			y: pos.y + vel.y
		}));
	}
}
```

**深入学习**: [@bevy-ecs skill](../core-skills/bevy-ecs/SKILL.md)

### 概念 5: Resource（资源）

资源是全局共享的单例数据，通过 App 管理。

**一句话说明**: Resource 是全局可访问的单例对象，如配置、管理器、游戏状态等。

**快速示例**:
```typescript
// 定义资源类
class GameConfig {
	static readonly TYPE_ID = new TypeDescriptor("GameConfig");

	constructor(
		public readonly difficulty: number,
		public readonly maxPlayers: number,
	) {}
}

// 使用资源
app.insertResource(new GameConfig(1, 4));
const config = app.getResource<GameConfig>();
```

**深入学习**: [@bevy-ecs skill](../core-skills/bevy-ecs/SKILL.md)

### 概念 6: Context（上下文）

Context 提供系统访问应用级功能的接口，支持插件扩展。

**一句话说明**: Context 让系统可以访问插件提供的功能，而无需直接依赖插件。

**快速示例**:
```typescript
import { TimePluginExtension } from "@white-dragon-bevy/bevy_time";

function mySystem(world: World): void {
	// 通过 context 获取时间插件的扩展
	const timeExt = context.getExtension<TimePluginExtension>();
	if (timeExt) {
		const deltaTime = timeExt.getDeltaSeconds();
	}
}
```

**深入学习**: [插件扩展系统](../architecture/plugin-extensions.md)

## 🔧 常见任务

### 任务 1: 创建应用

**最简单的应用**:
```typescript
const app = App.create().run();
```

**包含默认插件的应用**:
```typescript
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";

const app = App.create()
	.addPlugins(...RobloxDefaultPlugins.create().build())
	.run();
```

### 任务 2: 添加插件

**添加单个插件**:
```typescript
import { TimePlugin } from "@white-dragon-bevy/bevy_time";

app.addPlugin(new TimePlugin());
```

**添加多个插件**:
```typescript
import { TimePlugin } from "@white-dragon-bevy/bevy_time";
import { StatePlugin } from "@white-dragon-bevy/bevy_state";
import { LogPlugin } from "@white-dragon-bevy/bevy_log";

app.addPlugins(
	new TimePlugin(),
	new StatePlugin(),
	new LogPlugin(),
);
```

**使用插件组**:
```typescript
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";

app.addPlugins(...RobloxDefaultPlugins.create().build());
```

### 任务 3: 编写系统

**基础系统**:
```typescript
function mySystem(world: World): void {
	// 系统逻辑
	print("System running!");
}

app.addSystems(BuiltinSchedules.UPDATE, mySystem);
```

**使用组件查询**:
```typescript
interface Position { x: number; y: number; }
interface Velocity { x: number; y: number; }

function movementSystem(world: World): void {
	for (const [id, pos, vel] of world.query(Position, Velocity)) {
		world.insert(id, Position({
			x: pos.x + vel.x,
			y: pos.y + vel.y
		}));
	}
}
```

**访问时间**:
```typescript
import { TimePluginExtension } from "@white-dragon-bevy/bevy_time";

function timedSystem(world: World): void {
	const timeExt = context.getExtension<TimePluginExtension>();
	if (timeExt) {
		const deltaTime = timeExt.getDeltaSeconds();
		// 使用 deltaTime
	}
}
```

### 任务 4: 管理资源

**定义资源**:
```typescript
import { TypeDescriptor } from "@white-dragon-bevy/bevy_core";

class PlayerData {
	static readonly TYPE_ID = new TypeDescriptor("PlayerData");

	constructor(
		public score: number,
		public lives: number,
	) {}
}
```

**插入和获取资源**:
```typescript
// 插入资源
app.insertResource(new PlayerData(0, 3));

// 在系统中获取资源
function gameSystem(world: World): void {
	const playerData = app.getResource<PlayerData>();
	if (playerData) {
		playerData.score += 10;
	}
}
```

### 任务 5: 处理事件

**发送事件**:
```typescript
import { MessageWriter } from "@white-dragon-bevy/bevy_ecs";

class PlayerJoinedEvent {
	constructor(public playerId: string) {}
}

function eventSenderSystem(world: World): void {
	const writer = new MessageWriter<PlayerJoinedEvent>(world);
	writer.send(new PlayerJoinedEvent("player123"));
}
```

**接收事件**:
```typescript
import { MessageReader } from "@white-dragon-bevy/bevy_ecs";

function eventReceiverSystem(world: World): void {
	const reader = new MessageReader<PlayerJoinedEvent>(world);

	for (const event of reader.read()) {
		print(`Player joined: ${event.playerId}`);
	}
}
```

## 💡 完整示例：弹跳球游戏

这是一个完整的弹跳球游戏示例，从零开始展示如何使用框架。

```typescript
import { App, BuiltinSchedules, RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TimePlugin, TimePluginExtension } from "@white-dragon-bevy/bevy_time";

// ============ 组件定义 ============
interface Ball {}

interface Position {
	x: number;
	y: number;
}

interface Velocity {
	x: number;
	y: number;
}

// ============ 系统定义 ============

/**
 * 初始化系统 - 创建弹跳球
 */
function setupSystem(world: World): void {
	// 生成一个弹跳球实体
	world.spawn(
		{} as Ball,
		{ x: 50, y: 50 } as Position,
		{ x: 30, y: 20 } as Velocity,
	);

	print("弹跳球游戏初始化完成！");
}

/**
 * 弹跳系统 - 处理边界碰撞
 */
function bounceSystem(world: World): void {
	const bounds = { width: 100, height: 100 };

	for (const [id, ball, pos, vel] of world.query({} as Ball, {} as Position, {} as Velocity)) {
		// 水平边界检测
		if (pos.x <= 0 || pos.x >= bounds.width) {
			vel.x = -vel.x;
		}

		// 垂直边界检测
		if (pos.y <= 0 || pos.y >= bounds.height) {
			vel.y = -vel.y;
		}

		// 更新速度
		world.insert(id, vel);
	}
}

/**
 * 移动系统 - 更新位置
 */
function movementSystem(world: World): void {
	const timeExt = context.getExtension<TimePluginExtension>();
	if (!timeExt) return;

	const deltaTime = timeExt.getDeltaSeconds();

	for (const [id, pos, vel] of world.query({} as Position, {} as Velocity)) {
		// 根据速度和时间更新位置
		world.insert(id, {
			x: pos.x + vel.x * deltaTime,
			y: pos.y + vel.y * deltaTime,
		} as Position);
	}
}

/**
 * 调试系统 - 每秒打印一次位置
 */
let lastPrintTime = 0;
function debugSystem(world: World): void {
	const timeExt = context.getExtension<TimePluginExtension>();
	if (!timeExt) return;

	const currentTime = timeExt.getElapsedSeconds();

	if (currentTime - lastPrintTime >= 1.0) {
		for (const [id, ball, pos] of world.query({} as Ball, {} as Position)) {
			print(`球的位置: (${math.floor(pos.x)}, ${math.floor(pos.y)})`);
		}
		lastPrintTime = currentTime;
	}
}

// ============ 创建和运行应用 ============

const app = App.create()
	// 添加默认插件
	.addPlugins(...RobloxDefaultPlugins.create().build())
	// 添加时间插件
	.addPlugin(new TimePlugin())
	// 添加初始化系统（仅执行一次）
	.addSystems(BuiltinSchedules.STARTUP, setupSystem)
	// 添加更新系统（每帧执行）
	.addSystems(BuiltinSchedules.UPDATE, [
		bounceSystem,   // 先检测碰撞
		movementSystem, // 再更新位置
		debugSystem,    // 最后调试输出
	])
	// 运行应用
	.run();
```

**这个示例展示了**:
- ✅ 如何定义组件（Ball, Position, Velocity）
- ✅ 如何编写系统（setup, bounce, movement, debug）
- ✅ 如何查询实体和组件
- ✅ 如何使用时间系统
- ✅ 如何组织应用的生命周期

## 📚 学习路径

### 初学者路径（第 1-2 周）

**第 1 天: 基础概念**
1. 阅读本指南的核心概念部分
2. 运行弹跳球示例
3. 修改示例，添加更多球

**第 2-3 天: App 和 Plugin**
1. 学习 [@bevy-app skill](../core-skills/bevy-app/SKILL.md)
2. 创建自己的第一个插件
3. 理解调度系统的执行顺序

**第 4-5 天: ECS 系统**
1. 学习 [@bevy-ecs skill](../core-skills/bevy-ecs/SKILL.md)
2. 练习编写查询系统
3. 理解资源管理

**第 6-7 天: 时间和状态**
1. 学习 [@bevy-time skill](../core-skills/bevy-time/SKILL.md)
2. 学习 [@bevy-state skill](../core-skills/bevy-state/SKILL.md)
3. 创建一个带状态机的小游戏

**第 2 周: 实践项目**
- 创建一个简单的游戏（如贪吃蛇、俄罗斯方块）
- 使用至少 3 个不同的插件
- 编写至少 5 个系统

### 进阶开发者路径（第 3-4 周）

**进阶主题**:
1. 插件扩展系统 - [plugin-extensions.md](../architecture/plugin-extensions.md)
2. App 扩展机制 - [app-extension-guide.md](../architecture/app-extension-guide.md)
3. 设计哲学 - [design-philosophy.md](../architecture/design-philosophy.md)

**实践**:
- 开发自定义插件
- 为 App 添加扩展方法
- 理解框架的设计决策

### Roblox 开发者路径（针对熟悉 Roblox 的开发者）

**第 1 天: Bevy 思维模式**
- 理解 ECS 与传统 Roblox 开发的区别
- 学习 App、Plugin、System 概念

**第 2-3 天: Roblox 集成**
- 了解 RobloxDefaultPlugins
- 学习客户端/服务端区分
- 理解 RunService 集成

**第 4-7 天: 实战项目**
- 将现有 Roblox 项目迁移到 Bevy
- 使用框架重构现有代码

## 🔗 下一步

### 核心 Skills 导航

深入学习框架的各个模块：

- **[@bevy-app](../core-skills/bevy-app/SKILL.md)** - 应用程序和插件系统
- **[@bevy-ecs](../core-skills/bevy-ecs/SKILL.md)** - ECS 核心系统
- **[@bevy-time](../core-skills/bevy-time/SKILL.md)** - 时间系统
- **[@bevy-state](../core-skills/bevy-state/SKILL.md)** - 状态管理
- **[@bevy-log](../core-skills/bevy-log/SKILL.md)** - 日志系统

### 架构文档

了解框架的设计和高级用法：

- [设计哲学](../architecture/design-philosophy.md) - Bevy 的核心设计理念
- [插件扩展系统](../architecture/plugin-extensions.md) - 插件扩展开发指南
- [App 扩展指南](../architecture/app-extension-guide.md) - App 扩展方法开发
- [插件开发规范](../architecture/plugin-development-specification.md) - 完整的插件开发标准
- [World API 对比](../architecture/world-api-comparison.md) - Rust Bevy vs TypeScript 实现

### 示例代码

查看更多实际示例：

- `src/__examples__/app/` - 应用程序示例
- `src/__examples__/time/` - 时间系统示例
- `src/__examples__/ecs/` - ECS 系统示例

### 外部资源

- [Rust Bevy 官方文档](https://docs.rs/bevy/latest/bevy/) - 理解原始设计
- [@rbxts/matter 文档](https://eryn.io/matter/) - Matter ECS 文档
- [roblox-ts 文档](https://roblox-ts.com/) - TypeScript for Roblox

## 📋 常见问题

### Q: 我需要学习 Rust Bevy 吗？

A: **不需要**。虽然我们继承了 Bevy 的设计理念，但所有概念都已经用 TypeScript 重新实现。不过，如果你熟悉 Rust Bevy，会更容易理解框架的设计决策。

### Q: White Dragon Bevy 和普通 Roblox 开发有什么区别？

A: 主要区别在于架构模式：

| 传统 Roblox | White Dragon Bevy |
|------------|-------------------|
| 面向对象，继承体系 | ECS，组合优于继承 |
| 直接操作实例 | 通过组件和系统 |
| 事件驱动 | 数据驱动 + 事件 |
| 紧耦合 | 松耦合，插件化 |

### Q: 性能如何？

A: White Dragon Bevy 基于高性能的 @rbxts/matter ECS 框架，在大多数场景下性能优于传统面向对象方式。特别是在处理大量实体时，ECS 的数据局部性带来显著性能提升。

### Q: 可以和现有 Roblox 代码一起使用吗？

A: **可以**。你可以逐步迁移，在新功能中使用 Bevy，保持现有代码不变。框架提供了与 Roblox Services 的集成插件。

### Q: 如何调试 Bevy 应用？

A: 推荐使用：
1. **LogPlugin** - 日志输出
2. **DiagnosticsPlugin** - 性能诊断
3. **hookDebugPrint** - 防抖打印
4. Roblox Studio 的调试工具

### Q: 遇到问题怎么办？

A: 按以下顺序：
1. 查看本指南和相关 core-skills
2. 查看示例代码 `src/__examples__/`
3. 查看架构文档了解设计决策
4. 提交 Issue 或询问社区

## 🎓 总结

恭喜你完成了 White Dragon Bevy 的快速入门！现在你应该：

- ✅ 理解了框架的 6 个核心概念
- ✅ 能够创建基础的 Bevy 应用
- ✅ 知道如何添加插件和编写系统
- ✅ 了解学习路径和下一步方向

**记住核心理念**:
- **模块化** - 通过插件组织代码
- **数据驱动** - 通过组件定义实体
- **类型安全** - 充分利用 TypeScript 类型系统
- **可组合** - 系统独立运行，易于测试

**下一步建议**:
1. 从弹跳球示例开始修改，熟悉 API
2. 选择一个感兴趣的 core-skill 深入学习
3. 尝试创建自己的小项目
4. 阅读架构文档理解设计哲学

祝你在 White Dragon Bevy 的旅程中获得乐趣！

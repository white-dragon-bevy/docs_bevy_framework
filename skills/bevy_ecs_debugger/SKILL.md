---
name: bevy-ecs-debugger
description: White Dragon Bevy 的 ECS 可视化调试器。当你需要可视化 ECS 系统状态、检查实体和组件、分析系统性能、监控查询结果或进行热重载开发时使用。仅在 Roblox Studio 环境中可用,适用于开发调试、性能分析、实体检查等场景。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_ecs_debugger/**)
  - Bash(npm run build)
---

# bevy_ecs_debugger - ECS 可视化调试器

## 📖 概述

ECS 可视化调试工具，提供图形界面用于实时检查实体、组件、查询和系统性能。

**核心功能**:
- 实体检查和组件查看
- 系统性能监控
- 查询结果可视化
- 热重载系统
- 权限控制
- 服务端/客户端视图切换

⚠️ **仅在 Studio 环境可用**，发布版本自动禁用

## 🚀 快速开始

### 模式 1: 标准模式（默认）

客户端和服务端共享同一个调试器实例：

```typescript
import { App } from "bevy_app";
import { DebuggerPlugin } from "bevy_ecs_debugger";

const app = App.create()
	// 添加调试器插件(仅在 Studio 中启用)
	.addPlugins(new DebuggerPlugin())
	.run();

// 在 Studio 中运行游戏
// 按 F4 键打开/关闭调试器面板
// 或使用聊天命令: /matter 或 /matterdebug
```

### 模式 2: 本地模式（推荐用于开发）

客户端正常运行业务逻辑，服务端单独启动调试器提供 GUI：

```typescript
import { RunService } from "@rbxts/services";
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";
import { DebuggerPlugin } from "bevy_ecs_debugger";

if (RunService.IsClient()) {
	// 客户端：正常业务 + 本地模式标记
	const app = new App({env: {isLocal: true}});
	app.addPlugins(new DefaultPlugins());
	app.run();
} else {
	// 服务端：单独启动调试器 App
	const debugApp = new App();
	debugApp.addPlugins(new DebuggerPlugin());
	// 不需要 run()，调试器会自动运行
}
```

**本地模式优势**：
- ✅ 客户端和服务端分离，互不干扰
- ✅ 调试器只在服务端运行，减少客户端开销
- ✅ 可以在客户端专注于业务逻辑测试
- ✅ 服务端提供完整的调试 GUI

### Context 访问 (v0.9.0+)

在系统中通过 `context.debuggerWidgets` 访问 Plasma widgets：

```typescript
import { World } from "bevy_ecs";

function debugUI(world: World): void {
	// ✅ 推荐：通过 context 访问 widgets
	const widgets = world.context.debuggerWidgets;

	widgets.window("Debug Info", () => {
		widgets.label("Debug information here");

		if (widgets.button("Click Me").clicked()) {
			print("Button clicked!");
		}
	});
}
```

### 自定义配置

```typescript
import { DebuggerPlugin } from "bevy_ecs_debugger";

const app = App.create()
	.addPlugins(new DebuggerPlugin({
		// 自定义切换快捷键(默认 F4)
		toggleKey: Enum.KeyCode.F5,
		// 设置权限组 ID(可选)
		groupId: 123456,
	}))
	.run();
```

## 📚 使用方法

### 1. 基础配置

```typescript
// 默认配置（F4 切换）
const app = App.create()
	.addPlugins(new DebuggerPlugin())
	.run();

// 自定义快捷键
const app = App.create()
	.addPlugins(new DebuggerPlugin({
		toggleKey: Enum.KeyCode.F5
	}))
	.run();

// 权限控制
const app = App.create()
	.addPlugins(new DebuggerPlugin({
		groupId: 123456  // 只允许此 Group 成员
	}))
	.run();
```

### 2. 调试器面板

**主要面板**:
- **World** - 显示所有实体和组件
- **Entity** - 查看选中实体的详细信息
- **Query** - 监控查询结果
- **System** - 分析系统性能
- **Profiler** - 性能分析和调用栈

**切换方式**:
- 按 F4 键（或自定义快捷键）
- 聊天命令: `/matter` 或 `/matterdebug`

### 3. 热重载系统

```typescript
// 原始系统
function oldSystem(world: World): void {
	// 逻辑
}

// 新系统
function newSystem(world: World): void {
	// 改进的逻辑
}

// 替换
const plugin = app.getPlugin<DebuggerPlugin>("DebuggerPlugin");
plugin?.replaceSystem(oldSystem, newSystem);
```

### 4. Renderable 高亮（可选）

```typescript
const Renderable = component<{ model: Model }>("Renderable");

const app = App.create()
	.addPlugins(new DebuggerPlugin(
		undefined,
		(entityId) => world.get(entityId, Renderable)
	))
	.run();
// 选中实体时，3D 模型会高亮
```

## 🔧 API 参考

### 常用 API

```typescript
// 1. 创建插件
new DebuggerPlugin(options?, getRenderableComponent?)

// 2. 获取调试器
const plugin = app.getPlugin<DebuggerPlugin>("DebuggerPlugin");
const debugger = plugin?.getDebugger();

// 3. 切换调试器
debugger?.toggle();

// 4. 热重载系统
plugin?.replaceSystem(oldSystem, newSystem);

// 5. 获取 UI 控件（旧方式）
const widgets = plugin?.getWidgets();

// 6. Context 访问（v0.9.0+ 推荐）
const widgets = world.context.debuggerWidgets;
```

### Context 扩展 (v0.9.0+)

bevy_ecs_debugger 提供 `context.debuggerWidgets` 扩展：

```typescript
function customDebugUI(world: World): void {
	const widgets = world.context.debuggerWidgets;

	// 所有 Plasma widgets 可用
	widgets.window("Custom Debug", () => {
		widgets.heading("System Status");
		widgets.label("Status: Running");

		const fps = world.context.timeStats.getAverageFPS();
		widgets.label(`FPS: ${string.format("%.1f", fps)}`);

		if (widgets.button("Reset").clicked()) {
			// 重置逻辑
		}
	});
}
```

### DebuggerOptions

```typescript
interface DebuggerOptions {
	toggleKey?: Enum.KeyCode;  // 默认 F4
	groupId?: number;          // 权限组 ID
}
```

## ✅ 最佳实践

### 1. 插件添加顺序

```typescript
// ✅ 最后添加调试器
const app = App.create()
	.addPlugins(new DiagnosticsPlugin())
	.addPlugins(new DebuggerPlugin())  // 最后
	.run();
```

### 2. 自动环境检测

```typescript
// ✅ 无需手动判断环境
const app = App.create()
	.addPlugins(new DebuggerPlugin())  // 自动检测 Studio
	.run();
```

### 3. 避免快捷键冲突

```typescript
// ✅ 使用 F4-F6
new DebuggerPlugin({ toggleKey: Enum.KeyCode.F4 })

// ❌ 避免游戏常用键
new DebuggerPlugin({ toggleKey: Enum.KeyCode.Space })  // 可能冲突
```

### 4. 使用命名函数

```typescript
// ✅ 使用命名函数便于调试
function mySystem(world: World): void { }
app.addSystems(Update, mySystem);

// ❌ 匿名函数无法识别
app.addSystems(Update, (world) => { });
```

### 5. 热重载快捷键

```typescript
// 绑定热重载快捷键
UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.F9) {
		const plugin = app.getPlugin<DebuggerPlugin>("DebuggerPlugin");
		plugin?.replaceSystem(oldSystem, newSystem);
	}
});
```

## ⚠️ 常见问题排查

### 1. 调试器面板是空的

**原因**:
- 应用未完全初始化
- 没有生成任何实体
- Loop 未正确关联

**解决**:
- 确保在添加系统后添加调试器
- 检查实体是否正确生成
- 等待应用完全启动

### 2. 系统名称显示为 "anonymous"

**原因**: 使用匿名函数

**解决**:
```typescript
// ✅ 使用命名函数
function mySystem(world: World): void { }
app.addSystems(Update, mySystem);
```

### 3. 热重载后状态丢失

**原因**: 热重载只替换函数，不保留内部状态

**解决**: 使用 World 资源存储状态
```typescript
// 使用资源而非局部变量
world.insertResource(new GameState());
```

## 💡 示例

### 示例 1: 基础使用

```typescript
import { App, Update } from "bevy_app";
import { DebuggerPlugin } from "bevy_ecs_debugger";
import { DiagnosticsPlugin } from "bevy_diagnostic";

const app = App.create()
	.addPlugins(new DiagnosticsPlugin())
	.addPlugins(new DebuggerPlugin())
	.addSystems(Update, gameSystem)
	.run();

function gameSystem(world: World): void {
	for (const [entity, pos, vel] of world.query(Position, Velocity)) {
		world.insert(entity, Position({
			x: pos.x + vel.x,
			y: pos.y + vel.y,
		}));
	}
}

// 在 Studio 中按 F4 打开调试器
// 或使用聊天命令: /matter
```

### 示例 2: 权限控制与 Renderable 高亮

```typescript
import { DebuggerPlugin } from "bevy_ecs_debugger";

const Renderable = component<{ model: Model }>("Renderable");
const DEV_TEAM_GROUP_ID = 123456;

const app = App.create()
	.addPlugins(new DebuggerPlugin(
		{
			toggleKey: Enum.KeyCode.F5,
			groupId: DEV_TEAM_GROUP_ID,  // 只允许开发团队
		},
		(entityId) => world.get(entityId, Renderable)  // 高亮支持
	))
	.run();
```

### 示例 3: 热重载开发流程

```typescript
// 原始系统
function movementV1(world: World): void {
	for (const [entity, pos, vel] of world.query(Position, Velocity)) {
		world.insert(entity, Position({
			x: pos.x + vel.x,
			y: pos.y + vel.y,
		}));
	}
}

// 改进版（添加边界检查）
function movementV2(world: World): void {
	for (const [entity, pos, vel] of world.query(Position, Velocity)) {
		const newX = math.clamp(pos.x + vel.x, -100, 100);
		const newY = math.clamp(pos.y + vel.y, -100, 100);
		world.insert(entity, Position({ x: newX, y: newY }));
	}
}

const app = App.create()
	.addPlugins(new DebuggerPlugin())
	.addSystems(Update, movementV1)
	.run();

// 按 F9 热重载
UserInputService.InputBegan.Connect((input) => {
	if (input.KeyCode === Enum.KeyCode.F9) {
		const plugin = app.getPlugin<DebuggerPlugin>("DebuggerPlugin");
		plugin?.replaceSystem(movementV1, movementV2);
		print("System reloaded");
	}
});
```

## 🔗 相关资源

### 源代码
- `src/bevy_ecs_debugger/` - 模块源码
- `src/bevy_ecs_debugger/context-extension.ts` - Context 扩展定义 (v0.9.0+)
- `src/bevy_ecs_debugger/matter-debugger/` - Matter Debugger

### 示例文件
- `src/__examples__/debugger/default.ts` - 标准模式示例
- `src/__examples__/debugger/local.ts` - 本地模式示例
- `src/__examples__/debugger/widgets.ts` - 完整 Plasma widgets 演示

### 外部文档
- [@rbxts/matter Debugger](https://eryn.io/matter/Debugging.html)
- [@rbxts/plasma](https://github.com/matter-ecs/plasma)

---

## 🆕 v0.9.0 新特性

### 1. Context 扩展

```typescript
// ✅ 新方式（推荐）
const widgets = world.context.debuggerWidgets;

// ⚠️ 旧方式（仍可用）
const plugin = app.getPlugin<DebuggerPlugin>("DebuggerPlugin");
const widgets = plugin?.getWidgets();
```

### 2. 本地模式

客户端和服务端分离调试，提高开发效率：

```typescript
if (RunService.IsClient()) {
	// 客户端业务
	const app = new App({env: {isLocal: true}});
	app.addPlugins(new DefaultPlugins());
	app.run();
} else {
	// 服务端调试器
	const debugApp = new App();
	debugApp.addPlugins(new DebuggerPlugin());
}
```

### 3. 完整 Widgets 示例

新增 `src/__examples__/debugger/widgets.ts`，展示所有可用 widgets。

---

## 📋 FAQ

**Q: 发布版本会显示调试器吗？**
A: 不会，只在 Studio 中启用。

**Q: 如何更改快捷键？**
```typescript
new DebuggerPlugin({ toggleKey: Enum.KeyCode.F5 })
```

**Q: 对性能有影响吗？**
A: 启用时有轻微影响（主要是 UI），关闭时无影响。只在 Studio 中启用，不影响生产环境。

**Q: 如何限制使用权限？**
```typescript
new DebuggerPlugin({ groupId: 123456 })
```

**Q: 热重载会保留状态吗？**
A: 不会。需要使用 World 资源持久化状态。

**Q: 面板为空？**
A: 确保应用已初始化、实体已生成、调试器在系统之后添加。

**Q: 如何查看自定义组件？**
A: 自动显示所有 Matter 组件，无需配置。

**Q: 本地模式和标准模式有什么区别？**
A:
- **标准模式**：客户端和服务端共享调试器，适合简单调试
- **本地模式**：客户端专注业务，服务端提供调试 GUI，适合复杂开发

**Q: 如何在系统中使用 widgets？**
A:
```typescript
function mySystem(world: World): void {
	const widgets = world.context.debuggerWidgets;
	widgets.window("My UI", () => {
		widgets.label("Hello!");
	});
}
```

---

**版本**: 1.0.0 (v0.9.0-alpha)
**最后更新**: 2025-10-31

## 💡 使用技巧

### 性能分析流程
1. 打开调试器（F4）
2. 切换到 Profiler 面板
3. 查看系统执行时间
4. 识别性能瓶颈
5. 热重载优化系统
6. 对比前后性能

### 调试复制系统
1. 查看服务端实体
2. 切换到客户端视图
3. 对比复制的实体和组件
4. 检查复制组件标记
5. 验证复制逻辑

### 与诊断系统配合
```typescript
const app = App.create()
	.addPlugins(new DiagnosticsPlugin())
	.addPlugins(new FrameTimeDiagnosticsPlugin())
	.addPlugins(new DebuggerPlugin())
	.run();
// 诊断提供性能指标，调试器查看 ECS 状态
```

## 🎨 Plasma Widgets 完整示例

bevy_ecs_debugger 基于 [@rbxts/plasma](https://github.com/matter-ecs/plasma) 提供丰富的 UI widgets。

### 可用 Widgets

| Widget | 用途 | 示例 |
|--------|------|------|
| `button` | 按钮 | `widgets.button("Click")` |
| `checkbox` | 复选框 | `widgets.checkbox("Enable")` |
| `label` | 文本标签 | `widgets.label("Info")` |
| `slider` | 滑块 | `widgets.slider(100)` |
| `heading` | 标题 | `widgets.heading("Section")` |
| `row` | 水平布局 | `widgets.row(() => { })` |
| `space` | 间距 | `widgets.space(10)` |
| `table` | 表格 | `widgets.table(data)` |
| `spinner` | 加载动画 | `widgets.spinner()` |
| `arrow` | 3D 箭头 | `widgets.arrow(pos, color)` |
| `blur` | 模糊效果 | `widgets.blur(size)` |
| `highlight` | 高亮 | `widgets.highlight(instance)` |
| `portal` | 传送门 | `widgets.portal(parent, () => {})` |
| `window` | 窗口 | `widgets.window("Title", () => {})` |

### 完整示例文件

查看完整的 Plasma widgets 使用示例：

**文件位置**: `src/__examples__/debugger/widgets.ts`

**示例内容**:
- ✅ Button、Checkbox、Label、Slider 基础控件
- ✅ Heading、Row、Space、Table 布局控件
- ✅ Spinner、Arrow、Blur、Highlight 特效
- ✅ Portal、Window 高级控件
- ✅ 综合示例：所有 widgets 在一个窗口中

### 快速示例

```typescript
import { World } from "bevy_ecs";

function customDebugPanel(world: World): void {
	const widgets = world.context.debuggerWidgets;

	widgets.window("Game Debug", () => {
		widgets.heading("Player Info");

		// 标签
		const playerCount = world.query(Player).size();
		widgets.label(`Players: ${playerCount}`);

		widgets.space(10);

		// 按钮
		if (widgets.button("Spawn Enemy").clicked()) {
			spawnEnemy(world);
		}

		widgets.space(10);

		// 滑块
		widgets.heading("Settings");
		const timeScale = widgets.slider({
			min: 0,
			max: 2,
			initial: 1,
		});
		world.context.timeResource.setTimeScale(timeScale);

		widgets.space(10);

		// 表格
		widgets.heading("Entity List");
		const tableData = [
			["ID", "Type", "Health"],
			...getEntityData(world),
		];
		widgets.table(tableData, { selectable: true });
	});
}

function getEntityData(world: World): Array<Array<string>> {
	const data: Array<Array<string>> = [];
	for (const [id, type, health] of world.query(EntityType, Health)) {
		data.push([tostring(id), type.name, tostring(health.value)]);
	}
	return data;
}
```

### 本地模式完整示例

```typescript
// 参考文件: src/__examples__/debugger/local.ts

import { RunService } from "@rbxts/services";
import { App } from "bevy_app";
import { DebuggerPlugin } from "bevy_ecs_debugger";
import { DefaultPlugins } from "bevy_internal";

if (RunService.IsClient()) {
	// 客户端：正常业务
	const app = new App({env: {isLocal: true}});
	app.addPlugins(new DefaultPlugins());
	app.run();
} else {
	// 服务端：单独启动调试器
	const app = new App();
	app.addPlugins(new DebuggerPlugin());
}
```

### Widgets 示例运行

要查看所有 widgets 示例，运行：

```typescript
// 参考文件: src/__examples__/debugger/widgets.ts
// 包含完整的 widgets 使用演示
```

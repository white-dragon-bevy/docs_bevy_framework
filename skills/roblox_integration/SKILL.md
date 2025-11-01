---
name: roblox-integration
description: Roblox 平台集成 - 等价于 Bevy 的 bevy_winit。理解 RunService 驱动、客户端/服务端分离、DefaultPlugins 配置。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_app/roblox-adapters.ts)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/utils/roblox-utils.ts)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_internal/default-plugins.ts)
  - Bash(npm run build)
  - Bash(npm test)
---

# Roblox 平台集成

> **前置**: 假设你熟悉 Bevy 0.16 的 `bevy_winit`、`WinitPlugin`、`DefaultPlugins`。

## 与 Bevy 0.16 的对应关系

### 核心映射

| Roblox (TS) | Bevy (Rust) | 差异 |
|------------|-------------|------|
| `RobloxRunnerPlugin` | `WinitPlugin` | 平台运行器，驱动主循环 |
| `RunService.Heartbeat` | `winit::EventLoop` | 事件源：Roblox 事件 vs OS 窗口事件 |
| `RobloxContext` | 无 | Roblox 特有：运行时服务端/客户端区分 |
| `DefaultPlugins` | `DefaultPlugins` | 内容不同：无 Window/Render 插件 |
| `MinimalPlugins` | `MinimalPlugins` | 相似：仅核心插件 |

### 关键差异

#### 1. 事件循环驱动

**Bevy (winit)**:
- 使用 OS 窗口事件循环 `EventLoop<T>`
- 单一事件源，跨平台抽象
- 窗口事件、输入事件由 winit 处理

**Roblox**:
- 三种 RunService 事件可选：
  - `Heartbeat` - 物理更新后（推荐，等价于 Bevy 主循环）
  - `Stepped` - 物理步骤前
  - `RenderStepped` - 渲染前（仅客户端，类似 Bevy 的渲染阶段）

#### 2. DefaultPlugins 组成

**Bevy DefaultPlugins** (33+ 插件):
- PanicHandler, Log, TaskPool, FrameCount, Time, Transform
- Diagnostics, Input
- **WindowPlugin** ← 窗口管理
- **WinitPlugin** ← 平台驱动
- AssetPlugin, RenderPlugin, ImagePlugin, ... ← 渲染栈

**Roblox DefaultPlugins** (9 插件):
- LogPlugin, TimePlugin, StatesPlugin, TransformPlugin
- DiagnosticsPlugin, FrameCountPlugin, DebuggerPlugin
- InputPlugin
- **RobloxRunnerPlugin** ← 平台驱动（替代 WinitPlugin）

**原因**: Roblox 引擎自带窗口/渲染，无需 `WindowPlugin`/`RenderPlugin`。

#### 3. 环境区分机制

**Bevy**: 编译时通过 `#[cfg(target_os = "...")]` 区分平台
**Roblox**: 运行时通过 `RobloxContext` 枚举区分服务端/客户端

```typescript
// Roblox 方式 - 运行时检测
export enum RobloxContext { Server = 1, Client = 2 }

class MyPlugin extends BasePlugin {
    readonly context = RobloxContext.Server; // 仅服务端运行
}
```

## RobloxRunnerPlugin 详解

### 对应 WinitPlugin 的职责

| 职责 | WinitPlugin | RobloxRunnerPlugin |
|-----|-------------|-------------------|
| 设置 App Runner | ✅ `app.set_runner(winit_runner)` | ✅ `app.setRunner(robloxRunner)` |
| 驱动调度执行 | ✅ EventLoop 触发 | ✅ RunService 事件触发 |
| 平台事件转发 | ✅ 窗口/输入事件 | ✅ deltaTime (其他事件由 Roblox 直接处理) |
| 生命周期管理 | ✅ 启动序列 + 主循环 | ✅ 启动序列 + 主循环 |

### 构造参数

```typescript
new RobloxRunnerPlugin(
    useHeartbeat?: boolean,      // 默认 true
    useStepped?: boolean,        // 默认 false
    useRenderStepped?: boolean   // 默认 false
)
```

**选择指南**:
- **Heartbeat** (默认): 等价于 Bevy 的标准 `EventLoop::run()`，适合游戏逻辑
- **Stepped**: 等价于 Bevy 的 `FixedUpdate` 前处理，适合物理预处理
- **RenderStepped**: 类似 Bevy 的 `RenderPlugin` 渲染阶段，适合视觉效果（仅客户端）

### 调度映射

| Bevy Schedule | Roblox 执行时机 | RunService 事件 |
|--------------|----------------|----------------|
| `PreStartup` | 启动序列（一次） | 首个选中事件 |
| `Startup` | 启动序列（一次） | 首个选中事件 |
| `PostStartup` | 启动序列（一次） | 首个选中事件 |
| `First` | 每帧开始 | 选中事件 (Heartbeat/Stepped/RenderStepped) |
| `PreUpdate` | 更新前 | 选中事件 |
| `Update` | 主更新 | 选中事件 |
| `PostUpdate` | 更新后 | 选中事件 |
| `Last` | 每帧结束 | 选中事件 |
| `STEPPED` | Roblox 特定 | `RunService.Stepped` |
| `RENDER_STEPPED` | Roblox 特定 | `RunService.RenderStepped` |

**注意**: Bevy 的 `FixedUpdate` 在 Roblox 中由 `RUN_FIXED_MAIN_LOOP` 调度实现。

## DefaultPlugins 配置

### 基础用法

```typescript
// 类似 Bevy: App::new().add_plugins(DefaultPlugins)
const app = App.create()
    .addPlugins(DefaultPlugins.create())
    .run();
```

### 自定义插件组

```typescript
// 类似 Bevy: DefaultPlugins.set(LogPlugin { ... })
const app = App.create()
    .addPlugins(
        DefaultPlugins.create()
            .disable(DebuggerPlugin)  // 禁用插件
            .addAfter(TimePlugin, new MyPlugin())  // 插入自定义插件
            .build()
    );
```

### MinimalPlugins

**Roblox**:
```typescript
MinimalPlugins.create()  // FrameCount + Time + RobloxRunner
```

**Bevy**:
- TaskPool + FrameCount + Time + ScheduleRunner

差异：Roblox 用 `RobloxRunnerPlugin` 替代 Bevy 的 `ScheduleRunnerPlugin`。

## 客户端/服务端分离

### 插件级别

```typescript
// 类似 Bevy 的 #[cfg(not(target_family = "wasm"))]
class ServerPlugin extends BasePlugin {
    readonly context = RobloxContext.Server;  // 仅服务端
    build(app: App): void { ... }
}

class ClientPlugin extends BasePlugin {
    readonly context = RobloxContext.Client;  // 仅客户端
    build(app: App): void { ... }
}

// 两者都添加，框架自动跳过不匹配的
app.addPlugin(new ServerPlugin())
   .addPlugin(new ClientPlugin());
```

### 系统级别

```typescript
// 类似 Bevy 的运行时平台检测
function dualSystem(world: World): void {
    if (RunService.IsServer()) {
        // 服务端逻辑
    } else {
        // 客户端逻辑
    }
}
```

### 工具函数

```typescript
import { isMatchRobloxContext, RobloxContext } from "bevy_app";

if (isMatchRobloxContext(RobloxContext.Server)) {
    // 仅服务端执行
}
```

## 常见模式

### 1. 标准应用启动

```typescript
// 等价于 Bevy: App::new().add_plugins(DefaultPlugins).run()
App.create()
    .addPlugins(DefaultPlugins.create())
    .addSystems(BuiltinSchedules.UPDATE, gameSystem)
    .run();
```

### 2. 自定义运行器

```typescript
// 等价于 Bevy: WinitPlugin::default().with_run_on_any_thread(true)
App.create()
    .addPlugin(new RobloxRunnerPlugin(false, false, true))  // 使用 RenderStepped
    .run();
```

### 3. 客户端专属插件

```typescript
// 等价于 Bevy: #[cfg(target_family = "wasm")]
class UIPlugin extends BasePlugin {
    readonly context = RobloxContext.Client;

    build(app: App): void {
        app.addSystems(BuiltinSchedules.UPDATE, uiSystem);
    }
}
```

### 4. 禁用默认插件

```typescript
// 等价于 Bevy: DefaultPlugins.build().disable::<LogPlugin>()
DefaultPlugins.create()
    .disable(LogPlugin)
    .disable(DiagnosticsPlugin)
    .build()
```

## 性能考量

### RunService 事件选择

| 事件 | 性能开销 | 适用场景 |
|-----|---------|---------|
| Heartbeat | **最低** | 游戏逻辑（推荐） |
| Stepped | 中等 | 物理预处理 |
| RenderStepped | 中等 | 视觉效果（仅客户端） |

**建议**:
- 服务端：始终使用 `Heartbeat`
- 客户端：游戏逻辑用 `Heartbeat`，相机/视觉用 `RENDER_STEPPED` 调度

### 最小化插件

```typescript
// 类似 Bevy: App::new().add_plugins(MinimalPlugins)
App.create()
    .addPlugins(MinimalPlugins.create())  // 减少 75% 插件
    .addPlugin(new MyCustomPlugin())
    .run();
```

## 调试技巧

### 1. 检查运行环境

```typescript
import { RunService } from "@rbxts/services";

print(`Server: ${RunService.IsServer()}`);
print(`Client: ${RunService.IsClient()}`);
print(`Studio: ${RunService.IsStudio()}`);
```

### 2. 验证插件加载

```typescript
// Bevy: app.is_plugin_added::<MyPlugin>()
class DebugPlugin extends BasePlugin {
    build(app: App): void {
        print("All plugins:", app.getPlugins());
    }
}
```

### 3. 调度执行顺序

在每个调度添加日志系统验证执行顺序：
```typescript
app.addSystems(BuiltinSchedules.FIRST, () => print("FIRST"))
   .addSystems(BuiltinSchedules.UPDATE, () => print("UPDATE"))
   .addSystems(BuiltinSchedules.LAST, () => print("LAST"));
```

## 常见错误

### ❌ 错误 1: 忘记添加 RobloxRunnerPlugin

```typescript
// 错误：缺少运行器，app.run() 无效
App.create()
    .addSystems(BuiltinSchedules.UPDATE, system)
    .run();  // 不会执行
```

**修复**: 使用 `DefaultPlugins` 或手动添加 `RobloxRunnerPlugin`

### ❌ 错误 2: 服务端使用 RenderStepped

```typescript
// 错误：RenderStepped 仅客户端
const app = App.create()
    .addPlugin(new RobloxRunnerPlugin(false, false, true));
// 服务端会回退到 Heartbeat，但不符合预期
```

**修复**: 环境检测
```typescript
const useRenderStepped = RunService.IsClient();
app.addPlugin(new RobloxRunnerPlugin(false, false, useRenderStepped));
```

### ❌ 错误 3: 错误的调度选择

```typescript
// 错误：初始化逻辑每帧执行
app.addSystems(BuiltinSchedules.UPDATE, initWorld);

// 错误：游戏逻辑只执行一次
app.addSystems(BuiltinSchedules.STARTUP, gameLoop);
```

**修复**:
```typescript
app.addSystems(BuiltinSchedules.STARTUP, initWorld)   // 一次
   .addSystems(BuiltinSchedules.UPDATE, gameLoop);    // 每帧
```

## API 速查

### RobloxRunnerPlugin

```typescript
new RobloxRunnerPlugin(
    useHeartbeat?: boolean,
    useStepped?: boolean,
    useRenderStepped?: boolean
)

readonly context?: RobloxContext  // 继承自 BasePlugin
build(app: App): void
name(): string
```

### DefaultPlugins

```typescript
static create(): DefaultPlugins
build(): PluginGroupBuilder

// Builder 方法
disable<T extends Plugin>(pluginType: new (...args) => T): this
add(plugin: Plugin): this
addBefore<T>(beforePlugin: new (...args) => T, plugin: Plugin): this
addAfter<T>(afterPlugin: new (...args) => T, plugin: Plugin): this
```

### RobloxContext

```typescript
enum RobloxContext {
    Server = 1,
    Client = 2,
}

function isMatchRobloxContext(context: RobloxContext | undefined): boolean
```

## 与 Bevy 术语对照

| Roblox 术语 | Bevy 术语 | 说明 |
|-----------|----------|------|
| RobloxRunnerPlugin | WinitPlugin | 平台运行器 |
| RunService | EventLoop | 事件源 |
| Heartbeat | run() 默认循环 | 主循环 |
| RenderStepped | 渲染阶段系统 | 渲染前执行 |
| RobloxContext | cfg(target_*) | 平台/环境区分 |
| DefaultPlugins | DefaultPlugins | 默认插件组 |
| MinimalPlugins | MinimalPlugins | 最小插件组 |

## 迁移检查清单

从 Bevy 迁移到 Roblox 平台时：

- [ ] 将 `WinitPlugin` 替换为 `RobloxRunnerPlugin`
- [ ] 移除 `WindowPlugin` 和所有渲染插件
- [ ] 将平台条件编译 `#[cfg(...)]` 改为运行时 `RobloxContext`
- [ ] 确认 `DefaultPlugins` 不包含窗口/渲染相关插件
- [ ] 将固定更新从 `FixedUpdate` 迁移到 `RUN_FIXED_MAIN_LOOP`
- [ ] 客户端/服务端逻辑使用 `context` 属性或运行时检测
- [ ] 验证 RunService 事件选择（Heartbeat/Stepped/RenderStepped）

## bevy_roblox 模块概览

`bevy_roblox` 模块提供了完整的 Roblox 平台集成功能，不仅包含运行器，还包括：

### 核心功能

**环境检测 (bevy_roblox/env)**:
- `Env` - 运行环境检测类（Server/Client/Studio/Cloud）
- `RobloxContext` - 上下文枚举（Server/Client）
- 支持环境模拟用于测试
- 云端测试环境检测（`isInCloud`、`isEnableTest`）
- 自动日志级别控制（测试环境启用 debug/trace）

**权限管理 (bevy_roblox/permission)**:
- `PermissionComponent` - 权限组件（Admin/Tester/Regular）
- `PermissionConfig` - 全局权限配置（白名单 + 群组映射）
- `PermissionCache` - 权限查询缓存
- 安全的 GroupService 封装

**玩家生命周期 (bevy_roblox/player-life)**:
- `Player` - 玩家组件
- `PlayerEntityMap` - 玩家实体映射
- 自动管理玩家加入/离开

**运行器 (bevy_roblox/runner)**:
- `RobloxRunnerPlugin` - 运行时驱动插件

### 使用示例

```typescript
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";
import { Env, RobloxContext } from "bevy_roblox/env";
import { PermissionComponent } from "bevy_roblox/permission";
import { debug, info } from "bevy_log";

// 环境检测
const env = new Env();
if (env.isServer) {
    print("Running on server");
}

// 云端测试环境检测
if (env.isInCloud) {
    info("Running in Cloud test environment");
    debug("Debug features enabled");
}

// 测试功能控制
if (env.isEnableTest) {
    debug("Test mode active - enabling debug features");
    // 加载测试专用插件
}

// 完整应用（包含所有 bevy_roblox 功能）
const app = App.create()
    .addPlugins(new DefaultPlugins())  // 自动包含 RobloxRunnerPlugin
    .run();
```

### 云端测试环境集成

bevy_roblox 模块与云端测试环境深度集成，提供统一的环境检测和日志控制：

```typescript
import { Env } from "bevy_roblox/env";
import { debug, trace, info } from "bevy_log";

const env = new Env();

// 环境感知的系统
function environmentAwareSystem(world: World): void {
    // 基础信息（所有环境）
    info(`System running on ${env.robloxContext}`);

    // 测试环境功能
    if (env.isEnableTest) {
        debug("Detailed system information");

        // Cloud 环境特殊处理
        if (env.isInCloud) {
            trace("Cloud test environment specific logic");
        }
    }
}
```

---

## 相关文档

- [bevy_app Skill](../bevy_app/SKILL.md) - App 和插件系统
- [bevy_state Skill](../bevy_state/SKILL.md) - 状态管理系统
- [云端测试环境文档](../cloud-test-environment.md) - 环境检测和云端测试
- [云端测试技能文档](../cloud_testing/SKILL.md) - Cloud 测试工具
- [源码: bevy_roblox/](../../src/bevy_roblox/) - Roblox 平台集成模块
- [源码: default-plugins.ts](../../src/bevy_internal/default-plugins.ts)
- [Bevy WinitPlugin 文档](https://docs.rs/bevy_winit/0.16.0/bevy_winit/struct.WinitPlugin.html)
- [Roblox RunService API](https://create.roblox.com/docs/reference/engine/classes/RunService)

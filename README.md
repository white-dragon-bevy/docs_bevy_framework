# White Dragon Bevy 框架文档

## 框架概述

White Dragon Bevy 是一个将 Rust Bevy 游戏引擎框架移植到 Roblox 平台的 TypeScript 框架。它提供了一套完整的 ECS（实体组件系统）架构、插件系统和生命周期管理。

## 核心模块

以下是框架的核心模块及其 API 文档：

### 应用程序框架
- **[bevy_app](./modules/bevy_app.html)** - 应用程序生命周期管理和插件系统

### ECS 系统
- **[bevy_ecs](./modules/bevy_ecs.html)** - 基于 Matter 的 ECS 实现

### 核心功能
- **[bevy_core](./modules/bevy_core.html)** - 核心类型和工具

### 时间管理
- **[bevy_time](./modules/bevy_time.html)** - 时间追踪和控制

### 状态管理
- **[bevy_state](./modules/bevy_state.html)** - 游戏状态机

### 输入处理
- **[bevy_input](./modules/bevy_input.html)** - 输入事件处理

### 渲染系统
- **[bevy_render](./modules/bevy_render.html)** - 渲染管道

### 摄像机
- **[bevy_camera](./modules/bevy_camera.html)** - 摄像机控制

### 变换系统
- **[bevy_transform](./modules/bevy_transform.html)** - 位置、旋转、缩放管理

### 诊断工具
- **[bevy_diagnostic](./modules/bevy_diagnostic.html)** - 性能监控和诊断

### 调试工具
- **[bevy_ecs_debugger](./modules/bevy_ecs_debugger.html)** - ECS 调试器

### 日志系统
- **[bevy_log](./modules/bevy_log.html)** - 日志记录

### 内部模块
- **[bevy_internal](./modules/bevy_internal.html)** - 内部工具和类型

### 网络同步
- **[simple_replication](./modules/simple_replication.html)** - 简单网络同步

## 快速开始

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_app";

// 创建应用
const app = App.create();

// 添加默认插件组
app.addPlugins(RobloxDefaultPlugins.create().build());

// 添加自定义系统
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
    print("Hello, White Dragon Bevy!");
});

// 运行应用
app.run();
```

## 核心概念

### App（应用程序）
`App` 是整个框架的核心，负责管理应用的生命周期、插件、系统和资源。

### Plugin（插件）
插件是功能模块化的载体，每个插件封装了一组相关的功能。

### World（ECS 世界）
`World` 是 ECS 系统的核心，管理所有的实体（Entity）和组件（Component）。

### Schedule（调度）
调度系统控制系统的执行顺序和时机。

### System（系统）
系统是处理游戏逻辑的函数，接收 World 和 Context 参数。

### Resource（资源）
资源是全局共享的单例数据，通过 App 管理。

## 架构特点

- **模块化**：通过插件实现功能解耦
- **类型安全**：充分利用 TypeScript 类型系统
- **性能优化**：基于高效的 ECS 实现
- **开发体验**：提供清晰的 API 和丰富的工具

---
name: bevy-camera
description: bevy_camera 相机系统 - Roblox Camera 的 ECS 封装（对应 Rust Bevy 0.16）
license: MIT
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
---

# bevy_camera - 相机系统

## 📖 概述

`bevy_camera` 将 Roblox Camera 封装为 ECS 组件，提供 Bevy 风格的相机管理。本文档假设读者精通 Rust Bevy 0.16 的 `bevy_camera` crate，仅描述差异和对应关系。

## 🔄 与 Rust Bevy 0.16 的对应关系

### 架构差异表

| Rust Bevy 0.16 | Roblox-TS 实现 | 说明 |
|----------------|---------------|------|
| `Camera` 组件 | `PrimaryCamera` + `CameraConfig` | 拆分为引用和配置两部分 |
| `Projection` 枚举 | ❌ 未实现 | Roblox 无投影矩阵概念 |
| `PerspectiveProjection` | 部分模拟（FOV） | 仅 FOV 可调，单位为度 |
| `OrthographicProjection` | ❌ 不支持 | Roblox 固定透视投影 |
| `Viewport` 结构体 | ❌ 未实现 | Roblox 原生支持 |
| `RenderTarget` | ❌ 未实现 | 渲染管线差异 |
| `Exposure` | ❌ 未实现 | 物理相机参数不适用 |
| `Frustum` | ❌ 未实现 | 计划中 |
| `CameraProjectionPlugin` | ❌ 不需要 | Roblox 自动处理 |
| `update_frusta` 系统 | ❌ 未实现 | 计划中 |
| `ClearColor` 资源 | ❌ 未实现 | 使用 `Lighting` 服务 |
| `Camera2d`/`Camera3d` | ❌ 不需要 | 统一处理 |
| `CameraUpdateSystems` | ❌ 未实现 | 计划中 |

### 组件映射

#### `Camera` → `PrimaryCamera` + `CameraConfig`

Rust Bevy 的 `Camera` 组件包含投影、视口、渲染目标等。Roblox 实现简化为：

**PrimaryCamera**（对应字段）：
- `camera: Camera` → 持有 Roblox `Camera` 实例引用
- 对应 Rust `Camera` 的身份标识功能
- 类似 `is_active` 语义（标记主相机）

**CameraConfig**（对应字段）：
- `cameraType: Enum.CameraType` → 控制行为模式
- `fieldOfView: number` → 对应 `PerspectiveProjection::fov`（**单位不同**：度 vs 弧度）
- `cameraSubject?: Humanoid | BasePart` → Roblox 特有，无 Rust 对应

**Rust `Camera` 缺失功能**：
- `viewport: Option<Viewport>` - ❌ 未实现
- `order: isize` - ❌ 未实现（多相机排序）
- `is_active: bool` - ✅ 通过 PrimaryCamera 标记
- `computed: ComputedCameraValues` - ❌ Roblox 自动计算
- `target: RenderTarget` - ❌ 固定渲染到屏幕
- `output_mode: CameraOutputMode` - ❌ 不适用
- `msaa_writeback: bool` - ❌ 不适用
- `clear_color: ClearColorConfig` - ❌ 使用 Lighting 服务
- `sub_camera_view: Option<SubCameraView>` - ❌ 未实现

### 投影系统差异

**Rust Bevy**：
- `Projection` 枚举（Perspective/Orthographic/Custom）
- `CameraProjection` trait 允许自定义投影
- 投影矩阵完全可控
- 透视投影参数：`fov`（弧度）、`aspect_ratio`、`near`、`far`

**Roblox 限制**：
- 固定使用透视投影
- FOV 单位为度（范围 1-120）
- `near`/`far` 平面固定（0.05 ~ 32768）
- 投影矩阵不可访问/修改
- 无正交投影支持

**单位转换**：
```typescript
// Rust Bevy (弧度)
fov: f32::consts::PI / 4.0  // 45度

// Roblox (度)
fieldOfView: 70

// 转换公式
const degrees = radians * (180 / math.pi);
const radians = degrees * (math.pi / 180);
```

### 插件对比

| 特性 | Rust `CameraPlugin` | Roblox `CameraPlugin` |
|------|---------------------|----------------------|
| 注册系统 | ✅ `update_frusta` 等 | ❌ 占位实现 |
| 初始化资源 | ✅ `ClearColor` | ❌ 未实现 |
| 子插件 | ✅ `CameraProjectionPlugin`, `VisibilityPlugin` | ❌ 不需要 |
| 扩展接口 | ❌ 无 | ✅ `CameraPluginExtension` |

**Roblox 特有扩展**：
```typescript
interface CameraPluginExtension {
  getCamera(): Camera | undefined;
  setCameraType(type: Enum.CameraType): void;
  setCameraSubject(subject: Humanoid | BasePart): void;
  setFieldOfView(fov: number): void;
  getPrimaryCameraEntity(): number | undefined;
}
```

## 🚧 实现状态

### ✅ 已实现

1. **基础组件**
   - `PrimaryCamera` - 相机实体标记
   - `CameraConfig` - 配置数据容器

2. **辅助函数**
   - `createPrimaryCameraData()` - 类似构造器
   - `createCameraConfigData()` - 配置工厂
   - `applyCameraConfig()` - 手动同步

3. **插件骨架**
   - `CameraPlugin` - 占位实现
   - `CameraPluginExtension` - 扩展接口

### ❌ 未实现（对应 Rust 功能）

| Rust 功能 | 实现难度 | 计划 | 说明 |
|-----------|---------|-----|------|
| `Projection` 系统 | 🔴 不可能 | - | Roblox 限制 |
| `Viewport` 配置 | 🟡 中等 | v0.3 | 使用 ScreenGui |
| 多相机渲染 | 🟡 中等 | v0.3 | ViewportFrame |
| `Frustum` 计算 | 🟢 简单 | v0.2 | 视锥体裁剪 |
| `RenderTarget` | 🔴 不可能 | - | 渲染管线差异 |
| `ClearColor` | 🟢 简单 | v0.2 | 使用 Lighting |
| `Exposure` | 🟡 中等 | v0.3 | ColorCorrection |
| `update_frusta` | 🟢 简单 | v0.2 | 系统调度 |
| 相机震动 | 🟢 简单 | v0.2 | 偏移动画 |
| 平滑跟随 | 🟢 简单 | v0.2 | 插值系统 |

### 设计差异说明

#### 1. 为何拆分为两个组件？

**Rust Bevy**：单一 `Camera` 组件包含所有配置

**Roblox 实现**：拆分为 `PrimaryCamera` + `CameraConfig`

**原因**：
- Roblox Camera 是全局单例，非 ECS 管理
- `PrimaryCamera` 持有引用（不可变）
- `CameraConfig` 是纯数据（可修改）
- 语义清晰：标记 vs 配置

#### 2. 为何没有投影系统？

**Rust Bevy 能力**：
- 自定义投影矩阵
- 动态切换投影类型（透视/正交/自定义）
- 子相机视图（多显示器）

**Roblox 限制**：
- Camera 固定透视投影
- 投影矩阵不可访问
- FOV 是唯一可调参数

**替代方案**：
- 使用 `fieldOfView` 模拟变焦
- 通过 `CFrame` 控制位置和朝向
- ViewportFrame 实现"伪"多相机

#### 3. 手动同步 vs 自动系统

**Rust Bevy**：
```
PostUpdate:
  TransformSystems::Propagate
  -> CameraUpdateSystems
  -> update_frusta
```

**Roblox 当前**：
```typescript
// 手动同步
applyCameraConfig(camera, config);
```

**原因**：
- 系统调度未实现
- 避免每帧不必要的同步
- 用户可控制同步时机

**未来（v0.2）**：将添加 `syncCameraConfigSystem` 自动同步。

## 🎯 快速开始

### 基础用法

```typescript
import { App } from "bevy_app";
import { CameraPlugin } from "bevy_camera";

const app = App.create();
app.addPlugin(new CameraPlugin());
app.run();
```

### 配置相机（对应 Rust `PerspectiveProjection`）

```typescript
import { Workspace } from "@rbxts/services";
import { createCameraConfigData, applyCameraConfig } from "bevy_camera";

const camera = Workspace.CurrentCamera!;
const config = createCameraConfigData(camera);

// 修改 FOV（注意单位！）
config.fieldOfView = 90;  // 度，对应 Rust fov: 90.0 * PI / 180.0

// 应用（手动同步）
applyCameraConfig(camera, config);
```

### 创建相机实体（对应 Rust `commands.spawn(Camera)`）

```typescript
import {
  PrimaryCamera,
  CameraConfig,
  createPrimaryCameraData,
  createCameraConfigData
} from "bevy_camera";
import type { World } from "bevy_ecs";

function spawnCamera(world: World): void {
  const camera = Workspace.CurrentCamera!;

  // 类似 Rust: commands.spawn((Camera::default(), PerspectiveProjection::default()))
  const entity = world.spawn(
    PrimaryCamera(createPrimaryCameraData(camera)),
    CameraConfig(createCameraConfigData(camera))
  );
}
```

## ⚠️ 关键差异

### 1. FOV 单位不同

```typescript
// Rust Bevy (弧度)
PerspectiveProjection {
  fov: std::f32::consts::PI / 4.0  // 45度
}

// Roblox (度)
CameraConfig {
  fieldOfView: 70  // 默认 70 度
}

// 转换
const rustFov = 70 * (math.pi / 180);  // 1.22 radians
```

### 2. 相机更新时机

**Rust Bevy**：
```
PostUpdate 调度：
  TransformSystems::Propagate (变换传播)
  -> CameraUpdateSystems (相机更新)
  -> update_frusta (视锥体更新)
```

**Roblox 当前**：
```typescript
// 手动同步
applyCameraConfig(camera, config);

// 未来（v0.2）
app.addSystems(BuiltinSchedules.POST_UPDATE, syncCameraConfigSystem);
```

### 3. 客户端限制

Rust Bevy 相机可在任何上下文使用，Roblox Camera 仅存在于客户端：

```typescript
import { RunService } from "@rbxts/services";

// ✅ 正确
if (RunService.IsClient()) {
  const camera = Workspace.CurrentCamera;
}

// ❌ 错误 - 服务端会是 undefined
const camera = Workspace.CurrentCamera;
```

### 4. 无渲染目标（RenderTarget）

**Rust Bevy**：
- `RenderTarget::Window(WindowRef::Primary)`
- `RenderTarget::Image(handle)`
- `RenderTarget::TextureView(id)`

**Roblox**：固定渲染到屏幕

**替代方案**：
- `ViewportFrame` - 离屏渲染（类似 `RenderTarget::Image`）
- `SurfaceGui` - 渲染到 3D 表面

### 5. 无视口（Viewport）配置

**Rust Bevy**：通过 `Viewport` 结构体配置物理位置和尺寸

**Roblox**：通过 `ViewportSize` 属性（只读）

**替代方案**：使用 `ScreenGui` + `Frame` 实现视口裁剪

## 📊 API 对比

### 组件创建

| 操作 | Rust Bevy | Roblox-TS |
|------|-----------|-----------|
| 默认相机 | `commands.spawn(Camera::default())` | `world.spawn(PrimaryCamera(data), CameraConfig(config))` |
| 透视投影 | `commands.spawn(Camera3d { projection: Projection::Perspective(...) })` | `createCameraConfigData(camera)` |
| 正交投影 | `commands.spawn(Camera3d { projection: Projection::Orthographic(...) })` | ❌ 不支持 |
| 自定义投影 | `Projection::custom(MyProjection)` | ❌ 不支持 |

### 配置修改

| 操作 | Rust Bevy | Roblox-TS |
|------|-----------|-----------|
| 修改 FOV | `projection.fov = 1.5;` | `config.fieldOfView = 90;` |
| 修改 near/far | `projection.near = 0.1; projection.far = 1000.0;` | ❌ 固定值 |
| 切换投影 | `camera.projection = Projection::Orthographic(...);` | ❌ 不支持 |
| 设置视口 | `camera.viewport = Some(Viewport {...});` | ❌ 未实现 |

### 查询相机

| 操作 | Rust Bevy | Roblox-TS |
|------|-----------|-----------|
| 查询主相机 | `Query<&Camera, With<IsDefaultUiCamera>>` | `world.query(PrimaryCamera)` |
| 获取投影 | `Query<&Projection>` | `world.query(CameraConfig)` |
| 获取视锥体 | `Query<&Frustum>` | ❌ 未实现 |

## 🔗 参考资源

### Rust Bevy 文档
- [bevy_camera crate](https://docs.rs/bevy_camera/0.16.0/bevy_camera/) - 原始设计
- [Camera 组件](https://docs.rs/bevy_camera/0.16.0/bevy_camera/struct.Camera.html) - 完整 API
- [CameraProjection trait](https://docs.rs/bevy_camera/0.16.0/bevy_camera/trait.CameraProjection.html) - 投影接口

### Roblox API
- [Camera 对象](https://create.roblox.com/docs/reference/engine/classes/Camera) - 原生相机
- [CameraType 枚举](https://create.roblox.com/docs/reference/engine/enums/CameraType) - 相机模式

### 源码位置
- `src/bevy_camera/components.ts` - 组件定义
- `src/bevy_camera/camera-plugin.ts` - 插件实现
- `bevy-origin/crates/bevy_camera/` - Rust 原始代码

## 💭 未来计划

### v0.2（短期）
- [ ] `syncCameraConfigSystem` - 自动同步配置（对应 `camera_system`）
- [ ] `Frustum` 组件 - 视锥体裁剪（对应 `update_frusta`）
- [ ] 相机震动系统

### v0.3（中期）
- [ ] 多相机支持（ViewportFrame，对应 `Camera::order`）
- [ ] `Viewport` 支持（ScreenGui 实现）
- [ ] 平滑跟随系统

### v1.0（长期）
- [ ] 相机特效（景深、运动模糊，对应 `Exposure`）
- [ ] 轨迹录制/回放
- [ ] 碰撞检测

---

**文档版本**：2025-10-20
**对应 Rust Bevy 版本**：0.16.0
**假设读者已掌握**：Rust Bevy 的 `bevy_camera` crate 基础知识

若不熟悉 Rust Bevy，请先阅读：
- [Bevy 官方文档](https://bevyengine.org/learn/book/)
- [bevy_camera 示例](https://github.com/bevyengine/bevy/tree/main/examples/camera)

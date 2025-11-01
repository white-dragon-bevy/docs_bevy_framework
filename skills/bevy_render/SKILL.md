---
name: bevy-render
description: White Dragon Bevy 渲染系统 - Rust Bevy 0.16 bevy_render 的 TypeScript/Roblox 移植版本
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_render/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/__examples__/render/**)
  - Bash(npm test bevy_render)
  - Bash(npm run build)
---

# bevy_render - 与 Rust Bevy 0.16 的对应关系

> 假设读者精通 Rust Bevy 0.16，本文档说明 TypeScript/Roblox 移植版的实现差异。

## 架构对比

### 总体差异

Rust Bevy 的 `bevy_render` 是完整的 wgpu 渲染后端（73 个文件，22,000+ 行代码），包含：
- RenderGraph 管线
- GPU 资源管理（Buffer、Texture、BindGroup）
- Shader 编译和管线缓存
- 多线程渲染调度（Extract/Prepare/Queue/Render）
- Camera 和 View 系统
- Mesh、Material 资产管理

**Roblox 版本仅保留**（3 个文件，~500 行代码）：
- Visibility 可见性管理
- RobloxInstance 实体同步（替代 wgpu 渲染）
- RenderLayers 层级控制
- Transform → CFrame 同步

### 不支持的模块

以下 Rust 模块在 Roblox 无对应物（Roblox 引擎托管渲染）：

| Rust 模块 | 功能 | 原因 |
|----------|------|------|
| `renderer` | wgpu RenderDevice/Queue | Roblox 封闭渲染系统 |
| `render_resource` | Buffer/Texture/Pipeline | 无 GPU 访问权限 |
| `render_graph` | 渲染图管线 | 使用 Roblox 场景图 |
| `render_phase` | 排序和批处理 | Roblox 自动管理 |
| `texture` | 纹理加载和缓存 | 使用 Roblox 资产系统 |
| `mesh` | Mesh/MeshAllocator | 使用 Roblox Part/MeshPart |
| `camera` | Camera 投影矩阵 | 使用 Roblox Camera 对象 |
| `batching` | GPU 批处理 | Roblox 自动批处理 |
| `extract_*` | 多线程数据提取 | 单线程 ECS |

---

## RenderPlugin 对应

### Rust 版本
**结构定义**：`RenderPlugin` 包含 `render_creation`、`synchronous_pipeline_compilation`、`debug_flags` 字段。

**build() 方法**注册：
- RenderApp SubApp（独立 World）
- ExtractSchedule/Render Schedule
- 13+ 个系统集（ExtractCommands/PrepareAssets/Queue/Render 等）

### Roblox 版本
**简化实现**：仅注册 POST_UPDATE 阶段的 `renderUpdateSystem`。

**包含系统**：
- `visibilitySystem` - 计算可见性
- `robloxSyncSystem` - 同步 CFrame
- `cleanupRemovedEntities` - 清理销毁的实体

### 关键差异

1. **SubApp 架构**：Rust 使用独立 RenderApp，Roblox 在主 App 运行
2. **调度阶段**：Rust 有 ExtractSchedule/Render，Roblox 仅 POST_UPDATE
3. **并行渲染**：Rust 支持 pipelined_rendering，Roblox 单线程顺序执行

---

## Visibility 系统

### Rust 版本
位于 `view/visibility/` 模块：

**组件**：
- `Visibility` - 用户控制的可见性
- `InheritedVisibility` - 继承父级计算
- `ViewVisibility` - 最终相机可见性（考虑视锥剔除）

**系统**：
- `visibility_propagate_system` - 传播继承可见性
- `check_visibility` - 视锥剔除检测

**VisibilityBundle**：包含上述 3 个组件。

### Roblox 版本
位于 `src/bevy_render/components.ts`：

**组件**：
- `Visibility` - 含 `state: VisibilityState` 字段（Visible/Hidden/Inherited）
- `ViewVisibility` - 含 `visible: boolean` 字段

**系统**：
- `visibilitySystem` - 合并 Rust 的 propagate + sync 逻辑

### 核心差异

| 特性 | Rust | Roblox |
|------|------|--------|
| 组件数量 | 3 个（Visibility/Inherited/View） | 2 个（Visibility/View） |
| 继承计算 | InheritedVisibility 独立组件 | 合并在 visibilitySystem 中 |
| 视锥剔除 | check_visibility 系统 | **不支持**（Roblox 引擎处理） |
| 隐藏实现 | 设置组件标记 | 移动到 ReplicatedStorage 隐藏容器 |

**Roblox 特有机制**：
- 隐藏时不删除实例，而是移动到隐藏容器（对象池模式）
- 通过修改 `instance.Parent` 实现显示/隐藏

Rust 无此概念，因为渲染由组件标记控制，无需操作场景图。

---

## RobloxInstance 组件

### 对应关系
**无直接对应物**。在 Rust Bevy 中，ECS 实体通过以下流程渲染：
1. 添加 `Mesh` + `Material` 组件
2. Extract 阶段提取到 RenderWorld
3. Queue 阶段加入 RenderPhase
4. Render 阶段提交 GPU 绘制命令

**Roblox 替代方案**：
- `RobloxInstance` 组件包含 `instance: BasePart` 字段，直接引用 Roblox 对象
- 包含 `originalParent` 和 `hiddenContainer` 字段用于对象池管理

### 同步 Transform
**Rust 方式**：在 Extract 阶段，通过 `extract_transforms` 系统将 `GlobalTransform` 从 MainWorld 复制到 RenderWorld。

**Roblox 方式**：在 POST_UPDATE 阶段，`robloxSyncSystem` 直接设置 `instance.CFrame = globalTransform.cframe`。

**关键区别**：Roblox 跳过 Extract/Prepare 阶段，直接修改 Roblox 对象属性。

---

## RenderLayers 系统

### Rust 版本
位于 `view/visibility/render_layers.rs`：

**结构**：`RenderLayers(u64)` - 64 位掩码。

**方法**：
- `layer(n: u8)` - 创建单层
- `with(self, n: u8)` - 添加层
- `intersects(&self, other)` - 检查层交集

**用途**：Camera 组件有 `render_layers` 字段，自动过滤渲染实体。

### Roblox 版本
**结构**：`RenderLayers` 组件含 `layers: number` 字段（32 位，Luau 限制）。

**预定义常量**：
- `DefaultRenderLayers.Default` - 0b0001
- `DefaultRenderLayers.UI` - 0b0010
- `DefaultRenderLayers.World` - 0b0100
- `DefaultRenderLayers.Effects` - 0b1000

**辅助函数**：`isInRenderLayer(entityLayers, targetLayer)` - 位与运算检查。

### 差异

| 特性 | Rust | Roblox |
|------|------|--------|
| 位宽 | 64 位 | 32 位 |
| 默认层级 | `layer(0)` | 预定义 4 个常量 |
| Camera 集成 | 自动过滤 | **不支持**（需手动实现） |

**使用限制**：Roblox 版本仅提供位运算辅助函数，不自动过滤渲染，需在自定义系统中手动检查层级。

---

## 系统调度对比

### Rust RenderApp 调度
**ExtractSchedule**：
- extract_transforms
- extract_meshes
- extract_cameras

**Render Schedule**：
- PrepareAssets
- Queue（queue_meshes、queue_shadows）
- PhaseSort
- Prepare（prepare_bind_groups）
- Render（render_system）
- Cleanup

**特点**：
- 双 World（MainWorld ↔ RenderWorld）
- 多线程并行（提取/准备/队列）
- 基于 wgpu CommandEncoder

### Roblox 调度
**POST_UPDATE**：
- RenderUpdateSystem
  - visibilitySystem
  - robloxSyncSystem
  - cleanupRemovedEntities

**特点**：
- 单 World
- 单线程顺序执行
- 直接操作 Roblox 对象

---

## 不支持的 Rust 特性

### 1. ExtractComponent/ExtractResource
**用途**：自动从 MainWorld 提取数据到 RenderWorld。

**Roblox**：无 RenderWorld，不需要提取机制。

---

### 2. RenderGraph
**用途**：定义渲染节点依赖关系（如 shadow_pass → main_pass → post_process）。

**Roblox**：Roblox 引擎控制渲染管线，无法自定义渲染图。

---

### 3. Batching/GPU Preprocessing
**用途**：合并绘制调用，GPU 驱动剔除。

**Roblox**：引擎自动批处理，无法手动控制。

---

### 4. Camera Projection
**Rust**：`Camera` 组件包含 `projection`（Perspective/Orthographic）、`viewport`、`render_layers` 字段。

**Roblox**：使用 Roblox Camera 对象（Workspace.CurrentCamera），仅通过 CFrame/FieldOfView 控制。

---

### 5. Material/Shader
**Rust**：`Material` trait 定义 `fragment_shader()` 和 `vertex_shader()` 方法。

**Roblox**：使用 Roblox 材质属性（Material/Color/Transparency），无法自定义 Shader。

---

## 迁移 Rust 代码指南

### 1. 移除 Extract 系统
**Rust 模式**：在 ExtractSchedule 中注册 `extract_*` 系统。

**Roblox 替代**：在 UPDATE/POST_UPDATE 中直接查询组件，无需提取。

---

### 2. 替换 Mesh/Material 为 RobloxInstance
**Rust 模式**：spawn 实体时添加 `Mesh(handle)` 和 `Material(handle)` 组件。

**Roblox 替代**：
1. 创建 Roblox Part/MeshPart 实例
2. 设置 Material/Color 等属性
3. 添加 `RobloxInstance({ instance: part })` 组件

---

### 3. 手动实现 RenderLayers 过滤
**Rust 模式**：Camera 的 `render_layers` 字段自动过滤。

**Roblox 替代**：在自定义系统中使用 `isInRenderLayer()` 手动检查并处理。

---

### 4. 实现距离剔除
**Rust 模式**：在 check_visibility 系统中自动进行视锥和距离剔除。

**Roblox 替代**：自定义系统计算实体到相机距离，根据阈值修改 `Visibility` 组件状态。

---

## 性能考量

### Rust 优势
- 多线程并行渲染
- GPU 驱动剔除
- 零开销抽象
- 精确控制批处理

### Roblox 限制
- 单线程脚本执行
- `instance.Parent` 操作触发场景图更新（相对昂贵）
- 无法控制批处理和绘制调用
- 无法访问 GPU 资源

### 优化建议
1. **避免频繁切换可见性**：缓存可见性状态，仅在变化时更新
2. **使用对象池**：RobloxInstance 隐藏容器已实现
3. **批量更新**：单帧内收集变化，统一应用
4. **减少查询开销**：使用 RenderLayers 过滤不必要的实体

---

## 使用场景

### 适用场景
- 需要 ECS 管理 Roblox 对象生命周期
- 批量控制对象可见性（如距离剔除）
- 父子层级继承可见性
- 渲染层级分类（UI/World 分离）

### 不适用场景
- 自定义渲染管线（考虑 Roblox ViewportFrame/EditableImage）
- GPU 粒子/后处理（Roblox 限制）
- 多相机渲染（需手动管理 Camera 对象）
- 复杂着色器效果（无 Shader 访问）

---

## API 速查

### 组件创建
**Visibility**：
- `Visibility({ state: VisibilityState.Visible })`
- `ViewVisibility({ visible: true })`

**RobloxInstance**：
- `RobloxInstance({ instance: part, originalParent: Workspace })`

**RenderLayers**：
- `RenderLayers({ layers: DefaultRenderLayers.UI })`

### 辅助函数
**可见性**：
- `createDefaultVisibility()` - 返回 Visible 状态
- `createDefaultViewVisibility()` - 返回 visible: true

**渲染层级**：
- `isInRenderLayer(entityLayers, targetLayer)` - 检查实体是否在指定层级

### 系统函数
- `visibilitySystem(world)` - 计算可见性
- `robloxSyncSystem(world)` - 同步 CFrame
- `cleanupRemovedEntities(world)` - 清理实体
- `renderSystemSet(world)` - 完整系统集

---

## 总结

| 维度 | Rust bevy_render | Roblox bevy_render |
|------|------------------|---------------------|
| 代码规模 | 22,000+ 行 | ~500 行 |
| 渲染后端 | wgpu | Roblox 引擎 |
| 架构 | RenderApp + ExtractSchedule | 主 App + POST_UPDATE |
| 核心功能 | GPU 管线/Shader/Mesh | Visibility + RobloxInstance 同步 |
| 可扩展性 | 完全控制渲染流程 | 受限于 Roblox API |
| 学习曲线 | 陡峭（需理解图形编程） | 平缓（仅 ECS + Roblox 基础） |

Roblox 版本是 **极简化子集**，保留 Visibility 语义和 ECS 集成，放弃底层渲染控制。适合需要 ECS 架构但依赖 Roblox 引擎渲染的项目。

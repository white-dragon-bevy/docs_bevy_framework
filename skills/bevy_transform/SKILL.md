---
name: bevy-transform
description: bevy_transform 变换和层级系统 - 管理实体的位置、旋转、缩放以及父子层级关系
license: MIT
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
---

# bevy_transform - 与 Rust Bevy 0.16 的联系和区别

本文档假设你已精通 Rust Bevy 0.16，仅说明 Roblox 平台移植版本的关键差异。

## 核心概念对照

### Transform 组件

**Rust Bevy 0.16**:
- 使用 `Vec3 translation`、`Quat rotation`、`Vec3 scale` 三个字段
- 提供丰富的方法：`rotate()`、`rotate_axis()`、`look_at()`、`align()` 等
- 支持 `transform_point()` 进行点变换

**Roblox 移植版**:
- 使用 `CFrame cframe`（合并位置和旋转）、`Vector3 scale` 两个字段
- 无内置方法，所有操作通过 `TransformHelper` 工具类实现
- CFrame 天然支持点变换：`cframe.PointToWorldSpace()`

### GlobalTransform 组件

**联系**: 两者概念完全一致 - 存储世界空间变换，由系统自动计算。

**区别**:
- Rust: 使用 `Affine3A` 内部表示
- Roblox: 使用 `CFrame` + `Vector3 scale` 表示

### 层级关系

**Rust Bevy 0.16**:
- 使用 `ChildOf` 关系组件（Bevy 0.16 新特性）
- 自动维护双向关系，无需手动管理 `Children`

**Roblox 移植版**:
- 使用 `Parent` 组件（等价于 `ChildOf`）
- **重要差异**: 必须手动维护 `Parent` 和 `Children` 的双向一致性
- 推荐使用 `TransformHelper.setParent()` 自动处理

### 系统调度

**Rust Bevy 0.16**:
```
TransformPropagate 系统集：
  - sync_simple_transforms
  - mark_dirty_trees
  - propagate_parent_transforms
```

**Roblox 移植版**:
```
TransformPlugin 在 PostUpdate 调度：
  - ensureGlobalTransforms  (额外系统)
  - markDirtyTrees
  - propagateParentTransforms
  - syncSimpleTransforms
```

**关键差异**: 增加了 `ensureGlobalTransforms` 系统，因为 Roblox 版本无法使用 Bevy 的 `require(GlobalTransform)` 特性。

## API 迁移指南

### 创建带变换的实体

**Rust Bevy**:
```
commands.spawn(Transform::from_xyz(0.0, 10.0, 0.0));
// GlobalTransform 自动添加
```

**Roblox 移植版**:
```typescript
world.spawn(...TransformBundle.fromPosition(new Vector3(0, 10, 0)));
// 必须使用 Bundle 确保 GlobalTransform 存在
```

### Transform 操作

**Rust Bevy**:
```
transform.rotate(Quat::from_rotation_y(angle));
transform.look_at(target, Vec3::Y);
transform.translate_around(point, rotation);
```

**Roblox 移植版**:
```typescript
const helper = new TransformHelper(world);
helper.rotate(entity, Vector3.yAxis, angle);
helper.lookAt(entity, target, Vector3.yAxis);
// 无 translate_around，需手动实现
```

### 查询变换

**联系**: 查询语法完全一致

**Rust Bevy**:
```
Query<&Transform>
Query<(&Transform, &GlobalTransform)>
```

**Roblox 移植版**:
```typescript
world.query(Transform)
world.query(Transform, GlobalTransform)
```

### 层级操作

**Rust Bevy 0.16**:
```
// 自动维护双向关系
commands.entity(child).set_parent(parent);
```

**Roblox 移植版**:
```typescript
// 手动维护双向关系
const helper = new TransformHelper(world);
helper.setParent(child, parent);

// 或手动操作
world.insert(child, Parent({ entity: parent }));
const [children] = world.get(parent, Children);
world.insert(parent, Children({
  entities: [...(children?.entities || []), child]
}));
```

## 主要缺失功能

以下 Rust Bevy 功能在 Roblox 版本中未实现：

1. **Transform 方法**
   - `rotate_local()`、`rotate_around()`
   - `align()` 双轴对齐
   - `looking_at()`、`looking_to()` 构造器
   - `mul_transform()` 运算符

2. **数学类型**
   - `Isometry3d` 互转
   - `Affine3A` 内部表示
   - `Dir3` 方向类型

3. **性能优化**
   - 并行传播（Rust 版本的 `parallel::propagate_parent_transforms`）
   - Roblox 版本为单线程串行实现

4. **反射和序列化**
   - Bevy Reflect 集成
   - Serde 序列化支持

## 平台特定差异

### 坐标系统

**Rust Bevy**: 使用右手坐标系，Y-up，-Z forward

**Roblox**: 使用右手坐标系，Y-up，-Z forward（一致）

### 旋转表示

**Rust Bevy**: 四元数 (`Quat`)

**Roblox**: CFrame 内部使用旋转矩阵，提供欧拉角和 `lookVector` 访问

### 性能注意事项

**Rust Bevy**:
- 查询和变换传播高度优化
- 并行系统调度
- SIMD 加速（`Affine3A`）

**Roblox 移植版**:
- 单线程执行
- 依赖 Roblox CFrame 原生性能
- 脏标记优化保留（`TransformTreeChanged`）

## 迁移检查清单

从 Rust Bevy 迁移到 Roblox 版本时注意：

- [ ] 将 `Transform::from_xyz()` 替换为 `TransformBundle.fromPosition()`
- [ ] 将 `transform.rotate()` 等方法调用替换为 `TransformHelper` 方法
- [ ] 将 `set_parent()` 调用替换为 `TransformHelper.setParent()`
- [ ] 手动添加 `GlobalTransform` 或使用 `TransformBundle`
- [ ] 验证 `Parent` 和 `Children` 双向一致性
- [ ] 将 `Quat` 旋转转换为 CFrame 操作
- [ ] 移除 `Isometry3d` 相关代码
- [ ] 替换并行系统调度为串行调度

## 快速示例对比

### 角色武器挂载

**Rust Bevy**:
```
let player = commands.spawn(Transform::from_xyz(0.0, 0.0, 0.0)).id();
let weapon = commands.spawn(Transform::from_xyz(1.0, 1.0, 0.0))
    .set_parent(player)
    .id();
```

**Roblox 移植版**:
```typescript
const player = world.spawn(...TransformBundle.fromPosition(Vector3.zero));
const weapon = world.spawn(
  ...TransformBundle.fromPosition(new Vector3(1, 1, 0)),
  Parent({ entity: player })
);
world.insert(player, Children({ entities: [weapon] }));
```

### Transform 操作

**Rust Bevy**:
```
transform.translation += velocity * delta;
transform.rotate_y(angular_velocity * delta);
transform.look_at(target, Vec3::Y);
```

**Roblox 移植版**:
```typescript
const helper = new TransformHelper(world);
helper.translate(entity, velocity.mul(delta));
helper.rotate(entity, Vector3.yAxis, angular_velocity * delta);
helper.lookAt(entity, target, Vector3.yAxis);
```

## 源码位置对照

| Rust Bevy 路径 | Roblox 移植版路径 |
|----------------|------------------|
| `bevy_transform/src/components/transform.rs` | `src/bevy_transform/components/transform.ts` |
| `bevy_transform/src/components/global_transform.rs` | `src/bevy_transform/components/global-transform.ts` |
| `bevy_transform/src/systems.rs` | `src/bevy_transform/systems/*.ts` |
| `bevy_transform/src/helper.rs` | `src/bevy_transform/helper.ts` |
| `bevy_transform/src/plugins.rs` | `src/bevy_transform/plugin.ts` |

## 参考文档

- Rust Bevy 0.16 Transform 官方文档: https://docs.rs/bevy_transform/0.16
- Roblox CFrame API: https://create.roblox.com/docs/reference/engine/datatypes/CFrame
- 项目源码: `bevy-origin/crates/bevy_transform/` (Rust 原版参考)
- 项目源码: `src/bevy_transform/` (Roblox 移植版实现)


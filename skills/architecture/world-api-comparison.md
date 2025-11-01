# Bevy World API 对比表

## Rust Bevy vs TypeScript 实现

本文档对比 Rust Bevy 的 World API 和我们的 TypeScript 实现。

---

## 📊 Entity 管理

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `spawn()` | `spawn()` | ✅ 实现 | 已重写，添加变更跟踪 |
| `spawn_empty()` | ❌ 无 | 🔶 部分 | 通过 `spawn()` 不传参数 |
| `spawn_batch()` | ❌ 无 | ❌ 缺失 | 可通过循环 `spawn()` 实现 |
| `despawn()` | `despawn()` | ✅ 实现 | 已重写，清理变更跟踪 |
| `get_entity()` | `get()` | ✅ 实现 | Matter World 提供 |
| `get_entity_mut()` | ❌ 无 | 🔶 部分 | Matter 无可变引用概念 |
| `entity()` | ❌ 无 | ❌ 缺失 | Matter 只有 `get()` |
| `entity_mut()` | ❌ 无 | ❌ 缺失 | - |
| `entities()` | `[pairs]()` | ✅ 实现 | Matter World 的迭代器 |
| `clear_entities()` | `clear()` | ✅ 实现 | Matter World 提供 |

**实现率：60%**（6/10）

---

## 🎯 Component 管理

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `insert()` | `insert()` | ✅ 实现 | 已重写，添加变更跟踪 |
| `remove::<T>()` | `remove()` | ✅ 实现 | Matter World 提供 |
| `register_component::<T>()` | ❌ 无 | ❌ 缺失 | Matter 自动注册 |
| `register_component_with_descriptor()` | ❌ 无 | ❌ 缺失 | - |
| `component_id::<T>()` | `getComponentId()` | ✅ 实现 | bevy_ecs/component-id |
| `init_component::<T>()` | ❌ 无 | ❌ 缺失 | - |
| `components()` | ❌ 无 | ❌ 缺失 | - |

**实现率：43%**（3/7）

---

## 📦 Resource 管理

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `insert_resource(R)` | `resources.insertResource<R>()` | ✅ 实现 | 通过 ResourceManager |
| `insert_non_send_resource(R)` | ❌ 无 | ❌ 缺失 | Roblox 无 Send 概念 |
| `get_resource::<R>()` | `resources.getResource<R>()` | ✅ 实现 | 返回 `R \| undefined` |
| `get_resource_mut::<R>()` | `resources.getResource<R>()` | 🔶 部分 | 无可变/不可变区分 |
| `resource::<R>()` | ❌ 无 | ❌ 缺失 | 可添加 panic 版本 |
| `resource_mut::<R>()` | ❌ 无 | ❌ 缺失 | - |
| `remove_resource::<R>()` | `resources.removeResource<R>()` | ✅ 实现 | - |
| `contains_resource::<R>()` | `resources.hasResource<R>()` | ✅ 实现 | - |
| `get_resource_or_insert_with()` | `resources.getOrInsertDefaultResource()` | ✅ 实现 | - |
| `init_resource::<R>()` | `resources.getOrInsertDefaultResource()` | 🔶 部分 | 类似功能 |

**实现率：60%**（6/10）

### 我们额外提供的 Resource 方法

| 方法 | 描述 |
|------|------|
| `withResource<T>(callback)` | 使用资源执行操作 |
| `withResourceMut<T>(callback)` | 可变操作并重新插入 |
| `getResourceByTypeDescriptor<T>()` | 通过类型描述符获取 |
| `insertResourceByTypeDescriptor()` | 通过类型描述符插入 |
| `getResourceIds()` | 获取所有资源ID |
| `getResourceMetadata<T>()` | 获取资源元数据 |
| `getAllResources()` | 获取所有资源（调试用） |
| `getResourceCount()` | 获取资源数量 |
| `clearResources()` | 清空所有资源 |

---

## 🔍 Query 查询

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `query::<Q>()` | `queryWith<Q>()` | ✅ 实现 | 返回 QueryBuilder |
| `query_filtered::<Q, F>()` | `queryWith().with().without()` | ✅ 实现 | 通过 QueryBuilder 链式调用 |
| `removed::<T>()` | `changeTracker.getRemovedComponents()` | 🔶 部分 | 通过 ChangeTracker |
| `removed_with_id()` | ❌ 无 | ❌ 缺失 | - |

**实现率：50%**（2/4）

### 我们额外提供的 Query 方法

| 方法 | 描述 |
|------|------|
| `QueryBuilder.with()` | 添加必需组件 |
| `QueryBuilder.without()` | 排除组件 |
| `QueryBuilder.withAdded()` | 查询新添加的组件 |
| `QueryBuilder.withChanged()` | 查询变更的组件 |
| `QueryBuilder.iter()` | 迭代查询结果 |

---

## ⏱️ Schedule 调度

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `run_schedule()` | ❌ 无 | ❌ 缺失 | Schedule 在 App 层管理 |
| `add_schedule()` | ❌ 无 | ❌ 缺失 | - |
| `try_schedule_scope()` | ❌ 无 | ❌ 缺失 | - |
| `schedule_scope()` | ❌ 无 | ❌ 缺失 | - |

**实现率：0%**（0/4）

**说明**：我们的 Schedule 系统在 App/SubApp 层实现，不在 World 层。

---

## 🔄 Change Detection（变更检测）

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `clear_trackers()` | `clearTrackers()` | ✅ 实现 | - |
| `check_change_ticks()` | ❌ 无 | ❌ 缺失 | - |
| `increment_change_tick()` | `incrementTick()` | ✅ 实现 | - |
| `change_tick()` | `changeTracker.getCurrentTick()` | ✅ 实现 | - |
| `last_change_tick()` | ❌ 无 | ❌ 缺失 | - |
| `get_resource_change_ticks::<R>()` | ❌ 无 | ❌ 缺失 | - |

**实现率：50%**（3/6）

### 我们额外提供的 Change Detection 方法

| 方法 | 描述 |
|------|------|
| `markComponentAdded()` | 手动标记组件添加 |
| `markEntitySpawned()` | 手动标记实体生成 |
| `changeTracker.isComponentAdded()` | 检查组件是否新添加 |
| `changeTracker.isEntitySpawned()` | 检查实体是否新生成 |
| `changeTracker.getRemovedComponents()` | 获取移除的组件 |
| `changeTracker.clearOldData()` | 清除旧数据 |

---

## 📨 Event & Observer

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `send_event(E)` | `events.send<E>()` | ✅ 实现 | 通过 EventManager |
| `send_event_default::<E>()` | ❌ 无 | ❌ 缺失 | - |
| `send_event_batch()` | ❌ 无 | ❌ 缺失 | - |
| `observe()` | `events.on<E>()` | ✅ 实现 | - |
| `trigger()` | `eventPropagator.trigger()` | ✅ 实现 | - |
| `trigger_targets()` | ❌ 无 | 🔶 部分 | 可通过 EventPropagator 实现 |
| `trigger_ref()` | ❌ 无 | ❌ 缺失 | - |

**实现率：43%**（3/7）

### 我们额外提供的 Event 方法

| 方法 | 描述 |
|------|------|
| `events.clear<E>()` | 清除事件队列 |
| `events.clearAll()` | 清除所有事件 |
| `events.getEventCount<E>()` | 获取事件数量 |
| `eventPropagator.propagate()` | 传播事件到子实体 |

---

## 💬 Message 系统（我们特有）

| 我们的实现 | 描述 | 对应 Bevy |
|-----------|------|----------|
| `messages.send<M>()` | 发送消息 | Bevy 0.17 Messages |
| `messages.read<M>()` | 读取消息 | MessageReader |
| `messages.clear<M>()` | 清除消息 | - |
| `messages.getMessageCount<M>()` | 获取消息数量 | - |

**说明**：Bevy 0.17 引入的 Message API，我们提前实现。

---

## 🛠️ 其他工具方法

| Rust Bevy | 我们的实现 | 状态 | 备注 |
|-----------|-----------|------|------|
| `new()` | `new()` | ✅ 实现 | - |
| `id()` | ❌ 无 | ❌ 缺失 | - |
| `flush()` | `commands.apply()` | ✅ 实现 | 通过 CommandBuffer |
| `flush_entities()` | ❌ 无 | ❌ 缺失 | - |
| `clear_all()` | `clear()` + `resources.clear()` | 🔶 部分 | 需手动调用两个方法 |
| `storages()` | ❌ 无 | ❌ 缺失 | Matter 内部管理 |
| `bundles()` | ❌ 无 | ❌ 缺失 | - |
| `archetypes()` | ❌ 无 | ❌ 缺失 | - |
| `as_unsafe_world_cell()` | ❌ 无 | ❌ 缺失 | roblox-ts 无 unsafe |
| `as_unsafe_world_cell_readonly()` | ❌ 无 | ❌ 缺失 | - |

**实现率：20%**（2/10）

---

## 📊 总体统计

| 类别 | Rust Bevy 方法数 | 我们实现数 | 实现率 |
|------|-----------------|----------|--------|
| Entity 管理 | 10 | 6 | 60% |
| Component 管理 | 7 | 3 | 43% |
| Resource 管理 | 10 | 6 | 60% |
| Query 查询 | 4 | 2 | 50% |
| Schedule 调度 | 4 | 0 | 0% |
| Change Detection | 6 | 3 | 50% |
| Event & Observer | 7 | 3 | 43% |
| 其他工具 | 10 | 2 | 20% |
| **总计** | **58** | **25** | **43%** |

---

## 🎯 架构差异

### Rust Bevy World

```rust
// 所有功能集中在 World 上
world.spawn(bundle);
world.insert_resource(resource);
world.query::<&Transform>();
world.send_event(event);
world.run_schedule(Update);
```

### 我们的 TypeScript World

```typescript
// 功能分散在不同管理器上
world.spawn(bundle);                    // World 直接提供
world.resources.insertResource(resource); // ResourceManager
world.queryWith(Transform);              // QueryBuilder
world.events.send(event);                // EventManager
world.commands.spawn(bundle);            // CommandBuffer

// Schedule 在 App 层
app.runSchedule(Update);
```

---

## 🔑 关键设计差异

### 1. Matter ECS 基础

我们的 World 继承自 Matter World，获得：
- ✅ 高性能的原型（Archetype）系统
- ✅ 自动的组件存储优化
- ✅ 内置的迭代器和查询

但失去了：
- ❌ Bevy 的直接 World API
- ❌ 细粒度的存储控制

### 2. 管理器模式

我们采用管理器模式分离关注点：

```typescript
world.resources    // ResourceManager
world.commands     // CommandBuffer
world.messages     // MessageRegistry
world.events       // EventManager
world.changeTracker // ChangeTracker
```

**优点**：
- 清晰的职责分离
- 易于扩展和测试
- 符合 TypeScript 习惯

**缺点**：
- API 不如 Rust Bevy 简洁
- 多了一层调用

### 3. roblox-ts 限制

- ❌ 无 `unsafe` 概念
- ❌ 无可变/不可变引用区分
- ❌ 无 `Send` / `Sync` trait
- ✅ 自动内存管理（GC）

---

## 📝 缺失功能优先级

### 🔴 高优先级（核心功能）

1. ✅ ~~`spawn()` / `despawn()`~~ - 已实现
2. ✅ ~~`insert_resource()` / `get_resource()`~~ - 已实现
3. ✅ ~~`query()`~~ - 已实现
4. ✅ ~~`send_event()`~~ - 已实现

### 🟡 中优先级（增强功能）

1. `spawn_batch()` - 批量生成实体
2. `resource::<R>()` - panic 版本的资源获取
3. `send_event_batch()` - 批量发送事件
4. `trigger_targets()` - 向目标触发事件

### 🟢 低优先级（高级功能）

1. `get_entity_mut()` - 可变实体引用（与 Lua 语义不符）
2. `component_id()` - 组件 ID 管理（已有替代方案）
3. `archetypes()` - 原型访问（Matter 内部管理）
4. Schedule 相关方法（在 App 层实现）

---

## ✅ 我们的独有功能

### 1. Message 系统（领先 Bevy 0.17）

```typescript
world.messages.send(new PlayerJoinedMessage());
world.messages.read<PlayerJoinedMessage>();
```

### 2. 增强的 Resource API

```typescript
world.resources.withResource<Settings>(settings => {
    settings.volume = 0.5;
});

world.resources.withResourceMut<State>(state => {
    state.score += 10;
});
```

### 3. QueryBuilder 链式调用

```typescript
world.queryWith(Transform, Velocity)
     .without(Dead)
     .withAdded(Player)
     .iter();
```

### 4. CommandBuffer 延迟执行

```typescript
world.commands.spawn(entity);
world.commands.insert(entity, component);
world.commands.apply(world); // 批量应用
```

---

## 🎓 使用建议

### 从 Rust Bevy 迁移

```rust
// Rust Bevy
world.spawn(PlayerBundle::default());
world.insert_resource(GameSettings::default());
let transform = world.get::<Transform>(entity);
```

```typescript
// 我们的 TypeScript
world.spawn(new Player(), new Transform(), new Velocity());
world.resources.insertResource(new GameSettings());
const transform = world.get(entity, Transform);
```

### 最佳实践

1. **使用 CommandBuffer**：在系统中延迟修改
2. **优先使用 QueryBuilder**：更灵活的查询
3. **利用 Message 系统**：实体间通信
4. **善用 withResource**：简化资源操作

---

## 📚 参考资源

- [Bevy World 文档](https://docs.rs/bevy_ecs/latest/bevy_ecs/world/struct.World.html)
- [Matter ECS](https://github.com/matter-ecs/matter)
- [我们的 World 实现](../src/bevy_ecs/bevy-world.ts)
- [ResourceManager 实现](../src/bevy_ecs/resource.ts)

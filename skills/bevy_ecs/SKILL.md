---
name: bevy-ecs
description: 对应 Rust Bevy 0.17-dev 的 bevy_ecs crate。基于 @rbxts/matter 实现的 TypeScript 移植版。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_ecs/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/__examples__/ecs/**)
  - Bash(npm test bevy_ecs)
  - Bash(npm run build)
---

# bevy_ecs - 与 Rust Bevy 的对照文档

本文档面向熟悉 Rust Bevy 0.17-dev 的开发者，说明 TypeScript 移植版的实现差异。

## 📖 总体架构

### 底层 ECS 引擎替换

**Bevy**: Archetype-based ECS (自研)
**移植**: Table-based ECS (@rbxts/matter)

核心差异：
- 无 Archetype 存储优化 → Table 存储
- 无编译期查询优化 → 运行时查询
- 无 Bundle 系统 → 直接传组件数组
- 无 SystemParam → 固定签名 `(world, context)`

### 类型系统映射

| Bevy | TypeScript | 说明 |
|------|-----------|------|
| \`Entity\` | \`AnyEntity\` (number) | Matter 实体 ID |
| \`Component\` trait | \`component<T>()\` | 工厂函数 |
| \`Resource\` trait | \`Resource\` interface | 可选标记 |
| \`Query<T>\` | \`world.query()\` | 查询 API |
| \`Commands\` | \`CommandBuffer\` | 命令缓冲 |
| \`EventReader/Writer\` | \`MessageReader/Writer\` | 改名 |

## 🔄 模块对照表

### ✅ 已完整迁移

**World & Entity**
- \`world.spawn()\` / \`world.despawn()\`
- \`world.contains(entity)\`
- 缺失: \`EntityMut\`/\`EntityRef\` 分离

**Resource**
- \`world.insertResource()\` / \`world.getResource()\`
- \`world.hasResource()\` / \`world.removeResource()\`
- 新增: \`withResourceMut()\` 回调式 API
- 缺失: \`NonSend\`/\`NonSendMut\` 资源

**Schedule 执行**
- \`world.tryRunSchedule(label)\` - Bevy 风格的调度执行
- 用于在系统内部嵌套执行其他调度（如 OnEnter/OnExit）
- 对应 Rust: \`world.try_run_schedule(label)\`

**Command Buffer**
- \`CommandBuffer.spawn()\` / \`despawn()\`
- \`CommandBuffer.flush(world)\`
- 缺失: \`commands.entity()\` 链式 API

**Message System** (对应 Events)
- \`MessageWriter.write()\` / \`MessageReader.read()\`
- 需在 App 中注册: \`app.addMessage<T>()\`
- 新增: 跨帧消息传递
- 改名原因: 避免与 Roblox Event 混淆

**Hierarchy**
- \`addChild(world, parent, child)\`
- \`removeChild(world, parent, child)\`
- Parent / Children 组件
- 缺失: \`BuildChildren\` trait

**Name Component**
- \`Name.create("name")\`
- \`withName(world, entity, "name")\`
- \`getEntityName(world, entity)\`

### ⚠️ 部分实现

**Query System**

✅ 支持:
- \`world.query(A, B)\` 基础查询
- \`queryWith(A).with(B).without(C)\` 过滤器
- \`queryAdded(A)\` / \`queryChanged(A)\` 变更检测

❌ 缺失:
- \`Or<(A, B)>\` / \`AnyOf<(A, B)>\` 过滤器
- \`QueryState\` 预编译
- \`&mut\` 查询 (组件不可变)

**Component System**

✅ 支持:
- \`component<T>("Name")\` 定义组件
- TypeDescriptor 识别组件类型

❌ 缺失:
- \`#[derive(Component)]\` 宏
- ComponentHooks (OnAdd/OnRemove)
- SparseSet vs Table 存储策略

### ❌ 未迁移

**核心缺失**:
- Archetype/Storage API
- SystemParam derive
- Bundles
- Schedule v3 完整 API
- Observers (响应式实体观察者)
- Exclusive Systems
- Change Detection Ticks

**高级特性**:
- ComponentHooks
- Relationship (仅 Parent/Children)
- Entity Disabling
- Spawn Pattern
- Query Transmutation
- Reflect 反射系统

## 🔧 代码迁移指南

### 组件定义

\`\`\`typescript
// Bevy 中无需列出，TypeScript:
const Position = component<{ x: number; y: number }>("Position");
\`\`\`

### 系统签名

\`\`\`typescript
// Bevy 签名不同，TypeScript:
function mySystem(world: World): void {
  const commands = new CommandBuffer();
  for (const [entity, transform] of world.query(Transform)) {
    // ...
  }
  commands.flush(world);
}
\`\`\`

### 查询过滤器

\`\`\`typescript
// Bevy 语法不同，TypeScript:
world.queryWith(Position)
  .with(Player)
  .without(Dead)
  .iter()
\`\`\`

### 资源访问

\`\`\`typescript
// Bevy 使用系统参数，TypeScript:
const state = world.getResource<GameState>();
world.withResourceMut<GameState, void>(state => {
  // 修改 state
});
\`\`\`

### Events → Messages

\`\`\`typescript
// Bevy 叫 Events，TypeScript 叫 Messages:
// 1. 注册
app.addMessage<DamageMessage>();

// 2. 写入
context.getMessage<DamageMessage>().write(msg);

// 3. 读取
const msgs = context.getMessageReader<DamageMessage>().read();
\`\`\`

## 🎯 Roblox 平台扩展

### Matter Hooks (Bevy 没有)

\`\`\`typescript
import { useEvent, useThrottle } from "bevy_ecs/matter";

function system(world: World) {
  // 自动管理事件生命周期
  for (const player of useEvent(Players, "PlayerAdded")) {
    // ...
  }

  // 节流执行
  useThrottle(1, () => {
    // 每秒一次
  });
}
\`\`\`

### 组件不可变性 (Matter 限制)

\`\`\`typescript
// ❌ Bevy 可以直接修改，TypeScript 不行
const pos = world.get(entity, Position);
pos.x += 10;  // 无效！

// ✅ 必须重新插入
const pos = world.get(entity, Position);
world.insert(entity, Position({ x: pos.x + 10, y: pos.y }));
\`\`\`

## 📊 性能对照

**Bevy 优势**:
- 编译期查询优化
- Archetype 局部性
- 多线程并行
- 零开销抽象

**Matter/TypeScript 劣势**:
- 运行时查询构建
- Table 间接访问
- 单线程 (Roblox 限制)
- GC 压力

**优化建议**: 复用 CommandBuffer，避免每帧创建临时对象。

## 🚨 关键限制

1. **组件必须不可变** - Matter 要求重新插入
2. **无多线程系统** - Roblox 单线程
3. **查询过滤器有限** - 无 Or/AnyOf
4. **SystemParam 固定** - 签名为 \`(world, context)\`
5. **资源识别非类型** - 基于 TypeDescriptor 字符串

## 📋 API 速查

| 功能 | Bevy | TypeScript |
|------|------|-----------|
| 生成实体 | \`commands.spawn(bundle)\` | \`world.spawn(...components)\` |
| 插入组件 | \`entity.insert(comp)\` | \`world.insert(entity, comp)\` |
| 查询 | \`Query<&T, With<U>>\` | \`queryWith(T).with(U).iter()\` |
| 资源 | \`Res<T>\` | \`world.getResource<T>()\` |
| 事件 | \`EventReader<E>\` | \`context.getMessageReader<M>()\` |
| 层级 | \`parent.add_child(child)\` | \`addChild(world, parent, child)\` |
| 变更 | \`Query<&T, Changed<T>>\` | \`queryChanged(T).iter()\` |
| 执行调度 | \`world.try_run_schedule(label)\` | \`world.tryRunSchedule(label)\` |

## 🔗 源代码对照

- **Rust**: \`bevy-origin/crates/bevy_ecs/\`
- **TypeScript**: \`src/bevy_ecs/\`
- **测试**: \`src/bevy_ecs/__tests__/\`

## 📚 相关文档

- [bevy_app 对照](../bevy_app/SKILL.md) - Schedule/Plugin 系统
- [Matter 文档](https://eryn.io/matter/) - 底层 ECS
- [Bevy 0.17 文档](https://docs.rs/bevy_ecs/0.17.0) - 上游参考

---
name: simple-replication
description: Simple Replication - 基于 bevy_replicon 的轻量级网络复制系统。适用于开发阶段的多人游戏原型和简单同步场景。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/simple_replication/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/__examples__/simple-replication/**)
  - Bash(npm test simple-replication)
  - Bash(npm run build)
---

# simple-replication - 基于 bevy_replicon 的简化复制系统

## 与 Bevy Replicon 的关系

本插件是 Rust Bevy `bevy_replicon` (v0.34.4) 的**简化移植版本**，专为 Roblox 平台设计。

### 核心差异对比

| 特性 | bevy_replicon (Rust) | simple-replication (roblox-ts) |
|------|----------------------|--------------------------------|
| **架构模型** | 服务器权威，双消息类型(Updates+Mutations) | 服务器权威，单消息类型 |
| **复制规则** | 规则引擎 + 优先级系统 | 简化的集合配置(ToAllPlayers/ToSelfOnly) |
| **可见性控制** | 每客户端黑/白名单 + 关联实体图 | 无内置可见性系统(需自行实现) |
| **序列化** | Postcard + 自定义 RuleFns | JSON(通过 Roblox RemoteEvent) |
| **变更检测** | Bevy 的 ComponentTicks | Matter Hooks 的变更检测 |
| **网络层** | 抽象后端(需第三方如 renet) | 抽象适配器(默认 RemoteEvent) |
| **事件系统** | 内置双向事件 + 触发器 | 无内置事件系统 |
| **确认机制** | Mutation 确认 + 重传 | 无确认机制 |
| **场景导出** | 支持 DynamicScene 持久化 | 无场景导出 |

### 保留的核心特性

✅ **服务器权威模型** - 客户端只读，服务端是数据真实来源  
✅ **组件级复制控制** - 选择性同步组件  
✅ **实体映射** - 服务端实体与客户端实体的双向映射  
✅ **插件化设计** - 通过插件系统集成到 App

### 移除的高级特性

❌ **规则引擎** - 无优先级、过滤器、ReplicationMode::Once  
❌ **Mutations 消息** - 仅使用单一更新消息类型  
❌ **可见性系统** - 无 ClientVisibility、RelatedEntities  
❌ **确认与重传** - 无 MutateIndex、ConfirmHistory、BufferedMutations  
❌ **协议版本检查** - 无 ProtocolHash 验证  
❌ **网络事件** - 无 FromClient/ToClients、Trigger API

## 核心概念

### 1. 复制插件 (SimpleReplicationPlugin)

对应 bevy_replicon 的 `RepliconPlugins`，但大幅简化：

```typescript
// simple-replication (简化版)
new SimpleReplicationPlugin(
	networkAdapter?: INetworkAdapter,     // 对应 backend
	config?: {
		debugEnabled?: boolean,
		updateRate?: number,               // 对应 ServerPlugin 的 tick_schedule
		maxPacketSize?: number
	},
	replicatedComponents?: {
		toAllPlayers?: Set<ComponentCtor>, // 相当于全局复制规则
		toSelfOnly?: Set<ComponentCtor>    // 相当于基于客户端的过滤规则
	}
)
```

**与 Replicon 的区别**:
- **无规则引擎**: 不支持优先级、原型过滤器(With/Without)
- **无序列化策略**: 使用固定的 JSON 序列化，无法自定义
- **简化配置**: 仅两种复制模式，无 ReplicationMode::Once

### 2. Client 组件 (必需)

对应 bevy_replicon 的 `ConnectedClient` 实体：

```typescript
// simple-replication 要求
const Client = component<{ player: Player; loaded: boolean }>("Client");
world.spawn(Client({ player, loaded: true }));
```

**关键差异**:
- **硬编码名称**: 必须使用 `"Client"` 字符串，bevy_replicon 使用类型标记
- **手动创建**: 需要在玩家加入时手动创建，Replicon 由后端自动管理
- **作用**: 标识哪些玩家需要接收复制数据

### 3. 复制模式

对应 bevy_replicon 的可见性策略：

| simple-replication | bevy_replicon 等价 |
|-------------------|-------------------|
| `toAllPlayers` | 所有实体默认对所有客户端可见(无黑名单) |
| `toSelfOnly` | 使用白名单 + 客户端所有权过滤 |

**简化之处**:
- 无动态可见性切换(Visibility::Gained)
- 无关联实体图(父子实体自动同步)
- 无黑名单模式

### 4. 网络适配器 (INetworkAdapter)

对应 bevy_replicon 的消息后端接口：

```typescript
interface INetworkAdapter {
	send(client: Player, data: ReplicationPacket): void;
	onReceive(callback: (data: ReplicationPacket) => void): void;
}
```

**简化点**:
- **无通道系统**: bevy_replicon 有 Updates/Mutations/Events 多通道
- **无可靠性配置**: 默认依赖 RemoteEvent 的可靠性
- **无状态管理**: 不负责 ClientState/ServerState 转换

### 5. 数据流对比

**bevy_replicon 数据流** (复杂):
```
服务端: 变更检测 → 规则匹配 → 序列化
      ↓
      Updates(生成/删除/首次) + Mutations(变更) → 序列化缓冲共享
      ↓
      可见性过滤 → 分包 → 后端发送
      ↓
客户端: 接收 → Updates(有序) → Mutations(无序缓冲) → 确认应用
```

**simple-replication 数据流** (简化):
```
服务端: 变更检测 → 组件集合过滤 → JSON 序列化
      ↓
      单一消息类型 → 适配器发送
      ↓
客户端: 接收 → 直接应用(无缓冲/确认)
```

## 快速开始

```typescript
import { App, DefaultPlugins, BuiltinSchedules } from "bevy_app";
import { SimpleReplicationPlugin } from "simple_replication";
import { component, World } from "bevy_ecs";

// 1. 定义复制组件
const Position = component<{ x: number; y: number }>("Position");
const Health = component<{ value: number }>("Health");
const Inventory = component<{ items: string[] }>("Inventory");

// 2. 配置插件
const app = App.create()
	.addPlugins(DefaultPlugins.create())
	.addPlugin(
		new SimpleReplicationPlugin(
			undefined, // 使用默认 RemoteEvent 适配器
			{ debugEnabled: true, updateRate: 20 },
			{
				toAllPlayers: new Set([Position, Health]),   // 所有人可见
				toSelfOnly: new Set([Inventory])             // 仅拥有者
			}
		)
	);

// 3. 服务端: 创建 Client 实体
import { useEvent } from "@rbxts/matter-hooks";
import { Players } from "@rbxts/services";

function handlePlayerAdded(world: World): void {
	const Client = component<{ player: Player; loaded: boolean }>("Client");

	for (const player of useEvent(Players, "PlayerAdded")) {
		world.spawn(Client({ player, loaded: true }));
	}
}

app.addSystems(BuiltinSchedules.PRE_UPDATE, handlePlayerAdded);

// 4. 运行
app.run();
```

## 主要限制与注意事项

### 1. 无高级序列化

**bevy_replicon**: 支持自定义 RuleFns，可使用 Postcard、MessagePack 等

**simple-replication**: 固定使用 JSON，受限于 Roblox RemoteEvent
```typescript
// 只能复制可 JSON 序列化的类型
// ❌ 不支持: 函数、循环引用、特殊对象
```

### 2. 无变更优化

**bevy_replicon**:
- 只发送变更的组件
- Mutations 消息按优先级分包
- 共享序列化缓冲(多客户端引用同一数据)

**simple-replication**:
- 每次发送完整实体状态
- 无分包机制
- 每个客户端独立序列化

### 3. 无网络容错

**bevy_replicon**:
- Mutation 确认与重传
- 乱序消息缓冲(BufferedMutations)
- ConfirmHistory 拒绝过时变更

**simple-replication**:
- 依赖 RemoteEvent 的可靠性
- 无消息确认
- 无乱序处理

### 4. Client 组件硬编码

**必须使用** `"Client"` 作为组件名称，无法自定义：

```typescript
// ✅ 正确
const Client = component<{ player: Player; loaded: boolean }>("Client");

// ❌ 错误 - 系统无法识别
const PlayerClient = component<{ player: Player; loaded: boolean }>("PlayerClient");
```

**原因**: 系统通过字符串查找 Client 组件，未使用类型系统

## 适用场景

### ✅ 推荐使用

- **快速原型开发**: 几分钟配置完成基础同步
- **简单多人游戏**: 10人以下小规模游戏
- **学习与实验**: 理解网络复制概念
- **开发阶段测试**: 验证游戏逻辑

### ❌ 不推荐使用

- **生产环境**: 性能和可靠性不足
- **大规模游戏**: 带宽和 CPU 开销较高
- **竞技游戏**: 无作弊检测、延迟补偿
- **需要精细控制**: 无可见性、优先级系统

**生产环境替代方案**: Zap、ByteNet 等专业 Roblox 网络库

## 常见问题

### Q: 为什么比 bevy_replicon 简化这么多？

A: **平台限制**。Roblox 无法使用 UDP、自定义协议，依赖 RemoteEvent。Bevy 的高级特性(如 Postcard、确认机制、通道系统)需要底层网络控制。

### Q: 可以扩展吗？

A: 可以通过自定义 `INetworkAdapter` 实现：
```typescript
class ZapAdapter implements INetworkAdapter {
	// 使用 Zap 替代 RemoteEvent
	send(client: Player, data: ReplicationPacket): void {
		// 自定义序列化 + 发送
	}
}
```

### Q: 如何实现可见性控制？

A: 需自行实现过滤逻辑：
```typescript
// 在服务端系统中手动过滤
function serverReplication(world: World): void {
	for (const [entity, position] of world.query(Position)) {
		const shouldReplicate = customVisibilityCheck(entity, player);
		if (!shouldReplicate) continue;
		// 复制逻辑
	}
}
```

### Q: 性能如何？

A: 远低于 bevy_replicon：
- **序列化开销**: JSON vs Postcard (约 3-5 倍差距)
- **带宽占用**: 完整状态 vs 仅变更 (约 2-10 倍)
- **无缓冲共享**: 每客户端独立序列化

**优化建议**: 限制复制频率(updateRate: 10-20)、减少复制组件数量

## 进阶资源

- **源代码**: `src/simple_replication/`
- **单元测试**: `src/simple_replication/__tests__/`
- **示例**: `src/__examples__/simple-replication/`
- **bevy_replicon 原始设计**: `docs-achitecture-recovery/bevy_replicon.md`

## 迁移到生产环境

当项目需要上线时，建议迁移到专业网络库：

1. **Zap** - Roblox 的高性能网络库，支持缓冲区共享和类型安全
2. **ByteNet** - 基于 Buffer 的二进制序列化
3. **自定义方案** - 参考 bevy_replicon 的设计实现完整复制系统

本插件的价值在于**快速验证游戏概念**，而非生产部署。

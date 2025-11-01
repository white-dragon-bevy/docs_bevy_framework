---
name: integration-testing
description: White Dragon Bevy 的集成测试指南。当你需要测试多个模块协作、验证端到端流程、测试服务端-客户端通信或模拟完整应用流程时使用。适用于复制系统测试、多系统集成、完整功能验证等场景。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/**/__tests__/*integration*.ts)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/docs/integration-test-guide.md)
  - Bash(npm test integration)
  - Bash(npm run build)
---

# Integration Testing - 集成测试 Skill

## 📖 概述

集成测试验证多个模块协作的正确性,确保系统作为一个整体正常工作。本指南基于 Simple Replication 系统的集成测试经验,提供了完整的集成测试方法论。

**测试成果**:
- ✅ **全部通过** - 单元测试 + 集成测试共 1575 个测试通过
- ✅ **完整覆盖** - 涵盖实体复制、组件同步、多客户端等场景
- ✅ **可靠架构** - 基于队列模式的稳定测试环境

**核心特性**:
- **端到端测试** - 完整的服务器-客户端流程
- **队列模式** - 不依赖 RemoteEvent 的可靠通信
- **多 World 测试** - 独立的服务端和客户端 World
- **数据验证** - 完整的状态同步验证
- **环境隔离** - 每个测试完全独立

## 🎯 何时使用

- 当你需要测试服务器-客户端复制时
- 当你要验证多个系统的协作时
- 当你需要测试完整的业务流程时
- 当你要验证跨帧的状态变化时
- 当你需要模拟复杂的用户交互时
- 适用于复制系统、多系统集成、端到端验证等场景

## 🚀 快速开始

### 最简单的集成测试

```typescript
import { BevyWorld } from "bevy_ecs/bevy-world";
import { Loop } from "@rbxts/matter";
import { IntegrationTestAdapter } from "./integration-test-adapter";

export = () => {
	describe("服务器-客户端集成", () => {
		let serverWorld: BevyWorld;
		let clientWorld: BevyWorld;
		let adapter: IntegrationTestAdapter;

		beforeEach(() => {
			serverWorld = new BevyWorld();
			clientWorld = new BevyWorld();
			adapter = new IntegrationTestAdapter();
		});

		afterEach(() => {
			adapter.cleanup();
		});

		it("应该从服务器复制到客户端", () => {
			// 创建服务器实体
			const serverEntity = serverWorld.spawn(
				TestComponent({ data: "test" })
			);

			// 运行服务器系统
			const serverLoop = new Loop(serverWorld, mockContext);
			serverLoop.scheduleSystems([serverSystem]);
			serverLoop.step("default", 1/60);

			// 运行客户端系统
			const clientLoop = new Loop(clientWorld, mockContext);
			clientLoop.scheduleSystems([clientSystem]);
			clientLoop.step("default", 1/60);

			// 验证复制成功
			const clientEntity = getReplicatedEntity(serverEntity);
			expect(clientEntity).to.be.ok();
		});
	});
};
```

## 📚 核心概念

### 概念 1: 集成测试 vs 单元测试

| 特性 | 单元测试 | 集成测试 |
|------|---------|---------|
| 测试范围 | 单个模块/函数 | 多个模块协作 |
| 依赖处理 | Mock/Stub | 真实依赖 |
| 执行速度 | 快 | 较慢 |
| 维护成本 | 低 | 较高 |
| 问题定位 | 容易 | 较难 |
| 适用场景 | 单元功能 | 端到端流程 |

**推荐策略**:
- 80% 单元测试 + 20% 集成测试
- 核心流程必须有集成测试
- 复杂交互优先集成测试

### 概念 2: IntegrationTestAdapter（集成测试适配器）

专门用于集成测试的网络适配器,使用队列模式模拟服务器-客户端通信。

**特点**:
- **队列模式** - 不依赖 RemoteEvent 或 BindableEvent
- **服务端环境** - 在服务端环境运行
- **数据队列** - 支持数据队列和消息记录
- **可清理** - 支持测试间完全清理

**为什么使用队列模式**:

最初尝试使用 BindableEvent 进行通信,但遇到问题:

```typescript
// ❌ 不工作
const bindableEvent = new Instance("BindableEvent");

// 服务器发送
bindableEvent.Fire(data);

// 客户端接收
for (const [_, data] of useEvent(bindableEvent, "Event")) {
	// useEvent 在不同的 Loop 中无法接收
}
```

**根本原因**: `useEvent` Hook 在每个 World 的 Loop 中是独立的,无法跨 World 通信。

**解决方案**:使用队列模式:

```typescript
// ✅ 工作正常
class IntegrationTestAdapter {
	private pendingData: Array<defined> = [];

	// 服务器发送时加入队列
	fire(player: Player, value: unknown) {
		this.pendingData.push(value as defined);
	}

	// 客户端主动获取队列数据
	getPendingData(): Array<unknown> {
		const data = [...this.pendingData];
		this.pendingData = [];
		return data;
	}
}
```

**使用示例**:
```typescript
import { IntegrationTestAdapter } from "./integration-test-adapter";

const adapter = new IntegrationTestAdapter();

// 注册到两个 World
serverWorld.resources.insertResourceByTypeDescriptor(adapter, ...);
clientWorld.resources.insertResourceByTypeDescriptor(adapter, ...);

// 服务器系统发送数据
function serverSystem(world: World): void {
	const adapter = world.getResource<IntegrationTestAdapter>();
	adapter.fire(player, data);
}

// 客户端系统接收数据
function clientSystem(world: World): void {
	const adapter = world.getResource<IntegrationTestAdapter>();
	const pending = adapter.getPendingData();
	for (const data of pending) {
		// 处理数据
	}
}
```

### 概念 3: 多 World 测试架构

集成测试使用独立的服务端和客户端 World。

**架构**:
```
┌─────────────────┐         ┌─────────────────┐
│ Server World    │         │ Client World    │
│                 │         │                 │
│ - Server Loop   │         │ - Client Loop   │
│ - Server Systems│         │ - Client Systems│
│ - Server State  │         │ - Client State  │
└─────────┬───────┘         └─────────┬───────┘
          │                           │
          │   IntegrationTestAdapter  │
          └─────────────┬─────────────┘
                        │
                   Data Queue
```

**初始化流程**:
```typescript
beforeEach(() => {
	// 1. 创建独立的 World
	serverWorld = new BevyWorld();
	clientWorld = new BevyWorld();

	// 2. 创建共享的适配器
	adapter = new IntegrationTestAdapter();

	// 3. 注册适配器到两个 World
	serverWorld.resources.insertResourceByTypeDescriptor(adapter, ...);
	clientWorld.resources.insertResourceByTypeDescriptor(adapter, ...);

	// 4. 创建独立的 Loop
	serverLoop = new Loop(serverWorld, mockContext);
	clientLoop = new Loop(clientWorld, mockContext);

	// 5. 注册系统
	serverLoop.scheduleSystems([serverSystem]);
	clientLoop.scheduleSystems([clientSystem]);
});
```

### 概念 4: Loop 初始化和变更检测

Loop 需要先运行一帧记录初始状态,才能检测变更。

**问题**:
```typescript
// ❌ 错误:直接修改后运行
serverWorld.insert(entity, Component({ value: 1 }));
serverLoop.step("default", 1/60);  // queryChanged() 返回空
```

**原因**: Loop 没有初始状态参考,无法判断什么是"变更"。

**解决方案**:
```typescript
// ✅ 正确:先运行一帧记录初始状态
serverLoop.step("default", 1/60);  // 记录初始状态

// 修改数据
serverWorld.insert(entity, Component({ value: 1 }));

// 再运行一帧检测变更
serverLoop.step("default", 1/60);  // queryChanged() 可以检测到变更
```

**完整流程**:
```typescript
it("应该复制实体变更", () => {
	// 创建实体
	const entity = serverWorld.spawn(TestComponent({ value: 0 }));

	// 运行一帧记录初始状态
	serverLoop.step("default", 1/60);

	// 修改组件
	serverWorld.insert(entity, TestComponent({ value: 100 }));

	// 运行一帧发送变更
	serverLoop.step("default", 1/60);

	// 运行客户端接收
	clientLoop.step("default", 1/60);

	// 验证
	expect(clientEntity.value).to.equal(100);
});
```

### 概念 5: 测试隔离

每个测试必须完全独立,避免状态污染。

**隔离清单**:
- ✅ 每个测试创建新的 World
- ✅ 每个测试创建新的 Adapter
- ✅ 每个测试创建新的 Loop
- ✅ afterEach 中清理所有资源
- ✅ 不共享全局变量

**示例**:
```typescript
describe("集成测试套件", () => {
	let serverWorld: BevyWorld;
	let clientWorld: BevyWorld;
	let adapter: IntegrationTestAdapter;
	let serverLoop: Loop;
	let clientLoop: Loop;

	beforeEach(() => {
		// 每个测试创建新实例
		serverWorld = new BevyWorld();
		clientWorld = new BevyWorld();
		adapter = new IntegrationTestAdapter();
		serverLoop = new Loop(serverWorld, mockContext);
		clientLoop = new Loop(clientWorld, mockContext);
	});

	afterEach(() => {
		// 清理资源
		adapter.cleanup();
		serverWorld.clear();
		clientWorld.clear();
	});

	it("测试1", () => {
		// 使用独立的实例
	});

	it("测试2", () => {
		// 不会受到测试1的影响
	});
});
```

### 概念 6: 实体 ID 映射

服务器实体 ID 和客户端实体 ID 不同,需要通过映射查找。

**问题**:
```typescript
// ❌ 错误:直接使用服务器 ID
const serverEntity = serverWorld.spawn(...);
const clientComponent = clientWorld.get(serverEntity, Component);  // undefined
```

**解决方案**:
```typescript
// ✅ 正确:使用映射查找客户端 ID
const serverEntity = serverWorld.spawn(...);

// 服务器 ID 是数字,转换为字符串作为键
const serverEntityIdStr = tostring(serverEntity);

// 从客户端状态获取映射的实体 ID
const clientState = clientWorld.getResource<ClientState>();
const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);

if (clientEntityId !== undefined) {
	const component = clientWorld.get(clientEntityId, Component);
}
```

### 概念 7: 调试和故障排查

集成测试出问题时的调试步骤。

**常见问题**:

#### 1. 客户端未接收到数据

**症状**: `clientState.entityIdMap.size() === 0`

**可能原因**:
- 忘记运行客户端 Loop
- 服务器没有发送数据
- 适配器配置错误

**调试方法**:
```typescript
// 添加调试输出
serverState.debugEnabled = true;
clientState.debugEnabled = true;

// 检查发送的消息
print("Server sent:", adapter.sentMessages.size());

// 检查队列数据
const pending = adapter.getPendingData();
print("Pending data:", pending.size());
```

#### 2. Loop 未检测到变更

**症状**: `queryChanged()` 返回空结果

**原因**: Loop 需要先运行一帧记录初始状态

**解决方法**:
```typescript
// ✅ 正确顺序
serverLoop.step("default", 1/60);  // 记录初始状态
serverWorld.insert(entity, Component(...));  // 修改
serverLoop.step("default", 1/60);  // 检测变更
```

## 🔧 API 使用指南

### IntegrationTestAdapter API

#### `constructor()`
创建集成测试适配器。

```typescript
const adapter = new IntegrationTestAdapter();
```

#### `fire(player: Player, value: unknown): void`
发送数据到队列。

**参数**:
- `player` - 目标玩家
- `value` - 要发送的数据

```typescript
adapter.fire(player, { type: "update", data: "test" });
```

#### `getPendingData(): Array<unknown>`
获取并清空队列数据。

**返回值**:
- 队列中的所有数据

```typescript
const pending = adapter.getPendingData();
for (const data of pending) {
	processData(data);
}
```

#### `cleanup(): void`
清理适配器资源。

```typescript
afterEach(() => {
	adapter.cleanup();
});
```

### Loop 测试 API

#### `step(scheduleName: string, deltaTime: number): void`
执行一帧。

**参数**:
- `scheduleName` - 调度名称(通常为 "default")
- `deltaTime` - 帧时间(通常为 1/60)

```typescript
loop.step("default", 1/60);
```

#### `scheduleSystems(systems: Array<System>): void`
注册系统。

**参数**:
- `systems` - 系统数组

```typescript
loop.scheduleSystems([system1, system2]);
```

## ✅ 最佳实践

### 1. 测试结构

#### ✅ 推荐做法

```typescript
describe("功能集成测试", () => {
	let serverWorld: BevyWorld;
	let clientWorld: BevyWorld;
	let adapter: IntegrationTestAdapter;

	beforeEach(() => {
		serverWorld = new BevyWorld();
		clientWorld = new BevyWorld();
		adapter = new IntegrationTestAdapter();
	});

	afterEach(() => {
		adapter.cleanup();
	});

	it("应该...", () => {
		// 测试逻辑
	});
});
```

### 2. Loop 初始化

#### ✅ 推荐做法

```typescript
it("应该检测变更", () => {
	// 先运行一帧记录初始状态
	serverLoop.step("default", 1/60);

	// 修改数据
	serverWorld.insert(entity, Component({ value: 1 }));

	// 再运行一帧检测变更
	serverLoop.step("default", 1/60);
});
```

#### ❌ 避免的做法

```typescript
it("应该检测变更", () => {
	// ❌ 直接修改后运行
	serverWorld.insert(entity, Component({ value: 1 }));
	serverLoop.step("default", 1/60);  // 检测不到变更
});
```

### 3. 实体 ID 映射

#### ✅ 推荐做法

```typescript
// 服务器实体 ID 是数字
const serverEntity = serverWorld.spawn(...);

// 转换为字符串作为键值
const serverEntityIdStr = tostring(serverEntity);

// 查找客户端实体
const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);
```

### 4. 测试命名

#### ✅ 推荐做法

```typescript
describe("服务器-客户端复制", () => {
	it("应该复制实体到客户端", () => { ... });
	it("应该同步组件更新", () => { ... });
	it("应该处理实体删除", () => { ... });
});
```

### 5. 调试输出

#### ✅ 推荐做法

```typescript
// 开发时启用调试
if (DEBUG_MODE) {
	serverState.debugEnabled = true;
	clientState.debugEnabled = true;
}

// 提交前禁用调试
```

## ⚠️ 常见陷阱

### 陷阱 1: 忘记运行客户端 Loop

**问题**:
```typescript
// ❌ 只运行服务器
serverLoop.step("default", 1/60);
// 客户端未接收数据
```

**解决方案**:
```typescript
// ✅ 运行服务器和客户端
serverLoop.step("default", 1/60);
clientLoop.step("default", 1/60);
```

### 陷阱 2: 共享状态

**问题**:
```typescript
// ❌ 在 describe 块外创建共享实例
const adapter = new IntegrationTestAdapter();

describe("测试", () => {
	it("测试1", () => {
		// 使用共享的 adapter
	});

	it("测试2", () => {
		// 受到测试1的影响
	});
});
```

**解决方案**:
```typescript
// ✅ 在 beforeEach 中创建独立实例
describe("测试", () => {
	let adapter: IntegrationTestAdapter;

	beforeEach(() => {
		adapter = new IntegrationTestAdapter();
	});

	afterEach(() => {
		adapter.cleanup();
	});
});
```

### 陷阱 3: 错误的 ID 映射

**问题**:
```typescript
// ❌ 直接使用服务器 ID
const component = clientWorld.get(serverEntity, Component);
```

**解决方案**:
```typescript
// ✅ 使用映射查找
const serverEntityIdStr = tostring(serverEntity);
const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);
if (clientEntityId !== undefined) {
	const component = clientWorld.get(clientEntityId, Component);
}
```

## 💡 完整示例

完整示例请参考 `docs/integration-test-guide.md`。

### 示例 1: 基础复制测试

```typescript
it("should replicate entity from server to client", () => {
	// 创建客户端实体
	const player = { Name: "TestPlayer", UserId: 123 } as Player;
	const clientEntity = serverWorld.spawn(
		ClientComponentCtor({ player, loaded: true })
	);

	// 创建要复制的实体
	const serverEntity = serverWorld.spawn(
		ReplicatedComponent({ data: "test" })
	);

	// 运行服务器系统
	const serverLoop = new Loop(serverWorld, mockContext);
	serverLoop.scheduleSystems([serverReplicationSystem]);

	// 先运行一帧记录初始状态
	serverLoop.step("default", 1/60);

	// 修改数据触发变更检测
	serverWorld.insert(serverEntity, ReplicatedComponent({ data: "modified" }));

	// 再运行一帧发送变更
	serverLoop.step("default", 1/60);

	// 运行客户端系统
	const clientLoop = new Loop(clientWorld, mockContext);
	clientLoop.scheduleSystems([clientReceiveSystem]);
	clientLoop.step("default", 1/60);

	// 验证结果
	const serverEntityIdStr = tostring(serverEntity);
	const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);

	expect(clientEntityId).to.be.ok();
	expect(clientWorld.get(clientEntityId!, ReplicatedComponent).data)
		.to.equal("modified");

	// 清理
	serverWorld.despawn(serverEntity);
	serverWorld.despawn(clientEntity);
});
```

### 示例 2: 多客户端测试

参考 `docs/integration-test-guide.md` 中的多客户端示例。

### 示例 3: 新客户端初始状态

参考 `docs/integration-test-guide.md` 中的新客户端示例。

## 🔗 相关资源

### 相关文档
- [集成测试指南](../../integration-test-guide.md) - 完整的集成测试文档

### 相关 Skills
- [unit-testing](../unit-testing/SKILL.md) - 单元测试
- [cloud-testing](../cloud-testing/SKILL.md) - 云端测试

### 外部文档
- [TestEZ 文档](https://roblox.github.io/testez/) - Roblox 测试框架
- [@rbxts/matter 文档](https://eryn.io/matter/) - Matter ECS 文档

## 📋 集成测试检查清单

- [ ] 每个测试创建独立的 World 和 Adapter
- [ ] 使用 beforeEach/afterEach 清理资源
- [ ] Loop 先运行一帧记录初始状态
- [ ] 正确使用实体 ID 映射
- [ ] 服务器和客户端 Loop 都运行
- [ ] 测试间完全隔离
- [ ] 验证完整的端到端流程
- [ ] 运行 `npm test integration` 确保通过

## 🎓 进阶主题

### 性能测试

```typescript
it("应该在合理时间内复制大量实体", () => {
	const ENTITY_COUNT = 1000;
	const startTime = os.clock();

	// 创建大量实体
	for (let i = 0; i < ENTITY_COUNT; i++) {
		serverWorld.spawn(TestComponent({ value: i }));
	}

	// 复制流程
	serverLoop.step("default", 1/60);
	serverLoop.step("default", 1/60);
	clientLoop.step("default", 1/60);

	const duration = os.clock() - startTime;

	// 验证性能
	expect(duration).to.be.lessThan(1.0);  // 1 秒内

	// 验证数据
	expect(clientState.entityIdMap.size()).to.equal(ENTITY_COUNT);
});
```

### 错误恢复测试

```typescript
it("应该处理网络中断恢复", () => {
	// 初始复制
	const entity = serverWorld.spawn(Component({ value: 1 }));
	serverLoop.step("default", 1/60);
	serverLoop.step("default", 1/60);
	clientLoop.step("default", 1/60);

	// 模拟网络中断
	adapter.clearQueue();

	// 服务器继续更新
	serverWorld.insert(entity, Component({ value: 2 }));
	serverLoop.step("default", 1/60);

	// 网络恢复
	clientLoop.step("default", 1/60);

	// 验证同步恢复
	const clientEntityId = clientState.entityIdMap.get(tostring(entity));
	expect(clientWorld.get(clientEntityId!, Component).value).to.equal(2);
});
```

### 多系统集成

```typescript
it("应该集成物理和渲染系统", () => {
	// 注册多个系统
	serverLoop.scheduleSystems([
		physicsSystem,
		collisionSystem,
		replicationSystem,
	]);

	clientLoop.scheduleSystems([
		receiveSystem,
		renderSystem,
		animationSystem,
	]);

	// 执行完整流程
	serverLoop.step("default", 1/60);
	serverLoop.step("default", 1/60);
	clientLoop.step("default", 1/60);

	// 验证各系统协作正确
});
```

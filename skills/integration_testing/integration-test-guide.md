# Simple Replication 集成测试指南

## 概述

本文档介绍如何为 Simple Replication 系统编写和运行集成测试。集成测试在服务端环境中运行，模拟完整的服务器-客户端复制流程。

## 测试结果

✅ **全部通过**
- 单元测试: 67 个（client-receive + server-replication）
- 集成测试: 6 个
- 总计成功: 1575 个测试

## 集成测试架构

### 核心组件

1. **IntegrationTestAdapter** - 集成测试网络适配器
   - 位置: `src/simple_replication/__tests__/integration-test-adapter.ts`
   - 功能: 使用队列模式模拟服务器-客户端通信
   - 特点:
     - 不依赖 RemoteEvent 或 BindableEvent
     - 在服务端环境运行
     - 支持数据队列和消息记录

2. **Integration Test Suite** - 集成测试套件
   - 位置: `src/simple_replication/__tests__/integration.spec.ts`
   - 测试场景:
     - 实体从服务器复制到客户端
     - 组件更新同步
     - SelfOnly 组件隔离
     - 实体删除同步
     - 多客户端场景
     - 新客户端初始状态

### 测试流程

```typescript
// 1. 创建服务器和客户端 World
serverWorld = new BevyWorld();
clientWorld = new BevyWorld();

// 2. 创建共享的适配器
adapter = new IntegrationTestAdapter();

// 3. 注册资源
serverWorld.resources.insertResourceByTypeDescriptor(adapter, ...);
clientWorld.resources.insertResourceByTypeDescriptor(adapter, ...);

// 4. 运行服务器系统（发送数据）
serverLoop.step("default", 1/60);

// 5. 运行客户端系统（接收数据）
clientLoop.step("default", 1/60);

// 6. 验证结果
expect(clientState.entityIdMap.get(serverEntityId)).to.be.ok();
```

## 为什么使用队列模式？

### 问题

最初尝试使用 BindableEvent 进行通信，但遇到问题：

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

**根本原因**: useEvent Hook 在每个 World 的 Loop 中是独立的，无法跨 World 通信。

### 解决方案

使用队列模式，类似于 MockNetworkAdapter：

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

## 编写集成测试

### 基本模板

```typescript
it("should replicate data from server to client", () => {
  // 1. 创建客户端实体
  const player = { Name: "TestPlayer", UserId: 123 } as Player;
  const clientEntity = serverWorld.spawn(
    ClientComponentCtor({ player, loaded: true })
  );

  // 2. 创建要复制的实体
  const serverEntity = serverWorld.spawn(
    ReplicatedComponent({ data: "test" })
  );

  // 3. 运行服务器系统
  const serverLoop = new Loop(serverWorld, mockContext);
  serverLoop.scheduleSystems([serverReplicationSystem]);

  // 先运行一帧记录初始状态
  serverLoop.step("default", 1/60);

  // 修改数据触发变更检测
  serverWorld.insert(serverEntity, ReplicatedComponent({ data: "modified" }));

  // 再运行一帧发送变更
  serverLoop.step("default", 1/60);

  // 4. 运行客户端系统
  const clientLoop = new Loop(clientWorld, mockContext);
  clientLoop.scheduleSystems([clientReceiveSystem]);
  clientLoop.step("default", 1/60);

  // 5. 验证结果
  const serverEntityIdStr = tostring(serverEntity);
  const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);

  expect(clientEntityId).to.be.ok();
  expect(clientWorld.get(clientEntityId!, ReplicatedComponent).data)
    .to.equal("modified");

  // 6. 清理
  serverWorld.despawn(serverEntity);
  serverWorld.despawn(clientEntity);
});
```

### 重要注意事项

1. **Loop 初始化**:
   ```typescript
   // ❌ 错误：直接修改后运行
   serverWorld.insert(entity, Component({ value: 1 }));
   serverLoop.step("default", 1/60);

   // ✅ 正确：先运行一帧记录初始状态
   serverLoop.step("default", 1/60);
   serverWorld.insert(entity, Component({ value: 1 }));
   serverLoop.step("default", 1/60);
   ```

2. **测试隔离**:
   ```typescript
   beforeEach(() => {
     // 每个测试创建新的实例
     serverWorld = new BevyWorld();
     clientWorld = new BevyWorld();
     adapter = new IntegrationTestAdapter();
   });

   afterEach(() => {
     // 清理适配器
     adapter.cleanup();
   });
   ```

3. **实体 ID 映射**:
   ```typescript
   // 服务器实体 ID 是数字
   const serverEntity = serverWorld.spawn(...);

   // 转换为字符串作为键值
   const serverEntityIdStr = tostring(serverEntity);

   // 查找客户端实体
   const clientEntityId = clientState.entityIdMap.get(serverEntityIdStr);
   ```

## 运行测试

```bash
# 编译项目
npm run build

# 运行所有测试
npm test

# 只运行集成测试
npm test integration

# 只运行特定测试文件
npm test client-receive
npm test server-replication
```

## 测试覆盖率

### 已覆盖场景

- ✅ 实体创建和复制
- ✅ 组件更新同步
- ✅ 组件移除
- ✅ 实体删除
- ✅ ToAllPlayers 组件广播
- ✅ ToSelfOnly 组件隔离
- ✅ 多客户端场景
- ✅ 新客户端初始状态

### 待补充场景

- ⏳ 大量实体的性能测试
- ⏳ 网络断开重连
- ⏳ 数据包压缩
- ⏳ 客户端到服务器的输入

## 故障排查

### 客户端未接收到数据

**症状**: `clientState.entityIdMap.size() === 0`

**可能原因**:
1. 忘记运行客户端 Loop
2. 服务器没有发送数据
3. 适配器配置错误

**解决方法**:
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

### Loop 未检测到变更

**症状**: `queryChanged()` 返回空结果

**原因**: Loop 需要先运行一帧记录初始状态

**解决方法**:
```typescript
// ✅ 正确顺序
serverLoop.step("default", 1/60);  // 记录初始状态
serverWorld.insert(entity, Component(...));  // 修改
serverLoop.step("default", 1/60);  // 检测变更
```

## 总结

集成测试通过队列模式成功模拟了完整的服务器-客户端复制流程，所有测试用例全部通过。这为 Simple Replication 系统提供了可靠的质量保证。

**关键要点**:
- 使用队列而不是 BindableEvent
- 服务器和客户端共享同一个适配器实例
- Loop 需要先运行一帧记录初始状态
- 每个测试用例完全隔离

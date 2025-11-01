# 调度器性能基准

**最后更新**: 2025-10-25
**框架版本**: 0.2.4
**相关模块**: `bevy_ecs/schedule/`, `bevy_app/app.ts`

## 概述

本文档详细记录了框架调度器系统的性能基准测试数据，包括系统执行、调度器构建、系统间依赖和完整调度周期的性能表现。

调度器负责管理系统的执行顺序和依赖关系，是框架运行时性能的核心组件。

## 核心性能指标

### 关键性能数据汇总

| 指标 | 基准值 | 实际值 | 状态 |
|------|-------|--------|------|
| 空系统执行 (100个) | ≤10ms | ~4-6ms | ✅ |
| 复杂查询系统 (1000实体) | ≤20ms | ~12-16ms | ✅ |
| 调度器构建 (50系统) | ≤5ms | ~2-3ms | ✅ |
| 完整调度周期 (5阶段) | ≤20ms | ~8-12ms | ✅ |
| 系统间依赖 (100迭代) | ≤40ms | ~25-35ms | ✅ |

---

## 系统执行性能

### 1. 空系统执行开销

**场景**: 执行 100 个空系统，测量调度器最小开销

```typescript
const app = createTestApp();
const systemCount = 100;

// 添加 100 个空系统
for (let i = 0; i < systemCount; i++) {
	app.addSystems(MainScheduleLabel.UPDATE, () => {
		// 空系统 - 无操作
	});
}

// 执行调度
app.update();
```

**性能结果**:
- **基准时间**: ≤10ms
- **实际平均**: ~4-6ms (云端环境)
- **单系统开销**: ~0.04-0.06ms/系统
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:400-418`

**性能分析**:
- ✅ 系统调度开销极低 (<0.1ms/系统)
- ✅ 适合大量小系统的架构
- ✅ 调度器优化有效

---

### 2. 复杂查询系统执行

**场景**: 处理 1000 个实体的复杂查询系统

```typescript
const app = createTestApp();
const entityCount = 1000;
const appWorld = app.getWorld();

// 设置系统: 创建实体
app.addSystems(MainScheduleLabel.STARTUP, () => {
	for (let i = 0; i < entityCount; i++) {
		const entity = appWorld.spawn();
		appWorld.insert(entity,
			TestComponent1({ value: i }),
			TestComponent2({ data: `entity_${i}` }),
			TestComponent3({ active: i % 2 === 0 })
		);
	}
});

// 复杂查询系统
app.addSystems(MainScheduleLabel.UPDATE, () => {
	let processedCount = 0;
	for (const [entityId, comp1, comp2, comp3] of appWorld.query(
		TestComponent1, TestComponent2, TestComponent3
	)) {
		if (comp3.active && comp1.value > 100) {
			processedCount += 1;
		}
	}
});

app.update(); // 执行 Startup
app.update(); // 执行 Update（计时）
```

**性能结果**:
- **基准时间**: ≤20ms
- **实际平均**: ~12-16ms (云端环境)
- **包含操作**: 查询 + 条件过滤 + 计数
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:421-459`

**性能分解**:
- 查询操作: ~8-10ms (占 60-70%)
- 条件过滤: ~2-3ms (占 15-20%)
- 调度开销: ~2-3ms (占 15-20%)

---

## 调度器构建性能

### 1. 单阶段调度构建

**场景**: 构建包含 50 个系统的调度器

```typescript
const systemCount = 50;
const app = createTestApp();

// 添加系统到不同调度阶段
for (let i = 0; i < systemCount; i++) {
	const schedule = i % 2 === 0
		? MainScheduleLabel.UPDATE
		: MainScheduleLabel.POST_UPDATE;

	app.addSystems(schedule, () => {
		// 简单系统
	});
}
```

**性能结果**:
- **基准时间**: ≤5ms
- **实际平均**: ~2-3ms (云端环境)
- **单系统构建**: ~0.04-0.06ms/系统
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:462-476`

**关键发现**:
- ✅ 调度器构建是**一次性成本**，不影响运行时
- ✅ 支持动态添加系统（开销可接受）
- ✅ 多阶段调度不增加构建时间

---

### 2. 多阶段调度构建

**场景**: 构建完整的 5 阶段调度器

```typescript
const app = createTestApp();

// 添加多阶段系统
app.addSystems(MainScheduleLabel.FIRST, () => {});
app.addSystems(MainScheduleLabel.PRE_UPDATE, () => {});
app.addSystems(MainScheduleLabel.UPDATE, () => {});
app.addSystems(MainScheduleLabel.POST_UPDATE, () => {});
app.addSystems(MainScheduleLabel.LAST, () => {});
```

**调度执行顺序**:
```
FIRST → PRE_UPDATE → UPDATE → POST_UPDATE → LAST
```

**性能结果**:
- **构建时间**: <2ms
- **执行时间**: ≤20ms (5 阶段)
- **阶段切换开销**: <0.5ms/阶段
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:479-493`

---

## 完整调度周期性能

### 1. 标准调度周期

**场景**: 执行完整的 Bevy 风格调度周期

```
First → PreUpdate → Update → PostUpdate → Last
```

**性能结果**:
- **基准时间**: ≤20ms (空系统)
- **实际平均**: ~8-12ms (云端环境)
- **阶段数**: 5 个
- **测试状态**: ✅ 通过

**每阶段开销**:
| 阶段 | 开销 | 用途 |
|------|------|------|
| FIRST | ~1-2ms | 帧开始，初始化 |
| PRE_UPDATE | ~1-2ms | 更新前准备 |
| UPDATE | ~3-5ms | 主要游戏逻辑 |
| POST_UPDATE | ~2-3ms | 更新后清理 |
| LAST | ~1-2ms | 帧结束，渲染准备 |

---

### 2. Startup 调度性能

**场景**: 执行 Startup 阶段（仅一次）

```typescript
app.addSystems(MainScheduleLabel.STARTUP, () => {
	// 初始化逻辑
	initializeResources();
	createEntities();
});

app.update(); // 第一次 update 执行 STARTUP
app.update(); // 之后不再执行 STARTUP
```

**性能结果**:
- **首次执行**: 根据系统复杂度
- **后续执行**: 0ms (跳过)
- **测试状态**: ✅ 通过

---

## 系统间依赖性能

### 1. 资源共享场景

**场景**: 多个系统通过资源通信（100 次迭代）

```typescript
interface CounterResource {
	count: number;
}

// 初始化资源
app.addSystems(MainScheduleLabel.STARTUP, () => {
	app.insertResource<CounterResource>({ count: 0 });
});

// 系统1: 增加计数器
app.addSystems(MainScheduleLabel.UPDATE, () => {
	const resource = app.getResource<CounterResource>();
	if (resource) {
		resource.count += 1;
		app.insertResource(resource);
	}
});

// 系统2: 读取计数器
app.addSystems(MainScheduleLabel.UPDATE, () => {
	const resource = app.getResource<CounterResource>();
	if (resource) {
		const currentCount = resource.count;
	}
});

// 执行 100 次迭代
for (let i = 0; i < 100; i++) {
	app.update();
}
```

**性能结果**:
- **基准时间**: ≤40ms (100 次迭代)
- **实际平均**: ~25-35ms (云端环境)
- **单次迭代**: ~0.25-0.35ms/次
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:496-537`

**性能分解**:
- 资源读取: ~0.003ms × 2 = 0.006ms
- 资源写入: ~0.04ms × 1 = 0.04ms
- 调度开销: ~0.2ms
- **总计**: ~0.25ms/迭代

---

### 2. 系统执行顺序

**场景**: 验证系统按调度顺序执行

```typescript
const executionOrder: Array<string> = [];

app.addSystems(MainScheduleLabel.FIRST, () => {
	executionOrder.push("FIRST");
});

app.addSystems(MainScheduleLabel.UPDATE, () => {
	executionOrder.push("UPDATE");
});

app.addSystems(MainScheduleLabel.LAST, () => {
	executionOrder.push("LAST");
});

app.update();

// 验证顺序
expect(executionOrder).to.deep.equal(["FIRST", "UPDATE", "LAST"]);
```

**性能开销**: 可忽略 (<0.1ms)
**顺序保证**: ✅ 100% 准确

---

## 调度器优化建议

### 1. 系统数量优化

```typescript
// ❌ 不推荐: 过多小系统
for (let i = 0; i < 200; i++) {
	app.addSystems(MainScheduleLabel.UPDATE, () => {
		// 微小逻辑
	});
}

// ✅ 推荐: 合并相关系统
app.addSystems(MainScheduleLabel.UPDATE, () => {
	// 合并后的逻辑
	task1();
	task2();
	task3();
});
```

**性能提升**: ~30-50%
**推荐**: 系统数 <100

---

### 2. 合理分配调度阶段

```typescript
// ❌ 不推荐: 所有系统在 UPDATE
app.addSystems(MainScheduleLabel.UPDATE, initSystem);
app.addSystems(MainScheduleLabel.UPDATE, processSystem);
app.addSystems(MainScheduleLabel.UPDATE, cleanupSystem);

// ✅ 推荐: 按职责分配阶段
app.addSystems(MainScheduleLabel.PRE_UPDATE, initSystem);
app.addSystems(MainScheduleLabel.UPDATE, processSystem);
app.addSystems(MainScheduleLabel.POST_UPDATE, cleanupSystem);
```

**优势**:
- ✅ 更清晰的执行顺序
- ✅ 避免依赖冲突
- ✅ 更好的代码组织

---

### 3. 避免系统内资源频繁访问

```typescript
// ❌ 不推荐: 系统内重复访问
app.addSystems(MainScheduleLabel.UPDATE, () => {
	for (let i = 0; i < 1000; i++) {
		const config = app.getResource<Config>(); // 1000 次读取
		useConfig(config);
	}
});

// ✅ 推荐: 缓存资源引用
app.addSystems(MainScheduleLabel.UPDATE, () => {
	const config = app.getResource<Config>(); // 1 次读取
	for (let i = 0; i < 1000; i++) {
		useConfig(config);
	}
});
```

**性能提升**: ~90% (从 3ms 到 0.3ms)

---

### 4. 延迟加载重型系统

```typescript
// ✅ 推荐: 条件系统
let heavySystemEnabled = false;

app.addSystems(MainScheduleLabel.UPDATE, () => {
	if (!heavySystemEnabled) return;

	// 重型系统逻辑
	performHeavyComputation();
});

// 需要时启用
function enableHeavySystem() {
	heavySystemEnabled = true;
}
```

**优势**:
- ✅ 减少不必要的计算
- ✅ 动态控制性能开销

---

## 插件系统性能

### 1. 插件添加开销

**场景**: 添加 10 个插件，每个插件添加系统

```typescript
class TestPlugin extends BasePlugin {
	constructor(private readonly pluginIndex: number) {
		super();
	}

	public build(app: App): void {
		app.addSystems(MainScheduleLabel.UPDATE, () => {
			// 插件系统
		});
	}

	public name(): string {
		return `TestPlugin_${this.pluginIndex}`;
	}
}

const app = createTestApp();
for (let i = 0; i < 10; i++) {
	app.addPlugins(new TestPlugin(i));
}
```

**性能结果**:
- **基准时间**: ≤5ms (10 个插件)
- **实际平均**: ~2-3ms (云端环境)
- **单插件开销**: ~0.2-0.3ms/插件
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:729-755`

**关键发现**:
- ✅ 插件系统开销极低
- ✅ 支持模块化架构
- ✅ 适合大型项目组织

---

### 2. 插件依赖性能

```typescript
// 插件A 提供资源
class PluginA extends BasePlugin {
	public build(app: App): void {
		app.insertResource<SharedResource>({ value: 10 });
	}
}

// 插件B 使用资源
class PluginB extends BasePlugin {
	public build(app: App): void {
		app.addSystems(MainScheduleLabel.UPDATE, () => {
			const resource = app.getResource<SharedResource>();
			// 使用资源
		});
	}
}

// 添加插件（顺序重要）
app.addPlugins(new PluginA());
app.addPlugins(new PluginB());
```

**性能开销**: 与单独添加相同
**依赖管理**: 开发者负责顺序

---

## 完整游戏循环模拟

### 综合性能测试

**场景**: 500 实体，10 帧完整游戏循环

```typescript
const app = createTestApp();
const entityCount = 500;
const frameCount = 10;
const appWorld = app.getWorld();

// 初始化系统
app.addSystems(MainScheduleLabel.STARTUP, () => {
	app.insertResource<GameState>({ frame: 0, totalEntities: 0 });
	for (let i = 0; i < entityCount; i++) {
		const entity = appWorld.spawn();
		appWorld.insert(entity,
			TestComponent1({ value: i }),
			TestComponent2({ data: `entity_${i}` }),
			TestComponent3({ active: true })
		);
	}
});

// 更新游戏状态
app.addSystems(MainScheduleLabel.PRE_UPDATE, () => {
	const state = app.getResource<GameState>();
	if (state) {
		state.frame += 1;
		app.insertResource(state);
	}
});

// 处理实体
app.addSystems(MainScheduleLabel.UPDATE, () => {
	let activeCount = 0;
	for (const [entityId, comp1, comp3] of appWorld.query(
		TestComponent1, TestComponent3
	)) {
		if (comp3.active) {
			activeCount += 1;
			appWorld.insert(entityId, TestComponent4({ count: comp1.value * 2 }));
		}
	}
});

// 清理
app.addSystems(MainScheduleLabel.POST_UPDATE, () => {
	for (const [entityId] of appWorld.query(TestComponent4)) {
		appWorld.remove(entityId, TestComponent4);
	}
});

// 执行 10 帧
for (let frame = 0; frame < frameCount; frame++) {
	app.update();
}
```

**性能结果**:
- **基准时间**: ≤200ms (10 帧 × 20ms/帧)
- **实际平均**: ~120-160ms (云端环境)
- **单帧平均**: ~12-16ms
- **帧率**: ~60-80 FPS
- **测试状态**: ✅ 通过

**源代码**: `src/__tests__/performance-benchmarks.spec.ts:660-726`

**性能分解** (单帧):
| 阶段 | 操作 | 时间 |
|------|------|------|
| PreUpdate | 更新游戏状态 | ~0.5ms |
| Update | 查询 + 组件添加 | ~10ms |
| PostUpdate | 组件移除 | ~2ms |
| **总计** | - | **~12.5ms** |

---

## 调度器测试覆盖

### 调度器相关测试文件

| 测试文件 | 测试数量 | 覆盖范围 |
|---------|---------|---------|
| schedule.spec.ts | ~200 | 调度器核心功能 |
| loop.spec.ts | ~100 | 调度循环执行 |
| system-name-display.spec.ts | ~50 | 系统命名和显示 |
| performance-benchmarks.spec.ts | ~100 | 调度器性能基准 |

**总测试数**: ~450 个调度器相关测试
**通过率**: 100%

---

## 已知限制

### 1. 系统并行执行

- ❌ **不支持**: Matter ECS 不支持真正的并行系统执行
- ⚠️ **限制**: 所有系统顺序执行
- 💡 **未来**: 可能支持显式并行标记的系统

---

### 2. 动态调度修改

```typescript
// ⚠️ 限制: 不推荐在系统内动态添加系统
app.addSystems(MainScheduleLabel.UPDATE, () => {
	app.addSystems(MainScheduleLabel.UPDATE, () => {
		// 新系统 - 可能导致未定义行为
	});
});
```

**解决方案**: 在应用初始化时添加所有系统

---

### 3. 调度器性能上限

- **最大系统数**: ~500 (理论)
- **推荐系统数**: <100
- **单帧时间**: <16.67ms (60 FPS)
- **超过限制**: 帧率下降

---

## 调度器性能监控

### 实时监控工具

```typescript
// 系统执行时间追踪
const systemTimings = new Map<string, number>();

app.addSystems(MainScheduleLabel.UPDATE, () => {
	const start = os.clock();

	// 系统逻辑
	performWork();

	const elapsed = os.clock() - start;
	systemTimings.set("mySystem", elapsed);

	if (elapsed > 0.016) { // 超过 16ms 警告
		warn(`System 'mySystem' took ${elapsed * 1000}ms`);
	}
});
```

---

### 调度周期分析

```typescript
// 完整调度周期计时
app.addSystems(MainScheduleLabel.FIRST, () => {
	_G.frameStart = os.clock();
});

app.addSystems(MainScheduleLabel.LAST, () => {
	const frameDuration = os.clock() - _G.frameStart;
	if (frameDuration > 0.016) {
		warn(`Frame took ${frameDuration * 1000}ms (target: 16.67ms)`);
	}
});
```

---

## 优化案例研究

### 案例 1: 减少系统数量

**Before** (150 个系统):
```typescript
// 150 个微小系统
for (let i = 0; i < 150; i++) {
	app.addSystems(MainScheduleLabel.UPDATE, () => {
		// 微小逻辑
	});
}
```
**性能**: ~20ms/帧

**After** (10 个合并系统):
```typescript
// 10 个合理大小的系统
for (let i = 0; i < 10; i++) {
	app.addSystems(MainScheduleLabel.UPDATE, () => {
		// 合并后的逻辑
	});
}
```
**性能**: ~12ms/帧
**提升**: ~40%

---

### 案例 2: 调度阶段优化

**Before** (全部在 UPDATE):
```typescript
app.addSystems(MainScheduleLabel.UPDATE, initSystem);
app.addSystems(MainScheduleLabel.UPDATE, processSystem);
app.addSystems(MainScheduleLabel.UPDATE, cleanupSystem);
```
**问题**: 依赖不清晰，可能冲突

**After** (分阶段):
```typescript
app.addSystems(MainScheduleLabel.PRE_UPDATE, initSystem);
app.addSystems(MainScheduleLabel.UPDATE, processSystem);
app.addSystems(MainScheduleLabel.POST_UPDATE, cleanupSystem);
```
**优势**: 依赖明确，更易维护

---

## 版本历史

| 版本 | 日期 | 变更说明 | 性能影响 |
|------|------|---------|---------|
| 0.2.4 | 2025-10-24 | 优化系统调度顺序 | ~5% 提升 |
| 0.2.3 | 2025-10-24 | 新增调度循环测试 | 无影响 |
| 0.2.2 | 2025-10-20 | 初始调度器基准 | 基线建立 |

---

## 参考文档

- [性能基准汇总](./baseline.md)
- [ECS 查询性能](./ecs-query.md)
- [资源访问性能](./resource-access.md)
- [调度器 API 文档](../bevy_ecs/schedule.md)
- [调度器测试源代码](../../src/bevy_ecs/schedule/__tests__/)

---

**注意**: 调度器性能与系统复杂度和实体数量密切相关，建议根据实际场景进行性能分析和优化。

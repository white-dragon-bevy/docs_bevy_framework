# 系统节流(System Throttle)使用指南

## 概述

White Dragon Bevy 框架提供了完整的系统节流功能，允许你控制系统的运行频率。这对于优化性能、减少不必要的计算非常有用。

## 快速开始

### 基本用法：每秒运行一次

```typescript
import { App, BuiltinSchedules } from "bevy_app";
import { TimePlugin, Duration, on_timer } from "bevy_time";
import type { World, Context } from "bevy_ecs";

const app = App.create()
	.addPlugins(new TimePlugin());

// 创建节流条件
const timerCondition = on_timer(Duration.fromSecs(1));

// 在系统内检查条件
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (timerCondition(world)) {
		print("每秒执行一次");
	}
});

app.run();
```

## 可用的时间条件函数

### 1. 定时器条件

#### `on_timer(duration: Duration)`
每隔指定时间触发一次，使用虚拟时间（受时间缩放影响）。

```typescript
const condition = on_timer(Duration.fromSecs(2));
```

#### `on_real_timer(duration: Duration)`
每隔指定时间触发一次，使用真实时间（不受时间缩放影响）。

```typescript
const condition = on_real_timer(Duration.fromMillis(500));
```

### 2. 延迟执行条件

#### `once_after_delay(duration: Duration)`
延迟后执行一次，使用虚拟时间。

```typescript
const condition = once_after_delay(Duration.fromSecs(5));
```

#### `once_after_real_delay(duration: Duration)`
延迟后执行一次，使用真实时间。

```typescript
const condition = once_after_real_delay(Duration.fromSecs(3));
```

#### `repeating_after_delay(duration: Duration)`
延迟后持续执行，使用虚拟时间。

```typescript
const condition = repeating_after_delay(Duration.fromSecs(3));
```

#### `repeating_after_real_delay(duration: Duration)`
延迟后持续执行，使用真实时间。

```typescript
const condition = repeating_after_real_delay(Duration.fromSecs(2));
```

### 3. 暂停检测条件

#### `paused()`
当虚拟时间暂停时执行。

```typescript
const condition = paused();
```

## Duration 工具类

### 创建方法

```typescript
// 从秒创建
Duration.fromSecs(1.5)

// 从毫秒创建
Duration.fromMillis(500)

// 从微秒创建
Duration.fromMicros(500_000)

// 从纳秒创建
Duration.fromNanos(1_000_000)
```

## 实际应用场景

### 场景1：自动保存系统

```typescript
function autoSaveSystem(world: World): void {
	// 保存游戏数据
	print("自动保存...");
}

const saveCondition = on_timer(Duration.fromSecs(30));
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (saveCondition(world)) {
		autoSaveSystem(world, context);
	}
});
```

### 场景2：定期更新UI

```typescript
function updateUISystem(world: World): void {
	// 更新UI逻辑
}

const uiCondition = on_real_timer(Duration.fromMillis(100));
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (uiCondition(world)) {
		updateUISystem(world, context);
	}
});
```

### 场景3：游戏开始后显示教程

```typescript
function showTutorialSystem(world: World): void {
	print("显示新手教程");
}

const tutorialCondition = once_after_delay(Duration.fromSecs(5));
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (tutorialCondition(world)) {
		showTutorialSystem(world, context);
	}
});
```

### 场景4：延迟启动的定期任务

```typescript
function periodicCheckSystem(world: World): void {
	// 定期检查逻辑
}

const checkCondition = repeating_after_delay(Duration.fromSecs(3));
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (checkCondition(world)) {
		periodicCheckSystem(world, context);
	}
});
```

## 虚拟时间 vs 真实时间

### 虚拟时间（Virtual Time）
- 受游戏时间缩放影响
- 可以暂停
- 适合游戏逻辑相关的定时任务

```typescript
const condition = on_timer(Duration.fromSecs(1));
```

### 真实时间（Real Time）
- 不受时间缩放影响
- 不会暂停
- 适合UI更新、网络请求等不依赖游戏时间的任务

```typescript
const condition = on_real_timer(Duration.fromSecs(1));
```

## 多个系统共享条件

```typescript
const sharedCondition = on_timer(Duration.fromSecs(1));

// 系统1
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (sharedCondition(world)) {
		print("系统1执行");
	}
});

// 系统2
app.addSystems(BuiltinSchedules.UPDATE, (world: World) => {
	if (sharedCondition(world)) {
		print("系统2执行");
	}
});
```

## 重要说明

1. **精度限制**：节流不保证精确的间隔。如果 deltaTime 大于指定的 duration，系统只会运行一次。建议用于相对较大的时间间隔（> 0.1秒）。

2. **必须添加 TimePlugin**：所有时间条件都需要 `TimePlugin` 提供时间资源。

3. **条件状态管理**：条件状态会自动管理，但在测试环境中可以使用 `cleanupConditionStates()` 清理。

## 测试覆盖

框架包含 18 个全面的单元测试，覆盖以下场景：
- ✅ 基本节流功能
- ✅ 实际应用场景（自动保存、UI更新、教程显示等）
- ✅ Duration 工具类
- ✅ 虚拟时间 vs 真实时间
- ✅ 暂停检测
- ✅ 多系统共享条件
- ✅ 精度测试
- ✅ 延迟条件行为

测试文件：`src/bevy_time/__tests__/system-throttle-scenarios.spec.ts`

## 测试统计

- **总测试数**: 1854 个测试
- **通过率**: 100%
- **系统节流测试**: 18 个测试

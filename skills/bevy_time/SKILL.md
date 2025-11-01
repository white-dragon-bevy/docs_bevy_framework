---
name: bevy-time
description: White Dragon Bevy 的时间系统。当你需要获取 deltaTime、追踪游戏时间、使用 Timer/Stopwatch、控制时间缩放或暂停时间时使用。
---

# bevy_time - Rust Bevy 0.16 移植文档

本模块是 Rust Bevy 0.16 `bevy_time` crate 的 TypeScript 移植版本。假设您精通 Rust Bevy，本文档仅说明关键区别。

## 核心类型映射

| Rust | TypeScript | 说明 |
|------|-----------|------|
| `Time<T>` | `Time<T>` | 泛型时间类，字段完全对应 `time.rs:192-204` |
| `Real` | `Real` | 真实时间标记，对应 `real.rs` |
| `Virtual` | `Virtual` | 虚拟时间标记，对应 `virt.rs:74-79` |
| `Fixed` | `Fixed` | 固定时间步长，对应 `fixed.rs:69-72` |
| `std::time::Duration` | `Duration` | 自定义类，内部纳秒存储 |
| `Timer` | `Timer` | 完全对应 `timer.rs` |
| `Stopwatch` | `Stopwatch` | 完全对应 `stopwatch.rs` |
| `TimePlugin` | `TimePlugin` | 对应 `lib.rs:56-100` |

## 资源访问

### 方式 1: Context 扩展（推荐）

```typescript
// ✅ 推荐：通过 context 访问（懒加载 + 缓存）
const virtualTime = world.context.virtualTime;  // Rust: Res<Time<Virtual>>
const realTime = world.context.realTime;        // Rust: Res<Time<Real>>
const fixedTime = world.context.fixedTime;      // Rust: Res<Time<Fixed>>
const genericTime = world.context.genericTime;  // Rust: Res<Time>

// 其他时间相关资源
const frameCount = world.context.frameCount;    // 帧计数器
const timeStats = world.context.timeStats;      // 时间统计
```

### 方式 2: 直接获取资源

```typescript
// 传统方式：直接从 world 获取
const virtualTime = world.getResource<VirtualTime>();
const realTime = world.getResource<RealTime>();
const fixedTime = world.getResource<FixedTime>();
const genericTime = world.getResource<GenericTime>();
```

**性能提示**：如果在同一个系统中需要多次访问同一资源，推荐使用 context 方式，因为首次访问后会缓存结果。

## 主要差异

### 1. Duration API

**Rust**: 使用 `std::time::Duration`，方法返回值
**TypeScript**: 自定义类，所有方法返回新实例（不可变）

```typescript
// 创建
Duration.fromSecs(1)      // Duration::from_secs(1)
Duration.fromMillis(500)  // Duration::from_millis(500)

// 运算（返回新实例）
duration.add(other)             // duration + other
duration.saturatingSub(other)   // duration.saturating_sub(other)
duration.mul(2)                 // duration * 2
duration.div(2)                 // duration / 2

// 转换
duration.asSecs()          // duration.as_secs() as u64 -> number
duration.asSecsF32()       // duration.as_secs_f32()
duration.asSecsF64()       // duration.as_secs_f64()
duration.asMillis()        // duration.as_millis() as u128 -> number
```

### 2. Time<Virtual> 上下文访问

**Rust**: 直接调用方法
```rust
let mut time: ResMut<Time<Virtual>>;
time.pause();
time.set_relative_speed(2.0);
```

**TypeScript**: 通过 context 资源访问（v0.9.0+）
```typescript
// ✅ 推荐：通过 context 访问时间资源
const timeResource = world.context.timeResource;
timeResource.pause();
timeResource.setTimeScale(2.0);

// 或者直接访问虚拟时间
const virtualTime = world.context.virtualTime;
const deltaTime = virtualTime.deltaSeconds();
```

**旧方式**（仍然支持，但不推荐）:
```typescript
// 方法1: 修改上下文（对应 Rust 字段访问）
const virtualTime = world.getResource<VirtualTime>();
const ctx = virtualTime.getContext() as Virtual;
virtualTime.setContext({
    ...ctx,
    paused: true,
    effectiveSpeed: 0,
});
world.insertResource<VirtualTime>(virtualTime);
```

**原因**: TypeScript 无法在泛型类上添加条件方法，所以使用资源扩展提供便捷 API。

### 3. Fixed 时间步长

**Rust**: `RunFixedMainLoop` 系统 + `run_fixed_main_schedule`
**TypeScript**: `runFixedMainSchedule` 函数，逻辑完全对应

```typescript
// 默认 timestep = 15625 微秒 (64 Hz)
// 对应 Rust Time::<Fixed>::DEFAULT_TIMESTEP

// 注册系统到固定更新（完全一致）
app.addSystems(BuiltinSchedules.FIXED_MAIN, physicsSystem);
```

**实现**: 完全对应 `fixed.rs:239-252`

### 4. TimeUpdateStrategy

**Rust**:
```rust
pub enum TimeUpdateStrategy {
    Automatic,
    ManualInstant(Instant),
    ManualDuration(Duration),
}
```

**TypeScript**: 简化版本
```typescript
interface TimeUpdateStrategy {
    lastUpdate: number | undefined;  // os.clock() 时间戳
    mockDelta?: number;              // 测试用模拟增量
}
```

**差异原因**: Roblox 无 render world，无需 channel 通信（`TimeSender/TimeReceiver`）。

### 5. 运行条件

完全对应 `common_conditions.rs`:

| Rust | TypeScript |
|------|-----------|
| `on_timer(duration)` | `on_timer(duration)` |
| `on_real_timer(duration)` | `on_real_timer(duration)` |
| `once_after_delay(duration)` | `once_after_delay(duration)` |
| `repeating_after_delay(delay, interval)` | `repeating_after_delay(delay, interval)` |
| `paused()` | `paused()` |

**状态存储**: 使用 `WeakMap<SystemDescriptor, State>` 代替 Rust 的 `Local<>` 参数。

## Roblox 特有适配

### 1. 时间源

- **Real**: `os.clock()` (单调高精度时钟)
- **Virtual**: Real + 暂停/缩放
- **Fixed**: Virtual 累积 + 固定步长消耗

### 2. 禁止使用 yield

```typescript
// ❌ Matter 系统中不能使用
RunService.Heartbeat.Wait()
task.wait()

// ✅ 使用 os.clock() 计算差值
const start = os.clock();
// ...
const elapsed = os.clock() - start;
```

### 3. Context 扩展 API (非 Rust 原生)

`TimePluginResource` 提供便捷方法和统计，通过 `world.context.timeResource` 访问：

```typescript
// Context 扩展（v0.9.0+）
const timeResource = world.context.timeResource;

// 便捷查询
const deltaSeconds = timeResource.getDeltaSeconds();
const elapsedMillis = timeResource.getElapsedMillis();

// 时间控制（封装 Virtual 上下文修改）
timeResource.pause();
timeResource.resume();
timeResource.setTimeScale(2.0);  // 2倍速

// 统计信息（Roblox 特有）
const avgFPS = timeResource.getAverageFPS();
const minFrameTime = timeResource.getMinFrameTime();

// 测试工具
timeResource.advanceTime(1.0);  // 模拟前进 1 秒
```

**完整 API**:
```typescript
interface TimePluginResource {
    // 便捷查询
    getDeltaSeconds(): number;
    getElapsedMillis(): number;

    // 控制（封装 Virtual 上下文修改）
    pause(): void;
    resume(): void;
    setTimeScale(scale: number): void;

    // 统计（Roblox 特有）
    getAverageFPS(): number;
    getMinFrameTime(): number;

    // 测试工具
    advanceTime(seconds: number): void;
}
```

**访问所有时间资源**:
```typescript
// v0.9.0+ 通过 context 访问
const timeResource = world.context.timeResource;  // 时间控制
const virtualTime = world.context.virtualTime;    // 虚拟时间
const realTime = world.context.realTime;          // 真实时间
const fixedTime = world.context.fixedTime;        // 固定时间
const genericTime = world.context.genericTime;    // 通用时间
const frameCount = world.context.frameCount;      // 帧计数
const timeStats = world.context.timeStats;        // 时间统计
```

## API 速查表

### Time<T> 方法

| TypeScript | Rust |
|-----------|------|
| `advanceBy(delta)` | `advance_by(delta)` |
| `advanceTo(elapsed)` | `advance_to(elapsed)` |
| `getDelta()` | `delta()` |
| `getDeltaSecs()` | `delta_secs()` |
| `getDeltaSecsF64()` | `delta_secs_f64()` |
| `getElapsed()` | `elapsed()` |
| `getElapsedSecs()` | `elapsed_secs()` |
| `getElapsedSecsF64()` | `elapsed_secs_f64()` |
| `getElapsedWrapped()` | `elapsed_wrapped()` |
| `getWrapPeriod()` | `wrap_period()` |
| `setWrapPeriod(p)` | `set_wrap_period(p)` |
| `getContext()` | `context()` |
| `setContext(ctx)` | `context_mut()` 修改 |
| `asGeneric()` | `as_generic()` |

### Time<Virtual> 特有（通过上下文）

| TypeScript | Rust |
|-----------|------|
| `context.maxDelta` | `max_delta()` |
| `context.paused` | `is_paused()` |
| `context.relativeSpeed` | `relative_speed_f64()` |
| `context.effectiveSpeed` | `effective_speed_f64()` |
| 修改 context | `pause()` / `set_relative_speed()` |

### Time<Fixed> 特有（通过上下文）

| TypeScript | Rust |
|-----------|------|
| `context.timestep` | `timestep()` |
| `context.overstep` | `overstep()` |
| 修改 timestep | `set_timestep()` |

### Timer 方法（完全一致）

- `tick(delta)` ← `tick(delta)`
- `justFinished()` ← `just_finished()`
- `isFinished()` ← `finished()`
- `fraction()` ← `fraction()`
- `remainingSecs()` ← `remaining_secs()`
- `pause()` / `unpause()` / `reset()`
- `timesFinishedThisTick()` ← `times_finished_this_tick()`

## 常见陷阱

### 1. 重复计时器多次触发

```typescript
// ❌ 丢失触发
timer.tick(Duration.fromSecs(3.5));
if (timer.justFinished()) { /* 仅执行1次 */ }

// ✅ 处理所有触发
const times = timer.timesFinishedThisTick(); // 3
for (let i = 0; i < times; i++) { /* 执行3次 */ }
```

### 2. 浮点精度

```typescript
// ❌ 直接比较
if (timer.elapsedSecs() === 1.0) {}

// ✅ 使用 justFinished()
if (timer.justFinished()) {}
```

### 3. 时间类型选择

```typescript
// 游戏逻辑 → VirtualTime（受暂停影响）
// 网络同步 → RealTime（不受暂停影响）
// 物理模拟 → FixedTime（固定步长）
```

## 测试

```bash
npm test bevy_time      # 全部测试
npm test duration       # Duration 测试
npm test timer          # Timer 测试
npm test fixed          # Fixed 时间步长测试
```

## 源码位置

- **实现**: `src/bevy_time/`
- **测试**: `src/bevy_time/__tests__/`
- **Rust 原版**: `bevy-origin/crates/bevy_time/`

## 参考

- [Bevy Time 0.16 文档](https://docs.rs/bevy_time/0.16/bevy_time/)
- [Bevy Time 示例](https://github.com/bevyengine/bevy/tree/v0.16.0/examples/time)

## Context 扩展列表

bevy_time 提供以下 context 扩展（v0.9.0+）：

| Context 属性 | 类型 | 说明 |
|-------------|------|------|
| `timeResource` | `TimePluginResource` | 时间控制和统计 API |
| `virtualTime` | `VirtualTime` | 虚拟游戏时间（受暂停/缩放影响） |
| `realTime` | `RealTime` | 真实时间（不受暂停影响） |
| `fixedTime` | `FixedTime` | 固定时间步长 |
| `genericTime` | `GenericTime` | 通用时间接口 |
| `frameCount` | `FrameCountResource` | 帧计数器 |
| `timeStats` | `TimeStatsManager` | 时间统计管理器 |
| `timeUpdateStrategy` | `TimeUpdateStrategyResource` | 时间更新策略 |

**使用示例**:
```typescript
function gameSystem(world: World): void {
    // 获取 delta time
    const deltaTime = world.context.virtualTime.deltaSeconds();

    // 控制时间
    if (gamePaused) {
        world.context.timeResource.pause();
    }

    // 查看帧率
    const fps = world.context.timeResource.getAverageFPS();
    print(`FPS: ${fps}`);
}
```

---

**对应 Rust 版本**: Bevy 0.16
**最后更新**: 2025-10-31 (v0.9.0-alpha)

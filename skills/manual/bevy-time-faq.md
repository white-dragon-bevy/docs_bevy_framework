# Bevy Time 常见问题解答 (FAQ)

本文档收集了开发者在使用 bevy_time 模块时常遇到的问题和解决方案。

## 基础问题

### Q: 如何在系统中获取时间增量？

**A**: 使用时间资源获取帧时间增量：

```typescript
import { VirtualTimeResource } from "bevy_time";

function mySystem(world: World) {
    // 从资源系统获取时间
    const timeResource = world.getResource<VirtualTimeResource>();
    if (!timeResource) return;

    const time = timeResource.value;
    const deltaTime = time.getDelta(); // Duration
    const deltaSeconds = time.getDeltaSecs(); // number (f32)
    const deltaSecondsF64 = time.getDeltaSecsF64(); // number (f64)
}
```

### Q: Real、Virtual 和 Fixed 时间有什么区别？

**A**: 三种时间类型用途不同：

- **Real 时间**: 真实物理时间，不受游戏暂停影响，用于网络同步、性能分析
- **Virtual 时间**: 游戏逻辑时间，支持暂停和时间缩放，用于游戏逻辑、动画
- **Fixed 时间**: 固定时间步长，用于物理模拟、确定性计算

```typescript
// Real 时间始终前进
const realTime = world.getResource<RealTimeResource>()?.value;

// Virtual 时间可以暂停
const virtualTime = world.getResource<VirtualTimeResource>()?.value;
virtualTime.pause(); // 暂停游戏时间

// Fixed 时间以固定间隔更新
const fixedTime = world.getResource<FixedTimeResource>()?.value;
const timestep = fixedTime.timestep(); // 固定时间步长
```

### Q: 如何暂停和恢复游戏时间？

**A**: 使用 TimePlugin 提供的扩展方法：

```typescript
// 通过 App 扩展
app.pause();
app.resume();
app.isPaused();

// 设置时间缩放
app.setTimeScale(0.5); // 慢动作
app.setTimeScale(2.0); // 快进
```

## Timer 相关问题

### Q: 为什么我的计时器不触发？

**A**: 检查以下几点：

1. **是否调用了 tick()？** 计时器需要手动更新：

```typescript
// 错误示例
const timer = new Timer(Duration.fromSecs(1), TimerMode.Once);
// 没有调用 tick，计时器永远不会前进

// 正确示例
function updateSystem(world: World) {
    const deltaTime = getTimeDelta();
    timer.tick(deltaTime); // 必须调用

    if (timer.justFinished()) {
        print("计时器触发！");
    }
}
```

2. **计时器是否被暂停？**

```typescript
if (timer.isPaused()) {
    timer.unpause();
}
```

3. **是否是一次性计时器已经完成？**

```typescript
if (timer.isFinished() && timer.mode() === TimerMode.Once) {
    timer.reset(); // 重置后才能再次使用
}
```

### Q: 如何实现精确的倒计时？

**A**: 使用 Timer 并正确处理时间增量：

```typescript
class Countdown {
    private timer: Timer;

    constructor(seconds: number) {
        this.timer = Timer.fromSeconds(seconds, TimerMode.Once);
    }

    update(deltaTime: Duration): number {
        this.timer.tick(deltaTime);
        return math.max(0, this.timer.remainingSecs());
    }

    isFinished(): boolean {
        return this.timer.isFinished();
    }
}
```

### Q: 重复计时器为什么一帧内触发多次？

**A**: 当时间增量大于计时器持续时间时，重复计时器会在一帧内完成多次：

```typescript
const timer = Timer.fromSeconds(1, TimerMode.Repeating);

// 如果 deltaTime = 3.0秒
timer.tick(Duration.fromSecs(3.0));
print(timer.timesFinishedThisTick()); // 输出: 3

// 解决方案：限制最大时间增量
const maxDelta = Duration.fromSecs(0.1);
const clampedDelta = deltaTime.lessThan(maxDelta) ? deltaTime : maxDelta;
timer.tick(clampedDelta);
```

## 时间精度问题

### Q: Duration 的 f32 和 f64 版本有什么区别？

**A**: 精度不同：

- `asSecsF32()`: 32位浮点，约6-9位有效数字，适合一般游戏逻辑
- `asSecsF64()`: 64位浮点，约15-17位有效数字，适合精确计算

```typescript
const duration = Duration.fromSecs(123456.789);

// f32 可能有精度损失
const f32 = duration.asSecsF32(); // 可能是 123456.79

// f64 保持精度
const f64 = duration.asSecsF64(); // 123456.789
```

### Q: 如何避免浮点数累积误差？

**A**: 定期重置计时器或使用固定时间步长：

```typescript
// 方法1：定期重置
let accumulator = Duration.ZERO;
const resetInterval = Duration.fromSecs(100);

accumulator = accumulator.add(deltaTime);
if (accumulator.greaterThan(resetInterval)) {
    accumulator = accumulator.saturatingSub(resetInterval);
}

// 方法2：使用固定时间步长
const fixedTimestep = Duration.fromSecs(1/60);
while (accumulator.greaterThanOrEqual(fixedTimestep)) {
    updatePhysics(fixedTimestep);
    accumulator = accumulator.saturatingSub(fixedTimestep);
}
```

## 性能问题

### Q: 创建太多 Timer 对象会影响性能吗？

**A**: 是的，频繁创建对象会增加 GC 压力。建议使用对象池：

```typescript
class TimerPool {
    private pool: Timer[] = [];

    acquire(duration: Duration, mode: TimerMode): Timer {
        const timer = this.pool.pop() || new Timer(duration, mode);
        timer.setDuration(duration);
        timer.setMode(mode);
        timer.reset();
        return timer;
    }

    release(timer: Timer): void {
        timer.pause();
        this.pool.push(timer);
    }
}
```

### Q: 如何优化大量的时间检查？

**A**: 批量更新或使用时间调度器：

```typescript
// 批量更新
class TimerManager {
    private timers: Timer[] = [];

    updateAll(deltaTime: Duration): void {
        for (const timer of this.timers) {
            timer.tick(deltaTime);
        }
    }
}

// 使用调度器，避免每帧检查
class TimeScheduler {
    private events: Array<{ time: Duration; callback: () => void }> = [];

    schedule(at: Duration, callback: () => void): void {
        this.events.push({ time: at, callback });
        this.events.sort((a, b) => a.time.compare(b.time));
    }

    update(currentTime: Duration): void {
        while (this.events.size() > 0 && this.events[0].time.lessThanOrEqual(currentTime)) {
            const event = this.events.remove(0);
            event.callback();
        }
    }
}
```

## 调试技巧

### Q: 如何调试时间相关问题？

**A**: 使用日志和时间戳：

```typescript
class TimeDebugger {
    private logs: Array<{ time: number; message: string }> = [];

    log(message: string): void {
        this.logs.push({
            time: os.clock(),
            message
        });
    }

    printHistory(): void {
        for (const log of this.logs) {
            print(`[${log.time.toFixed(3)}] ${log.message}`);
        }
    }
}

// 使用
const debugger = new TimeDebugger();
debugger.log("系统启动");

function updateSystem(deltaTime: Duration) {
    debugger.log(`更新: delta=${deltaTime.asSecsF64()}`);
    // ...
}
```

### Q: 如何测试时间相关的代码？

**A**: 使用模拟时间：

```typescript
// 使用 advanceTime 进行测试
import { advanceTime } from "bevy_time";

// 测试代码
const app = new App();
app.addPlugin(TimePlugin);

// 推进时间
advanceTime(app, 1.0); // 前进1秒
app.update();

// 使用假时间进行单元测试
class FakeTime {
    private currentTime = 0;

    tick(delta: number): number {
        this.currentTime += delta;
        return this.currentTime;
    }

    getCurrentTime(): number {
        return this.currentTime;
    }
}
```

## 迁移问题

### Q: 从 Roblox 的 wait() 迁移需要注意什么？

**A**: `wait()` 是协程，而 Timer 是基于帧更新的：

```typescript
// Roblox 风格
spawn(function() {
    wait(1);
    doSomething();
});

// Bevy Time 风格
const timer = new Timer(Duration.fromSecs(1), TimerMode.Once);
function updateSystem(delta: Duration) {
    timer.tick(delta);
    if (timer.justFinished()) {
        doSomething();
    }
}
```

### Q: 如何实现类似 WaitForSeconds 的功能？

**A**: 使用 Timer 或延迟条件：

```typescript
// 方法1：使用 Timer
class Coroutine {
    private timers: Array<Timer> = [];

    waitFor(seconds: number): Promise<void> {
        return new Promise(resolve => {
            const timer = Timer.fromSeconds(seconds, TimerMode.Once);
            this.timers.push(timer);

            const check = () => {
                if (timer.isFinished()) {
                    resolve();
                } else {
                    // 下一帧继续检查
                    setTimeout(check, 16);
                }
            };
            check();
        });
    }
}

// 方法2：使用延迟条件
app.addSystem(
    "Update",
    delayedAction,
    { runCondition: once_after_delay(Duration.fromSecs(1)) }
);
```

## 常见陷阱

### Q: 为什么时间在不同机器上不一致？

**A**: 可能的原因：

1. **帧率不同**: 使用固定时间步长保证一致性

```typescript
// 不一致的代码
position = position.add(velocity.mul(deltaTime));

// 一致的代码
const fixedDelta = Duration.fromSecs(1/60);
position = position.add(velocity.mul(fixedDelta));
```

2. **使用 Real 时间**: 游戏逻辑应该使用 Virtual 时间

```typescript
// 错误：使用真实时间
const realTime = world.getResource<RealTimeResource>()?.value;

// 正确：使用虚拟时间
const virtualTime = world.getResource<VirtualTimeResource>()?.value;
```

### Q: 如何处理时间跳跃（如加载、卡顿）？

**A**: 限制最大时间增量：

```typescript
const MAX_DELTA = Duration.fromSecs(0.1); // 最大100ms

function updateSystem(deltaTime: Duration) {
    // 限制时间增量
    const clampedDelta = deltaTime.lessThan(MAX_DELTA) ? deltaTime : MAX_DELTA;

    // 使用限制后的时间增量
    updateGameLogic(clampedDelta);
}
```

## 最佳实践总结

1. **使用合适的时间类型**
   - 游戏逻辑 → Virtual 时间
   - 物理模拟 → Fixed 时间
   - 网络同步 → Real 时间

2. **避免累积误差**
   - 定期重置计时器
   - 使用固定时间步长
   - 选择合适的精度（f32 vs f64）

3. **性能优化**
   - 使用对象池
   - 批量更新
   - 避免频繁创建对象

4. **调试友好**
   - 添加日志
   - 使用模拟时间测试
   - 监控帧率和时间增量

5. **错误处理**
   - 限制最大时间增量
   - 检查时间有效性
   - 处理异常情况

通过遵循这些最佳实践，你可以避免大多数时间相关的常见问题，创建稳定、可靠的游戏系统。
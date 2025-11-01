# Bevy Time 模块使用指南

## 概述

Bevy Time 模块是 Bevy 游戏引擎的时间管理系统，提供了精确的时间跟踪、计时器、秒表和固定时间步长功能。本模块完全对应 Rust Bevy 的 `bevy_time` crate，并针对 Roblox 环境进行了优化。

### 设计理念

- **类型安全**：使用 TypeScript 泛型系统确保时间类型的正确使用
- **精度保证**：支持纳秒级精度的时间计算
- **性能优化**：避免不必要的内存分配和计算
- **易于使用**：提供简洁的 API 和丰富的工具函数

### 与 Rust Bevy Time 的对应关系

| Rust Bevy | TypeScript Bevy | 说明 |
|-----------|----------------|------|
| `std::time::Duration` | `Duration` | 时间长度表示 |
| `Timer` | `Timer` | 计时器类 |
| `Stopwatch` | `Stopwatch` | 秒表类 |
| `Time<T>` | `Time<T>` | 通用时间管理类 |
| `Time<Real>` | `Time<Real>` | 真实物理时间 |
| `Time<Virtual>` | `Time<Virtual>` | 虚拟游戏时间 |
| `Time<Fixed>` | `TimeFixed` | 固定时间步长 |
| `TimePlugin` | `TimePlugin` | 时间管理插件 |

### 在 Roblox 环境中的特殊性

- 使用 `os.clock()` 获取高精度时间
- 自动处理时间回绕和异常情况
- 集成 Matter ECS 系统进行资源管理
- 支持客户端/服务端环境的时间同步

## 核心概念

### 时间类型

Bevy Time 提供三种不同的时间类型，每种都有特定的用途：

#### 1. Real 时间（真实时间）

```typescript
import { RealTime, Real } from "bevy_time";

// Real 时间代表真实的物理时间，不受游戏状态影响
// 适用于：真实世界计时、网络同步、性能分析
```

特点：
- 不受暂停影响
- 不支持时间缩放
- 始终以真实速度推进

#### 2. Virtual 时间（虚拟时间）

```typescript
import { VirtualTime, Virtual } from "bevy_time";

// Virtual 时间代表游戏逻辑时间
// 适用于：游戏逻辑、动画、UI计时
```

特点：
- 支持暂停/恢复
- 支持时间缩放（慢动作、快进）
- 可设置最大时间增量防止跳跃

#### 3. Fixed 时间（固定时间）

```typescript
import { FixedTime, TimeFixed } from "bevy_time";

// Fixed 时间以固定间隔更新
// 适用于：物理模拟、网络预测、确定性计算
```

特点：
- 固定的更新频率（如 60Hz）
- 累积时间并批量消耗
- 保证确定性的更新间隔

### Duration 类的使用

`Duration` 类表示时间长度，提供纳秒级精度：

```typescript
import { Duration } from "bevy_time";

// 创建 Duration
const oneSecond = Duration.fromSecs(1);
const halfSecond = Duration.fromMillis(500);
const microSecond = Duration.fromMicros(1000);
const nanoSecond = Duration.fromNanos(1);

// 获取不同单位的值
oneSecond.asSecs();        // 1
oneSecond.asMillis();      // 1000
oneSecond.asMicros();      // 1_000_000
oneSecond.asNanos();       // 1_000_000_000

// 时间运算
const sum = oneSecond.add(halfSecond);      // 1.5秒
const diff = oneSecond.saturatingSub(halfSecond); // 0.5秒
const scaled = oneSecond.mul(2);            // 2秒

// 时间比较
oneSecond.greaterThan(halfSecond);           // true
oneSecond.lessThanOrEqual(Duration.fromSecs(2)); // true
```

### 时间资源和插件系统

TimePlugin 自动注册以下资源：

```typescript
import { App } from "bevy_app";
import { TimePlugin } from "bevy_time";

const app = new App();
app.addPlugin(TimePlugin);

// 可用的时间资源
// - RealTimeResource: 真实时间资源
// - VirtualTimeResource: 虚拟时间资源
// - FixedTimeResource: 固定时间资源
// - GenericTimeResource: 通用时间资源（默认为 Virtual）
// - TimeUpdateStrategyResource: 时间更新策略
// - FrameCountResource: 帧计数器
```

## Timer 类使用指南

Timer 是一个功能强大的计时器，支持一次性和重复模式。

### 创建计时器

```typescript
import { Timer, TimerMode } from "bevy_time";
import { Duration } from "bevy_time";

// 创建一次性计时器（5秒后触发）
const oneShotTimer = new Timer(
    Duration.fromSecs(5),
    TimerMode.Once
);

// 创建重复计时器（每1秒触发一次）
const repeatingTimer = new Timer(
    Duration.fromSecs(1),
    TimerMode.Repeating
);

// 便捷创建方法
const timerFromSeconds = Timer.fromSeconds(2.5, TimerMode.Once);
```

### 计时器模式

#### Once 模式（一次性）

```typescript
const timer = new Timer(Duration.fromSecs(3), TimerMode.Once);

// 在系统更新中
function updateSystem(world: World) {
    const delta = getTimeDelta(); // 获取帧时间

    timer.tick(delta);

    if (timer.justFinished()) {
        // 计时器刚完成，执行一次性操作
        print("计时器触发！");
        // 可以选择重置计时器
        timer.reset();
    }
}
```

#### Repeating 模式（重复）

```typescript
const timer = new Timer(Duration.fromSecs(0.5), TimerMode.Repeating);

function updateSystem(world: World) {
    const delta = getTimeDelta();

    timer.tick(delta);

    // 检查是否在当前帧完成
    if (timer.justFinished()) {
        // 可能一帧内完成多次（如果时间跳跃）
        const times = timer.timesFinishedThisTick();
        for (let i = 0; i < times; i++) {
            // 执行重复操作
            spawnEffect();
        }
    }

    // 获取进度
    const progress = timer.fraction(); // 0.0 到 1.0
    const remaining = timer.remainingSecs(); // 剩余秒数
}
```

### 暂停、恢复和重置

```typescript
const timer = new Timer(Duration.fromSecs(10), TimerMode.Repeating);

// 暂停计时器
timer.pause();
print(timer.isPaused()); // true

// 暂停状态下，tick 不会推进时间
timer.tick(Duration.fromSecs(1));
print(timer.elapsedSecs()); // 仍然是 0

// 恢复计时器
timer.unpause();
print(timer.isPaused()); // false

// 重置计时器（不影响暂停状态）
timer.reset();
print(timer.elapsedSecs()); // 0
print(timer.isFinished()); // false
```

### 进度查询和完成检测

```typescript
const timer = new Timer(Duration.fromSecs(5), TimerMode.Once);

// 进度查询（0.0 到 1.0）
const progress = timer.fraction(); // 0.0 = 未开始，1.0 = 完成
const remaining = timer.fractionRemaining(); // 1.0 - progress

// 时间查询
const elapsed = timer.elapsedSecs(); // 已经过的秒数
const remainingSecs = timer.remainingSecs(); // 剩余秒数

// 完成检测
if (timer.isFinished()) {
    // 计时器已完成（包括之前完成的）
}

if (timer.justFinished()) {
    // 计时器刚在本次 tick 中完成
}
```

### 实用示例

#### 倒计时系统

```typescript
class CountdownSystem {
    private countdownTimer: Timer;

    constructor() {
        // 创建30秒倒计时
        this.countdownTimer = new Timer(
            Duration.fromSecs(30),
            TimerMode.Once
        );
    }

    update(delta: Duration) {
        this.countdownTimer.tick(delta);

        const remaining = this.countdownTimer.remainingSecs();

        // 显示倒计时
        updateUI({
            minutes: math.floor(remaining / 60),
            seconds: math.floor(remaining % 60),
        });

        if (this.countdownTimer.justFinished()) {
            onCountdownComplete();
        }
    }

    pause() {
        this.countdownTimer.pause();
    }

    resume() {
        this.countdownTimer.unpause();
    }

    addTime(seconds: number) {
        // 增加时间
        const newDuration = this.countdownTimer.getDuration()
            .add(Duration.fromSecs(seconds));
        this.countdownTimer.setDuration(newDuration);
    }
}
```

#### 技能冷却系统

```typescript
class SkillCooldownManager {
    private cooldowns: Map<string, Timer> = new Map();

    // 注册技能冷却
    registerSkill(skillId: string, cooldownSeconds: number) {
        const timer = new Timer(
            Duration.fromSecs(cooldownSeconds),
            TimerMode.Once
        );
        this.cooldowns.set(skillId, timer);
    }

    // 使用技能
    useSkill(skillId: string): boolean {
        const timer = this.cooldowns.get(skillId);
        if (!timer || timer.isFinished()) {
            // 技能可用，使用并开始冷却
            timer.reset();
            return true;
        }
        return false;
    }

    // 更新所有冷却
    update(delta: Duration) {
        for (const [skillId, timer] of this.cooldowns) {
            timer.tick(delta);
        }
    }

    // 获取冷却进度
    getCooldownProgress(skillId: string): number {
        const timer = this.cooldowns.get(skillId);
        if (!timer) return 1.0;
        return timer.fraction();
    }

    // 获取剩余时间
    getRemainingTime(skillId: string): number {
        const timer = this.cooldowns.get(skillId);
        if (!timer) return 0;
        return timer.remainingSecs();
    }
}
```

## Stopwatch 类使用指南

Stopwatch 是一个简单的秒表，用于测量经过的时间。

### 秒表的基本使用

```typescript
import { Stopwatch } from "bevy_time";
import { Duration } from "bevy_time";

// 创建秒表
const stopwatch = new Stopwatch();

// 初始状态
print(stopwatch.elapsedSecs()); // 0
print(stopwatch.isPaused()); // false

// 推进时间
stopwatch.tick(Duration.fromSecs(2.5));
print(stopwatch.elapsedSecs()); // 2.5

// 继续推进
stopwatch.tick(Duration.fromSecs(1.5));
print(stopwatch.elapsedSecs()); // 4.0
```

### 性能测量应用

```typescript
class PerformanceProfiler {
    private stopwatches: Map<string, Stopwatch> = new Map();

    // 开始测量
    startMeasure(name: string) {
        const stopwatch = new Stopwatch();
        this.stopwatches.set(name, stopwatch);
    }

    // 结束测量
    endMeasure(name: string): Duration {
        const stopwatch = this.stopwatches.get(name);
        if (!stopwatch) {
            error(`No measurement started for: ${name}`);
        }

        // 返回当前经过的时间
        return stopwatch.elapsed();
    }

    // 测量函数执行时间
    measureFunction<T>(name: string, fn: () => T): T {
        this.startMeasure(name);
        const result = fn();
        const duration = this.endMeasure(name);

        print(`${name} took: ${duration.asMillis()}ms`);
        return result;
    }
}

// 使用示例
const profiler = new PerformanceProfiler();

// 测量代码块执行时间
profiler.startMeasure("calculation");
// ... 执行一些计算
const duration = profiler.endMeasure("calculation");

// 测量函数执行时间
const result = profiler.measureFunction("heavy_computation", () => {
    // 执行密集计算
    return expensiveCalculation();
});
```

### 暂停和恢复机制

```typescript
const stopwatch = new Stopwatch();

// 正常计时
stopwatch.tick(Duration.fromSecs(1));
print(stopwatch.elapsedSecs()); // 1

// 暂停秒表
stopwatch.pause();
stopwatch.tick(Duration.fromSecs(1));
print(stopwatch.elapsedSecs()); // 仍然是 1

// 恢复计时
stopwatch.unpause();
stopwatch.tick(Duration.fromSecs(1));
print(stopwatch.elapsedSecs()); // 2

// 暂停状态下设置经过时间
stopwatch.pause();
stopwatch.setElapsed(Duration.fromSecs(5));
print(stopwatch.elapsedSecs()); // 5
```

### 实用示例

#### 帧率监控器

```typescript
class FPSMonitor {
    private frameStopwatch: Stopwatch;
    private frameCount = 0;
    private updateInterval = Duration.fromSecs(1);

    constructor() {
        this.frameStopwatch = new Stopwatch();
    }

    update(delta: Duration) {
        this.frameStopwatch.tick(delta);
        this.frameCount++;

        // 每秒更新一次FPS
        if (this.frameStopwatch.elapsed().greaterThanOrEqual(this.updateInterval)) {
            const fps = this.frameCount / this.frameStopwatch.elapsedSecs();
            print(`FPS: ${fps.toFixed(2)}`);

            // 重置计数器
            this.frameCount = 0;
            this.frameStopwatch.reset();
        }
    }
}
```

#### 游戏会话计时器

```typescript
class GameSessionTimer {
    private sessionStopwatch: Stopwatch;
    private isPaused = false;

    constructor() {
        this.sessionStopwatch = new Stopwatch();
    }

    // 开始新会话
    startNewSession() {
        this.sessionStopwatch.reset();
        this.sessionStopwatch.unpause();
        this.isPaused = false;
    }

    // 暂停会话
    pauseSession() {
        this.sessionStopwatch.pause();
        this.isPaused = true;
    }

    // 恢复会话
    resumeSession() {
        this.sessionStopwatch.unpause();
        this.isPaused = false;
    }

    // 获取会话时间
    getSessionTime(): Duration {
        return this.sessionStopwatch.elapsed();
    }

    // 格式化显示时间
    getFormattedTime(): string {
        const totalSeconds = this.sessionStopwatch.elapsedSecs();
        const hours = math.floor(totalSeconds / 3600);
        const minutes = math.floor((totalSeconds % 3600) / 60);
        const seconds = math.floor(totalSeconds % 60);

        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    update(delta: Duration) {
        if (!this.isPaused) {
            this.sessionStopwatch.tick(delta);
        }
    }
}
```

## Common Conditions 使用指南

Common Conditions 提供了基于时间的系统运行条件，让你可以控制系统何时执行。

### 系统运行条件

```typescript
import { System, Conditions } from "bevy_ecs";
import { commonConditions } from "bevy_time";

// 每帧运行（默认条件）
function updateSystem() {
    // 每帧执行的逻辑
}

// 每 N 帧运行一次
const every2Frames = commonConditions.every(2);
const every5Frames = commonConditions.every(5);

// 每秒运行一次
const everySecond = commonConditions.every(Duration.fromSecs(1));

// 每 0.5 秒运行一次
const everyHalfSecond = commonConditions.every(Duration.fromMillis(500));
```

### 定时执行模式

```typescript
// 在特定时间间隔运行
app.addSystem(
    BuiltinSchedules.UPDATE,
    cleanupSystem,
    // 每 10 秒清理一次
    commonConditions.every(Duration.fromSecs(10))
);

// 在固定更新中运行
app.addSystem(
    BuiltinSchedules.FIXED_UPDATE,
    physicsSystem,
    // 固定时间步长，每物理帧运行
    commonConditions.fixed()
);

// 条件组合使用
app.addSystem(
    BuiltinSchedules.UPDATE,
    saveSystem,
    // 游戏未暂停且每 30 秒保存一次
    commonConditions
        .not(commonConditions.paused())
        .and(commonConditions.every(Duration.fromSecs(30)))
);
```

### 条件组合使用

```typescript
import { commonConditions } from "bevy_time";

// 组合条件
const condition = commonConditions
    .every(Duration.fromSecs(1))        // 每秒
    .and(commonConditions.notPaused())  // 且未暂停
    .and(commonConditions.after(Duration.fromSecs(5))); // 且5秒后

// 使用组合条件
app.addSystem(
    BuiltinSchedules.UPDATE,
    scheduledTask,
    condition
);

// 其他常用条件
commonConditions.onStartup();     // 仅在启动时运行一次
commonConditions.onResume();      // 从暂停恢复时运行
commonConditions.onPause();       // 暂停时运行
commonConditions.changed();       // 资源变化时运行
commonConditions.RESOURCE_CHANGED; // 特定资源变化时运行
```

## 固定时间步长系统

固定时间步长对于物理模拟和确定性计算至关重要。

### 物理模拟应用

```typescript
import { System } from "bevy_ecs";
import { FixedTimeResource } from "bevy_time";

// 物理系统 - 在固定更新调度中运行
const physicsSystem: System = (world) => {
    const fixedTime = world.getResource<FixedTimeResource>();
    if (!fixedTime) return;

    const timestep = fixedTime.value.timestep();

    // 获取所有物理实体
    const physicsBodies = world.query(Position, Velocity, Mass);

    for (const [position, velocity, mass] of physicsBodies) {
        // 使用固定时间步长进行物理计算
        const acceleration = force.div(mass.value);
        velocity.value = velocity.value.add(acceleration.mul(timestep.asSecsF64()));
        position.value = position.value.add(velocity.value.mul(timestep.asSecsF64()));
    }
};

// 注册到固定更新调度
app.addSystems(BuiltinSchedules.FIXED_MAIN, physicsSystem);
```

### 固定更新循环

```typescript
class FixedUpdateLoop {
    private accumulator = Duration.ZERO;
    private fixedTimestep = Duration.fromSecs(1 / 60); // 60Hz

    update(deltaTime: Duration) {
        // 累积时间
        this.accumulator = this.accumulator.add(deltaTime);

        // 消耗累积的时间
        while (this.accumulator.greaterThanOrEqual(this.fixedTimestep)) {
            // 执行固定更新
            this.fixedUpdate(this.fixedTimestep);

            // 减去一个时间步长
            this.accumulator = this.accumulator.saturatingSub(this.fixedTimestep);
        }

        // 可选：插值渲染
        const alpha = this.accumulator.asSecsF64() / this.fixedTimestep.asSecsF64();
        this.render(alpha);
    }

    private fixedUpdate(timestep: Duration) {
        // 固定步长的物理和游戏逻辑
        updatePhysics(timestep);
        updateGameLogic(timestep);
    }

    private render(alpha: number) {
        // 使用插值值进行平滑渲染
        renderInterpolated(alpha);
    }
}
```

### 与可变时间的协调

```typescript
class HybridTimeSystem {
    private timeScale = 1.0;
    private maxDeltaTime = Duration.fromSecs(0.1);

    update(realDelta: Duration) {
        // 应用时间缩放
        const scaledDelta = Duration.fromSecsF64(
            realDelta.asSecsF64() * this.timeScale
        );

        // 限制最大时间增量
        const clampedDelta = scaledDelta.lessThan(this.maxDeltaTime)
            ? scaledDelta
            : this.maxDeltaTime;

        // 更新可变时间系统
        this.updateVariableTimeSystems(clampedDelta);

        // 更新固定时间系统
        this.updateFixedTimeSystems(clampedDelta);
    }

    private updateVariableTimeSystems(delta: Duration) {
        // 动画、粒子效果等
        updateAnimations(delta);
        updateParticles(delta);
        updateAudio(delta);
    }

    private updateFixedTimeSystems(delta: Duration) {
        // 物理模拟
        const physicsSteps = Math.floor(delta.asSecsF64() / (1/60));
        for (let i = 0; i < physicsSteps; i++) {
            updatePhysics(Duration.fromSecs(1/60));
        }
    }
}
```

## 集成示例

### 游戏循环实现

```typescript
import { App } from "bevy_app";
import { TimePlugin, Timer, TimerMode } from "bevy_time";
import { System } from "bevy_ecs";

class Game {
    private app: App;

    constructor() {
        this.app = new App();

        // 添加时间插件
        this.app.addPlugin(TimePlugin);

        // 添加游戏系统
        this.setupGameSystems();
    }

    private setupGameSystems() {
        // 输入系统 - 每帧运行
        this.app.addSystem(BuiltinSchedules.UPDATE, this.inputSystem);

        // 逻辑系统 - 每帧运行
        this.app.addSystem(BuiltinSchedules.UPDATE, this.logicSystem);

        // 物理系统 - 固定更新 (60Hz)
        this.app.addSystem(BuiltinSchedules.FIXED_MAIN, this.physicsSystem);

        // 渲染系统 - 每帧运行
        this.app.addSystem(BuiltinSchedules.UPDATE, this.renderSystem);
    }

    private inputSystem: System = (world) => {
        const time = world.getResource<VirtualTimeResource>();
        if (!time) return;

        // 使用时间增量处理输入
        const delta = time.value.getDelta();
        processInput(delta);
    };

    private logicSystem: System = (world) => {
        const time = world.getResource<VirtualTimeResource>();
        if (!time) return;

        // 游戏逻辑更新
        updateGameLogic(time.value.getDelta());
    };

    private physicsSystem: System = (world) => {
        const fixedTime = world.getResource<FixedTimeResource>();
        if (!fixedTime) return;

        // 物理更新使用固定时间步长
        updatePhysics(fixedTime.value.timestep());
    };

    private renderSystem: System = (world) => {
        const time = world.getResource<VirtualTimeResource>();
        if (!time) return;

        // 渲染使用插值时间
        renderFrame(time.value.getDelta());
    };

    run() {
        // 启动游戏循环
        this.app.run();
    }
}
```

### 技能冷却系统（完整实现）

```typescript
import { Component, World, Query } from "@rbxts/matter";
import { Timer, TimerMode, Duration } from "bevy_time";

// 组件定义
interface Skill {
    id: string;
    name: string;
    cooldown: Duration;
    manaCost: number;
}

interface Cooldown {
    timer: Timer;
}

interface CanCast {
    value: boolean;
}

// 系统
class SkillSystem {
    // 使用技能
    static useSkill(world: World, skillId: string, caster: Entity): boolean {
        // 查询技能和冷却
        const [skill, cooldown] = world.get(caster, Skill, Cooldown);

        if (!skill || skill.id !== skillId) {
            return false;
        }

        // 检查冷却
        if (cooldown && !cooldown.timer.isFinished()) {
            const remaining = cooldown.timer.remainingSecs();
            print(`技能冷却中，还需 ${remaining.toFixed(1)} 秒`);
            return false;
        }

        // 检查法力值
        const mana = world.get(caster, Mana);
        if (!mana || mana.value < skill.manaCost) {
            print("法力值不足");
            return false;
        }

        // 消耗法力
        mana.value -= skill.manaCost;
        world.insert(caster, mana);

        // 施放技能
        this.castSkill(skill, caster);

        // 开始冷却
        const cooldownTimer = new Timer(skill.cooldown, TimerMode.Once);
        cooldownTimer.tick(Duration.ZERO); // 初始化
        world.insert(caster, new Cooldown(cooldownTimer));

        // 更新可施放状态
        world.insert(caster, new CanCast(false));

        return true;
    }

    // 更新所有冷却
    static updateCooldowns(world: World, deltaTime: Duration) {
        const cooldownQuery = world.query(Cooldown, CanCast);

        for (const [cooldown, canCast] of cooldownQuery) {
            cooldown.timer.tick(deltaTime);

            // 检查冷却是否完成
            if (cooldown.timer.justFinished() && !canCast.value) {
                world.insert(entity, new CanCast(true));
                print("技能冷却完成！");
            }
        }
    }

    private static castSkill(skill: Skill, caster: Entity) {
        print(`施放技能: ${skill.name}`);
        // 实际的技能效果逻辑
    }
}

// 使用示例
const world = new World();

// 添加玩家组件
const player = world.spawn();
world.insert(player, new Skill("fireball", "火球术", Duration.fromSecs(5), 30));
world.insert(player, new Mana(100));
world.insert(player, new CanCast(true));

// 游戏循环中更新
function gameLoop(deltaTime: Duration) {
    // 更新技能冷却
    SkillSystem.updateCooldowns(world, deltaTime);

    // 处理输入
    if (input.isPressed("1")) {
        SkillSystem.useSkill(world, "fireball", player);
    }
}
```

### 动画计时控制

```typescript
class AnimationController {
    private animations: Map<string, Animation> = new Map();
    private activeAnimations: Array<ActiveAnimation> = [];

    // 注册动画
    registerAnimation(id: string, frames: number, duration: Duration) {
        const animation = new Animation(frames, duration);
        this.animations.set(id, animation);
    }

    // 播放动画
    playAnimation(entityId: string, animationId: string, loop = false): boolean {
        const animation = this.animations.get(animationId);
        if (!animation) return false;

        const activeAnimation = new ActiveAnimation(
            entityId,
            animation,
            loop ? TimerMode.Repeating : TimerMode.Once
        );

        this.activeAnimations.push(activeAnimation);
        return true;
    }

    // 更新所有动画
    update(deltaTime: Duration) {
        for (let i = this.activeAnimations.size() - 1; i >= 0; i--) {
            const anim = this.activeAnimations[i];
            anim.timer.tick(deltaTime);

            // 计算当前帧
            const frame = math.floor(anim.timer.fraction() * anim.animation.frames);
            this.updateAnimationFrame(anim.entityId, frame);

            // 检查是否完成
            if (anim.timer.justFinished() && !anim.timer.isPaused()) {
                if (anim.mode === TimerMode.Once) {
                    // 移除完成的动画
                    this.activeAnimations.remove(i);
                    this.onAnimationComplete(anim.entityId, anim.animation);
                }
            }
        }
    }

    // 暂停动画
    pauseAnimation(entityId: string) {
        for (const anim of this.activeAnimations) {
            if (anim.entityId === entityId) {
                anim.timer.pause();
            }
        }
    }

    // 恢复动画
    resumeAnimation(entityId: string) {
        for (const anim of this.activeAnimations) {
            if (anim.entityId === entityId) {
                anim.timer.unpause();
            }
        }
    }

    private updateAnimationFrame(entityId: string, frame: number) {
        // 更新实体动画帧
        setAnimationFrame(entityId, frame);
    }

    private onAnimationComplete(entityId: string, animation: Animation) {
        // 动画完成回调
        print(`Animation ${animation.id} completed for entity ${entityId}`);
    }
}

// 辅助类
class Animation {
    constructor(
        public id: string,
        public frames: number,
        public duration: Duration
    ) {}
}

class ActiveAnimation {
    constructor(
        public entityId: string,
        public animation: Animation,
        public mode: TimerMode
    ) {
        this.timer = new Timer(animation.duration, mode);
        this.timer.tick(Duration.ZERO);
    }

    timer: Timer;
}
```

### 倒计时功能

```typescript
class CountdownManager {
    private countdowns: Map<string, Countdown> = new Map();

    // 创建倒计时
    createCountdown(id: string, duration: Duration, onComplete?: () => void) {
        const countdown = new Countdown(duration, onComplete);
        this.countdowns.set(id, countdown);
        return countdown;
    }

    // 更新所有倒计时
    update(deltaTime: Duration) {
        for (const [id, countdown] of this.countdowns) {
            countdown.update(deltaTime);

            if (countdown.isFinished()) {
                // 移除完成的倒计时
                this.countdowns.delete(id);
            }
        }
    }

    // 获取倒计时状态
    getCountdown(id: string): Countdown | undefined {
        return this.countdowns.get(id);
    }

    // 暂停所有倒计时
    pauseAll() {
        for (const countdown of this.countdowns.values()) {
            countdown.pause();
        }
    }

    // 恢复所有倒计时
    resumeAll() {
        for (const countdown of this.countdowns.values()) {
            countdown.resume();
        }
    }
}

class Countdown {
    private timer: Timer;
    private onCompleteCallback?: () => void;

    constructor(duration: Duration, onComplete?: () => void) {
        this.timer = new Timer(duration, TimerMode.Once);
        this.onCompleteCallback = onComplete;
    }

    update(deltaTime: Duration) {
        this.timer.tick(deltaTime);

        if (this.timer.justFinished() && this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    get remainingTime(): Duration {
        return this.timer.remaining();
    }

    get progress(): number {
        return this.timer.fraction();
    }

    get isFinished(): boolean {
        return this.timer.isFinished();
    }

    pause() {
        this.timer.pause();
    }

    resume() {
        this.timer.unpause();
    }

    reset(newDuration?: Duration) {
        if (newDuration) {
            this.timer.setDuration(newDuration);
        }
        this.timer.reset();
    }
}

// 使用示例
const countdownManager = new CountdownManager();

// 创建5秒倒计时
countdownManager.createCountdown(
    "match_start",
    Duration.fromSecs(5),
    () => {
        print("比赛开始！");
        startMatch();
    }
);

// 在游戏循环中更新
function update(deltaTime: Duration) {
    countdownManager.update(deltaTime);

    // 显示倒计时
    const countdown = countdownManager.getCountdown("match_start");
    if (countdown) {
        const remaining = countdown.remainingTime.asSecs();
        updateCountdownUI(remaining);
    }
}
```

## 最佳实践

### 性能优化建议

1. **避免频繁创建 Duration 对象**

```typescript
// 不好的做法
function update() {
    const delta = Duration.fromSecs(1/60); // 每帧创建
    // ...
}

// 好的做法
const FRAME_DURATION = Duration.fromSecs(1/60); // 预创建
function update() {
    const delta = FRAME_DURATION;
    // ...
}
```

2. **使用对象池管理 Timer**

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

    release(timer: Timer) {
        timer.pause();
        timer.reset();
        this.pool.push(timer);
    }
}
```

3. **批量更新计时器**

```typescript
// 将多个计时器集中管理
class TimerManager {
    private timers: Timer[] = [];

    addTimer(timer: Timer) {
        this.timers.push(timer);
    }

    updateAll(delta: Duration) {
        for (const timer of this.timers) {
            timer.tick(delta);
        }
    }
}
```

### 常见陷阱和解决方案

1. **时间精度问题**

```typescript
// 避免直接比较浮点数
if (timer.elapsedSecs() === 1.0) { } // 不好的做法

// 使用容差比较
const EPSILON = 0.0001;
if (math.abs(timer.elapsedSecs() - 1.0) < EPSILON) { } // 好的做法
```

2. **时间跳跃处理**

```typescript
// TimePlugin 自动处理时间跳跃
// 如果需要手动处理：
const MAX_DELTA = Duration.fromSecs(0.1);
function updateSystem(delta: Duration) {
    const clampedDelta = delta.lessThan(MAX_DELTA) ? delta : MAX_DELTA;
    // 使用 clampedDelta
}
```

3. **暂停状态的一致性**

```typescript
// 确保所有相关系统响应暂停状态
function updateSystem(world: World) {
    const virtualTime = world.getResource<VirtualTimeResource>();
    if (!virtualTime || virtualTime.value.getContext().paused) {
        return; // 系统响应暂停
    }
    // 正常更新逻辑
}
```

### 时间精度注意事项

1. **使用适当的精度**

```typescript
// 对于游戏逻辑，f32 通常足够
const gameDelta = time.getDeltaSecs(); // f32

// 对于精确计算，使用 f64
const physicsDelta = time.getDeltaSecsF64(); // f64
```

2. **避免累积误差**

```typescript
// 定期重置计时器以避免累积误差
if (frameCount % 60 === 0) {
    periodicTimer.reset();
}
```

3. **网络同步考虑**

```typescript
// 对于网络游戏，使用服务器时间
class NetworkTimeSync {
    private serverTimeOffset = 0;

    getServerTime(): Duration {
        const localTime = os.clock();
        const serverTime = localTime + this.serverTimeOffset;
        return Duration.fromSecsF64(serverTime);
    }

    syncWithServer(serverTimestamp: number) {
        const localTime = os.clock();
        this.serverTimeOffset = serverTimestamp - localTime;
    }
}
```

## 迁移指南

### 从其他时间系统迁移

#### 从 Roblox 的 wait() 迁移

```typescript
// 旧代码
wait(1);
doSomething();

// 使用 Bevy Time
const timer = new Timer(Duration.fromSecs(1), TimerMode.Once);
function updateSystem(delta: Duration) {
    timer.tick(delta);
    if (timer.justFinished()) {
        doSomething();
    }
}
```

#### 从 tick() 迁移

```typescript
// 旧代码
while (true) {
    tick();
    update();
}

// 使用 Bevy Time
app.addSystem(BuiltinSchedules.UPDATE, updateSystem);
```

#### 从 Unity 协程迁移

```typescript
// Unity 协程
function StartCoroutine(WaitForSeconds(1)) {
    yield return new WaitForSeconds(1);
    DoAction();
}

// Bevy Time 实现
class CoroutineSystem {
    private timers: Array<{ timer: Timer; action: () => void }> = [];

    StartCoroutine(seconds: number, action: () => void) {
        const timer = new Timer(Duration.fromSecs(seconds), TimerMode.Once);
        this.timers.push({ timer, action });
    }

    update(delta: Duration) {
        for (let i = this.timers.size() - 1; i >= 0; i--) {
            const { timer, action } = this.timers[i];
            timer.tick(delta);

            if (timer.justFinished()) {
                action();
                this.timers.remove(i);
            }
        }
    }
}
```

### 常见 API 对比

| Roblox | Unity | Bevy Time |
|--------|-------|------------|
| `wait()` | `WaitForSeconds` | `Timer` |
| `tick()` | `Time.deltaTime` | `time.getDelta()` |
| `time()` | `Time.time` | `time.getElapsed()` |
| `workspace.DistributedGameTime` | `Time.fixedTime` | `fixedTime.getElapsed()` |
| `RunService.Heartbeat:Wait()` | `Coroutine` | `Timer/Stopwatch` |

## API 参考

### Duration 类

完整的 API 文档请参考：[src/bevy_time/duration.ts](../../src/bevy_time/duration.ts)

主要方法：
- `fromSecs(seconds: number): Duration`
- `fromMillis(millis: number): Duration`
- `fromNanos(nanos: number): Duration`
- `asSecs(): number`
- `asMillis(): number`
- `asNanos(): number`
- `add(other: Duration): Duration`
- `saturatingSub(other: Duration): Duration`
- `mul(factor: number): Duration`
- `div(divisor: number): Duration`

### Timer 类

完整的 API 文档请参考：[src/bevy_time/timer.ts](../../src/bevy_time/timer.ts)

主要方法：
- `constructor(duration: Duration, mode: TimerMode)`
- `tick(delta: Duration): Timer`
- `isFinished(): boolean`
- `justFinished(): boolean`
- `elapsed(): Duration`
- `remaining(): Duration`
- `fraction(): number`
- `pause(): void`
- `unpause(): void`
- `reset(): void`

### Stopwatch 类

完整的 API 文档请参考：[src/bevy_time/stopwatch.ts](../../src/bevy_time/stopwatch.ts)

主要方法：
- `constructor()`
- `tick(delta: Duration): Stopwatch`
- `elapsed(): Duration`
- `elapsedSecs(): number`
- `pause(): void`
- `unpause(): void`
- `reset(): void`
- `isPaused(): boolean`

### Time 类

完整的 API 文档请参考：[src/bevy_time/time.ts](../../src/bevy_time/time.ts)

主要方法：
- `advanceBy(delta: Duration): void`
- `getDelta(): Duration`
- `getElapsed(): Duration`
- `getDeltaSecs(): number`
- `getElapsedSecs(): number`
- `setWrapPeriod(period: Duration): void`

### TimeFixed 类

完整的 API 文档请参考：[src/bevy_time/fixed.ts](../../src/bevy_time/fixed.ts)

主要方法：
- `timestep(): Duration`
- `setTimestep(timestep: Duration): void`
- `setTimestepSeconds(seconds: number): void`
- `setTimestepHz(hz: number): void`
- `accumulate(delta: Duration): void`
- `expend(): boolean`

### TimePlugin 类

完整的 API 文档请参考：[src/bevy_time/time-plugin.ts](../../src/bevy_time/time-plugin.ts)

主要方法：
- `pause(): void`
- `resume(): void`
- `setTimeScale(scale: number): void`
- `getTimeScale(): number`
- `advanceTime(seconds: number): void`
- `reset(): void`

## 总结

Bevy Time 模块提供了完整的时间管理解决方案，适用于各种游戏开发场景。通过合理使用不同的时间类型和工具类，可以实现精确的游戏逻辑、物理模拟和动画控制。

### 关键要点

1. **选择合适的时间类型**：
   - Real 时间用于真实世界计时
   - Virtual 时间用于游戏逻辑
   - Fixed 时间用于物理模拟

2. **合理使用计时器**：
   - Timer 用于事件触发
   - Stopwatch 用于性能测量

3. **注意性能优化**：
   - 避免频繁创建对象
   - 使用对象池
   - 批量更新

4. **处理边界情况**：
   - 时间跳跃
   - 暂停状态
   - 网络同步

通过遵循这些指南，你可以充分利用 Bevy Time 模块的功能，创建稳定、高效的游戏系统。
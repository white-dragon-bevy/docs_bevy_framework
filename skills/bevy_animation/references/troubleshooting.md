# bevy_animation 故障排查与最佳实践

本文档提供 `bevy_animation` 的最佳实践指南和常见问题解决方案。

## 目录

- [最佳实践](#最佳实践)
- [常见陷阱](#常见陷阱)
- [性能优化](#性能优化)
- [调试技巧](#调试技巧)
- [FAQ](#faq)

## 最佳实践

### 1. 总是添加 AnimationPlayer 组件

✅ **推荐做法：**

```typescript
// 同时添加 Config 和 Player
const entity = world.spawn(
	RobloxInstance({ instance: character }),
	AnimationConfig(createAnimationConfig(animations)),
	AnimationPlayer({ tracks: new Map() })  // 显式添加空的 Player
);
```

**原因：**
- 明确表达意图，代码更易理解
- 避免依赖系统自动创建
- 减少系统开销

❌ **避免：**

```typescript
// 只添加 Config，依赖系统自动创建 Player
const entity = world.spawn(
	RobloxInstance({ instance: character }),
	AnimationConfig(createAnimationConfig(animations))
	// 缺少 AnimationPlayer
);
```

### 2. 检查动画轨道是否存在

✅ **推荐做法：**

```typescript
// 安全访问
const track = player.tracks.get("Run");
if (track) {
	track.Play();
}

// 或者使用可选链
player.tracks.get("Run")?.Play();
```

**原因：**
- 避免运行时错误
- 处理动画可能未加载的情况
- 代码更健壮

❌ **避免：**

```typescript
// 假设动画总是存在
const track = player.tracks.get("Run")!;
track.Play();  // 如果动画不存在会报错
```

### 3. 使用淡入淡出避免突兀切换

✅ **推荐做法：**

```typescript
// 平滑过渡
function smoothTransition(
	player: AnimationPlayer,
	fromName: string,
	toName: string
): void {
	const fromTrack = player.tracks.get(fromName);
	const toTrack = player.tracks.get(toName);

	if (fromTrack) fromTrack.Stop(0.2);  // 0.2 秒淡出
	if (toTrack) toTrack.Play(0.2);      // 0.2 秒淡入
}
```

**原因：**
- 视觉效果更自然
- 避免动作突兀
- 提升用户体验

❌ **避免：**

```typescript
// 立即切换（视觉突兀）
fromTrack?.Stop();
toTrack?.Play();
```

### 4. 缓存常用的动画轨道引用

✅ **推荐做法：**

```typescript
// 缓存引用减少查找
class CharacterAnimator {
	private idleTrack?: AnimationTrack;
	private runTrack?: AnimationTrack;

	constructor(player: AnimationPlayer) {
		this.idleTrack = player.tracks.get("Idle");
		this.runTrack = player.tracks.get("Run");
	}

	playIdle(): void {
		this.idleTrack?.Play(0.2);
	}

	playRun(): void {
		this.runTrack?.Play(0.2);
	}
}
```

**原因：**
- 减少 Map 查找开销
- 提升运行时性能
- 代码更清晰

❌ **避免：**

```typescript
// 频繁查找（性能浪费）
function update(player: AnimationPlayer): void {
	player.tracks.get("Idle")?.Play();  // 每帧查找
	player.tracks.get("Run")?.Stop();   // 每帧查找
}
```

### 5. 清理动画事件连接

✅ **推荐做法：**

```typescript
// 管理事件连接
class AnimationEventManager {
	private connections: Array<RBXScriptConnection> = [];

	setupEvents(track: AnimationTrack): void {
		const connection = track.Ended.Connect(() => {
			// 处理事件
		});
		this.connections.push(connection);
	}

	cleanup(): void {
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections = [];
	}
}
```

**原因：**
- 避免内存泄漏
- 防止事件堆积
- 资源正确释放

⚠️ **警告：**

```typescript
// 忘记断开连接会导致内存泄漏
track.Ended.Connect(() => {
	// 这个连接永远不会被清理
});
```

### 6. 使用动画优先级

✅ **推荐做法：**

```typescript
// 设置合适的优先级
function setupPriorities(player: AnimationPlayer): void {
	player.tracks.get("Idle")!.Priority = Enum.AnimationPriority.Idle;
	player.tracks.get("Walk")!.Priority = Enum.AnimationPriority.Movement;
	player.tracks.get("Attack")!.Priority = Enum.AnimationPriority.Action;
}
```

**原因：**
- 确保重要动画不被覆盖
- 控制动画播放顺序
- 实现正确的动画层级

## 常见陷阱

### 1. 忘记添加 Humanoid 或 Animator

❌ **错误示例：**

```typescript
// Model 没有 Humanoid 或 Animator
const model = new Instance("Model");
// 系统无法加载动画
```

**问题：** 动画加载需要 `Animator` 或 `Humanoid` 组件。

✅ **正确做法：**

```typescript
// 确保 Model 有 Humanoid 或 Animator
const model = new Instance("Model");
const humanoid = new Instance("Humanoid");
humanoid.Parent = model;

// 或者添加 Animator
const animator = new Instance("Animator");
animator.Parent = model;
```

**检测方法：**

```typescript
function checkAnimationSupport(model: Model): boolean {
	const hasHumanoid = model.FindFirstChildOfClass("Humanoid") !== undefined;
	const hasAnimator = model.FindFirstChildOfClass("Animator") !== undefined;

	if (!hasHumanoid && !hasAnimator) {
		warn(`Model ${model.Name} 缺少 Humanoid 或 Animator`);
		return false;
	}

	return true;
}
```

### 2. 动画 ID 格式错误

❌ **错误示例：**

```typescript
// 缺少 rbxassetid:// 前缀
const config = createAnimationConfig(new Map([
	["Idle", "507766666"]  // 错误格式
]));
```

**问题：** Roblox 需要完整的资产 URL 格式。

✅ **正确做法：**

```typescript
// 完整的资产 URL
const config = createAnimationConfig(new Map([
	["Idle", "rbxassetid://507766666"]
]));
```

**验证函数：**

```typescript
function validateAnimationId(animationId: string): boolean {
	const pattern = "^rbxassetid://%d+$";
	const [match] = animationId.match(pattern);

	if (!match) {
		warn(`无效的动画 ID 格式: ${animationId}`);
		return false;
	}

	return true;
}
```

### 3. 在动画加载前尝试播放

❌ **错误示例：**

```typescript
// 立即播放（动画可能还没加载）
const entity = world.spawn(
	RobloxInstance({ instance: character }),
	AnimationConfig(createAnimationConfig(animations)),
	AnimationPlayer({ tracks: new Map() })
);

const [player] = world.get(entity, AnimationPlayer);
player.tracks.get("Idle")?.Play();  // tracks 还是空的
```

**问题：** 动画加载是异步的，需要等待一帧。

✅ **正确做法：**

```typescript
// 等待下一帧或检查是否加载
function playWhenReady(world: World, entity: number): void {
	const [player] = world.get(entity, AnimationPlayer);

	if (player && player.tracks.size() > 0) {
		player.tracks.get("Idle")?.Play();
	} else {
		// 动画还未加载，等待下一帧
		print("动画正在加载中...");
	}
}
```

**系统化解决方案：**

```typescript
function safePlayAnimationSystem(world: World): void {
	for (const [entity, player, readyMarker] of world.query(
		AnimationPlayer,
		AnimationReadyMarker
	)) {
		// 检查动画是否已加载
		if (player.tracks.size() > 0) {
			// 播放默认动画
			player.tracks.get("Idle")?.Play(0.2);

			// 移除标记，避免重复播放
			world.remove(entity, AnimationReadyMarker);
		}
	}
}
```

### 4. 重复加载动画

⚠️ **注意事项：**

系统会自动移除 `AnimationConfig` 避免重复加载。如果需要重新加载，需要重新添加 `AnimationConfig`。

❌ **错误做法：**

```typescript
// 尝试手动加载（绕过系统）
const animator = character.FindFirstChildOfClass("Animator");
const animation = new Instance("Animation");
animation.AnimationId = "rbxassetid://123456";
const track = animator?.LoadAnimation(animation);
```

**问题：** 绕过 ECS 系统管理，难以追踪和维护。

✅ **正确做法：**

```typescript
// 使用系统管理
world.insert(entity, AnimationConfig(createAnimationConfig(newAnimations)));
```

### 5. 混淆动画实例和动画轨道

❌ **错误理解：**

```typescript
// Animation 是资产，AnimationTrack 是运行时对象
const animation = new Instance("Animation");
animation.AnimationId = "rbxassetid://123456";
// animation.Play();  // 错误！Animation 没有 Play 方法
```

**概念区分：**
- `Animation` - 动画资产（配置）
- `AnimationTrack` - 动画轨道（运行时播放对象）

✅ **正确理解：**

```typescript
// 1. Animation 是资产定义
const animation = new Instance("Animation");
animation.AnimationId = "rbxassetid://123456";

// 2. AnimationTrack 是加载后的运行时对象
const animator = character.FindFirstChildOfClass("Animator");
const track = animator?.LoadAnimation(animation);

// 3. 使用 AnimationTrack 控制播放
track?.Play();
```

### 6. 权重和优先级的混淆

⚠️ **重要区别：**

```typescript
// Weight（权重）：控制动画混合的强度（0-1）
track.AdjustWeight(0.5);  // 50% 强度

// Priority（优先级）：控制动画播放的优先级
track.Priority = Enum.AnimationPriority.Action;
```

**工作原理：**
- **优先级**：高优先级动画会覆盖低优先级动画
- **权重**：控制同优先级动画的混合比例

**示例：**

```typescript
// 场景：角色一边走路一边瞄准
const walkTrack = player.tracks.get("Walk");
const aimTrack = player.tracks.get("Aim");

// 设置优先级
walkTrack!.Priority = Enum.AnimationPriority.Movement;
aimTrack!.Priority = Enum.AnimationPriority.Action;  // 更高

// 设置权重
walkTrack!.Play(0.2);
walkTrack!.AdjustWeight(0.6);  // 走路占 60%

aimTrack!.Play(0.2);
aimTrack!.AdjustWeight(0.4);   // 瞄准占 40%
```

## 性能优化

### 1. 减少动画轨道查找

**问题：** 频繁的 Map 查找消耗性能。

**解决方案：** 缓存动画轨道引用。

```typescript
// 每帧查找（慢）
function slowUpdate(player: AnimationPlayer): void {
	const track = player.tracks.get("Idle");  // 每帧查找
	track?.Play();
}

// 缓存引用（快）
class FastController {
	private cachedTrack: AnimationTrack | undefined;

	constructor(player: AnimationPlayer) {
		this.cachedTrack = player.tracks.get("Idle");  // 只查找一次
	}

	update(): void {
		this.cachedTrack?.Play();  // 直接使用
	}
}
```

### 2. 批量操作

**问题：** 逐个操作实体效率低。

**解决方案：** 使用批量查询和操作。

```typescript
// 批量更新动画状态
function batchUpdateAnimations(world: World, targetAnimation: string): void {
	for (const [entity, player] of world.query(AnimationPlayer)) {
		const track = player.tracks.get(targetAnimation);
		track?.Play(0.2);
	}
}
```

### 3. 避免不必要的状态更新

**问题：** 每帧重新插入相同的组件浪费资源。

**解决方案：** 只在状态真正改变时更新。

```typescript
// 低效（每帧更新）
function inefficientUpdate(world: World, entity: number, state: State): void {
	world.insert(entity, state);  // 每帧都插入
}

// 高效（仅在改变时更新）
function efficientUpdate(
	world: World,
	entity: number,
	oldState: State,
	newState: State
): void {
	if (newState !== oldState) {  // 只在改变时更新
		world.insert(entity, newState);
	}
}
```

### 4. 事件监听优化

**问题：** 重复添加事件监听导致内存泄漏。

**解决方案：** 使用事件管理器并及时清理。

```typescript
class OptimizedEventManager {
	private connections = new Map<string, RBXScriptConnection>();

	addEvent(name: string, track: AnimationTrack, callback: () => void): void {
		// 如果已存在，先断开旧连接
		const existing = this.connections.get(name);
		if (existing) {
			existing.Disconnect();
		}

		// 添加新连接
		const connection = track.Ended.Connect(callback);
		this.connections.set(name, connection);
	}

	cleanup(): void {
		for (const connection of this.connections.values()) {
			connection.Disconnect();
		}
		this.connections.clear();
	}
}
```

## 调试技巧

### 1. 日志调试

```typescript
function debugAnimationState(player: AnimationPlayer): void {
	print("=== 动画状态 ===");
	print(`已加载动画数量: ${player.tracks.size()}`);

	for (const [name, track] of player.tracks) {
		print(`- ${name}:`);
		print(`  播放中: ${track.IsPlaying}`);
		print(`  时间: ${track.TimePosition}/${track.Length}`);
		print(`  速度: ${track.Speed}`);
		print(`  权重: ${track.WeightCurrent}`);
	}
}
```

### 2. 可视化调试

```typescript
function visualizeAnimationState(world: World): void {
	for (const [entity, player] of world.query(AnimationPlayer)) {
		const activeAnimations: Array<string> = [];

		for (const [name, track] of player.tracks) {
			if (track.IsPlaying) {
				activeAnimations.push(name);
			}
		}

		print(`实体 ${entity} 正在播放: ${activeAnimations.join(", ")}`);
	}
}
```

### 3. 断言检查

```typescript
function assertAnimationLoaded(
	player: AnimationPlayer,
	animationName: string
): void {
	assert(
		player.tracks.has(animationName),
		`动画 '${animationName}' 未加载`
	);

	const track = player.tracks.get(animationName)!;

	assert(track !== undefined, `动画轨道 '${animationName}' 为空`);
	assert(track.Length > 0, `动画 '${animationName}' 长度为 0`);
}
```

### 4. 性能监控

```typescript
class AnimationPerformanceMonitor {
	private startTime = 0;

	startMeasure(): void {
		this.startTime = os.clock();
	}

	endMeasure(label: string): void {
		const duration = os.clock() - this.startTime;
		if (duration > 0.001) {  // 超过 1ms 记录
			warn(`${label} 耗时: ${duration * 1000}ms`);
		}
	}
}

// 使用
const monitor = new AnimationPerformanceMonitor();
monitor.startMeasure();
// ... 执行动画操作
monitor.endMeasure("动画加载");
```

## FAQ

### Q: 为什么我的动画不播放？

**可能原因：**
1. Model 缺少 `Humanoid` 或 `Animator`
2. 动画 ID 格式错误
3. 动画还未加载完成
4. 动画优先级被覆盖

**检查清单：**
- [ ] Model 有 Humanoid 或 Animator
- [ ] 使用 `rbxassetid://` 前缀
- [ ] 检查 `player.tracks.size() > 0`
- [ ] 检查 `track.IsPlaying` 状态

### Q: 如何检测动画是否加载完成？

```typescript
function isAnimationLoaded(player: AnimationPlayer): boolean {
	return player.tracks.size() > 0;
}

// 使用
if (isAnimationLoaded(player)) {
	player.tracks.get("Idle")?.Play();
}
```

### Q: 如何实现动画循环？

动画循环由动画资产本身控制，不需要代码处理：

```typescript
// 在 Roblox Studio 的动画编辑器中设置循环
// 或通过 AnimationTrack 属性访问
const track = player.tracks.get("Idle");
print(`动画是否循环: ${track?.Looped}`);
```

### Q: 如何停止所有动画？

```typescript
function stopAllAnimations(player: AnimationPlayer, fadeTime: number = 0.2): void {
	for (const track of player.tracks.values()) {
		if (track.IsPlaying) {
			track.Stop(fadeTime);
		}
	}
}
```

### Q: 动画事件何时触发？

```typescript
// Ended: 动画播放完成
// Stopped: 动画被停止（主动或结束）
// DidLoop: 动画循环时
// MarkerReached: 到达自定义标记

track.Ended.Connect(() => {
	// 非循环动画播放完成时触发
});

track.Stopped.Connect(() => {
	// 调用 Stop() 或自然结束时都会触发
});
```

### Q: 如何实现动画队列？

```typescript
class AnimationQueue {
	private queue: Array<string> = [];
	private currentIndex = 0;
	private player: AnimationPlayer;

	constructor(player: AnimationPlayer) {
		this.player = player;
	}

	addAnimation(name: string): void {
		this.queue.push(name);
	}

	start(): void {
		this.playNext();
	}

	private playNext(): void {
		if (this.currentIndex >= this.queue.size()) {
			print("队列播放完成");
			return;
		}

		const animationName = this.queue[this.currentIndex];
		const track = this.player.tracks.get(animationName);

		if (track) {
			track.Play(0.2);
			track.Ended.Connect(() => {
				this.currentIndex++;
				this.playNext();
			});
		}
	}
}
```

## 相关链接

- **[SKILL.md](../SKILL.md)** - 核心工作流程
- **[api-reference.md](./api-reference.md)** - 完整 API 文档
- **[examples.md](./examples.md)** - 代码示例

# bevy_animation API 参考

本文档提供 `bevy_animation` 的完整 API 参考和详细说明。

## 组件 API

### AnimationConfig

配置需要加载的动画资产。

```typescript
const AnimationConfig = component<{
	readonly animations: Map<string, string>;
}>("AnimationConfig");
```

**类型参数：**
- `animations: Map<string, string>` - 动画名称到资产 ID 的映射表

**用途：**
- 声明实体需要的动画
- 提供动画资产 ID（格式：`rbxassetid://数字ID`）
- 触发自动加载流程

**生命周期：**
- 添加到实体后，系统会在下一帧自动加载动画
- 加载完成后，系统会自动移除此组件，避免重复加载
- 如需重新加载，需要重新添加此组件

**示例：**

```typescript
const config = AnimationConfig({
	animations: new Map([
		["Idle", "rbxassetid://507766666"],
		["Walk", "rbxassetid://507777826"],
		["Run", "rbxassetid://507767714"],
		["Jump", "rbxassetid://507765000"],
	])
});
```

### AnimationPlayer

存储已加载的动画轨道，提供动画播放能力。

```typescript
const AnimationPlayer = component<{
	readonly tracks: Map<string, AnimationTrack>;
}>("AnimationPlayer");
```

**类型参数：**
- `tracks: Map<string, AnimationTrack>` - 动画名称到 AnimationTrack 实例的映射表

**特点：**
- 直接存储 Roblox `AnimationTrack` 引用
- 可直接调用原生 `AnimationTrack` API
- 零性能开销，无额外封装

**使用：**

```typescript
// 创建空的 AnimationPlayer
const player = AnimationPlayer({ tracks: new Map() });

// 访问动画轨道
const [playerComponent] = world.get(entity, AnimationPlayer);
const idleTrack = playerComponent.tracks.get("Idle");

// 调用原生 API
idleTrack?.Play(0.2);
```

## 辅助函数 API

### createAnimationConfig

创建 `AnimationConfig` 组件数据的辅助函数。

```typescript
function createAnimationConfig(
	animations: Map<string, string>
): { readonly animations: Map<string, string> }
```

**参数：**
- `animations: Map<string, string>` - 动画名称到资产 ID 的映射

**返回值：**
- `AnimationConfig` 组件数据对象

**示例：**

```typescript
import { createAnimationConfig } from "bevy_animation";

const configData = createAnimationConfig(new Map([
	["Attack1", "rbxassetid://123456"],
	["Attack2", "rbxassetid://234567"],
	["Attack3", "rbxassetid://345678"],
]));

world.spawn(
	RobloxInstance({ instance: character }),
	AnimationConfig(configData),
	AnimationPlayer({ tracks: new Map() })
);
```

## AnimationTrack API（Roblox 原生）

`AnimationPlayer.tracks` 存储的是 Roblox 原生 `AnimationTrack` 对象，可以直接使用所有原生 API。

### 播放控制

```typescript
// 播放动画
track.Play(
	fadeTime?: number,        // 淡入时间（秒），默认 0.1
	weight?: number,          // 权重，默认 1.0
	speed?: number            // 播放速度，默认 1.0
): void;

// 停止动画
track.Stop(
	fadeTime?: number         // 淡出时间（秒），默认 0.1
): void;
```

**示例：**

```typescript
// 快速播放（0.1 秒淡入）
track.Play();

// 平滑播放（0.3 秒淡入）
track.Play(0.3);

// 慢动作播放（0.5 倍速）
track.Play(0.2, 1.0, 0.5);

// 平滑停止
track.Stop(0.2);
```

### 属性访问

```typescript
// 只读属性
track.IsPlaying: boolean;           // 是否正在播放
track.Length: number;                // 动画长度（秒）
track.Looped: boolean;               // 是否循环
track.Priority: Enum.AnimationPriority;  // 动画优先级

// 可读写属性
track.TimePosition: number;          // 当前播放位置（秒）
track.Speed: number;                 // 播放速度倍率
track.WeightCurrent: number;         // 当前权重
```

**示例：**

```typescript
// 检查播放状态
if (track.IsPlaying) {
	print("动画正在播放");
}

// 获取动画信息
print(`动画长度: ${track.Length} 秒`);
print(`当前位置: ${track.TimePosition} 秒`);

// 跳到特定时间
track.TimePosition = 2.5;

// 调整速度
track.Speed = 1.5;  // 1.5 倍速
```

### 参数调整

```typescript
// 调整播放速度
track.AdjustSpeed(
	speed: number                // 速度倍率（> 0）
): void;

// 调整混合权重
track.AdjustWeight(
	weight: number,              // 权重值（0-1）
	fadeTime?: number            // 过渡时间（秒）
): void;
```

**示例：**

```typescript
// 加速播放
track.AdjustSpeed(2.0);  // 2 倍速

// 减慢播放
track.AdjustSpeed(0.5);  // 0.5 倍速

// 调整权重（立即）
track.AdjustWeight(0.5);

// 平滑调整权重（0.3 秒过渡）
track.AdjustWeight(0.8, 0.3);
```

### 事件监听

```typescript
// 动画结束事件（播放完成）
track.Ended: RBXScriptSignal<() => void>;

// 动画停止事件（主动停止或结束）
track.Stopped: RBXScriptSignal<() => void>;

// 动画循环事件
track.DidLoop: RBXScriptSignal<() => void>;

// 关键帧标记事件
track.GetMarkerReachedSignal(
	markerName: string           // 标记名称
): RBXScriptSignal<() => void>;

// 关键帧事件（废弃，使用 Marker 替代）
track.KeyframeReached: RBXScriptSignal<(keyframeName: string) => void>;
```

**示例：**

```typescript
// 监听动画结束
track.Ended.Connect(() => {
	print("动画播放完成");
});

// 监听动画停止
track.Stopped.Connect(() => {
	print("动画已停止");
});

// 监听循环
track.DidLoop.Connect(() => {
	print("动画循环了一次");
});

// 监听自定义标记（用于战斗判定等）
track.GetMarkerReachedSignal("HitFrame").Connect(() => {
	print("触发伤害判定");
	dealDamage();
});
```

### 关键帧查询

```typescript
// 获取关键帧时间
track.GetTimeOfKeyframe(
	keyframeName: string         // 关键帧名称
): number;                       // 时间位置（秒）
```

**示例：**

```typescript
const hitTime = track.GetTimeOfKeyframe("HitFrame");
print(`伤害判定时间点: ${hitTime} 秒`);
```

## 动画优先级

动画优先级决定了动画之间的覆盖关系。

```typescript
enum AnimationPriority {
	Core = 0,        // 核心动画（最低优先级）
	Idle = 1,        // 待机动画
	Movement = 2,    // 移动动画
	Action = 3,      // 动作动画（最高优先级）
}
```

**规则：**
- 高优先级动画会覆盖低优先级动画
- 同优先级动画可以通过权重混合
- 默认优先级为 `Core`

**示例：**

```typescript
// 设置动画优先级
track.Priority = Enum.AnimationPriority.Action;

// 移动动画（Movement）会被攻击动画（Action）覆盖
const walkTrack = player.tracks.get("Walk");
const attackTrack = player.tracks.get("Attack");

walkTrack!.Priority = Enum.AnimationPriority.Movement;
attackTrack!.Priority = Enum.AnimationPriority.Action;

walkTrack!.Play();     // 开始走路
attackTrack!.Play();   // 攻击会覆盖走路动画
```

## 动画混合

通过权重实现多个动画的混合效果。

### 权重混合

```typescript
// 混合两个动画
function blendAnimations(
	track1: AnimationTrack,
	track2: AnimationTrack,
	blend: number  // 0-1，0 表示完全使用 track1，1 表示完全使用 track2
): void {
	const weight1 = 1 - blend;
	const weight2 = blend;

	track1.AdjustWeight(weight1);
	track2.AdjustWeight(weight2);
}
```

**示例：**

```typescript
// 50% 待机 + 50% 瞄准
const idleTrack = player.tracks.get("Idle");
const aimTrack = player.tracks.get("Aim");

idleTrack?.Play();
aimTrack?.Play();

idleTrack?.AdjustWeight(0.5);
aimTrack?.AdjustWeight(0.5);
```

### 叠加动画

某些动画可以叠加在基础动画之上：

```typescript
// 播放基础动画
const baseTrack = player.tracks.get("Idle");
baseTrack?.Play(0.2);
baseTrack?.AdjustWeight(1.0);

// 叠加上半身动画
const upperBodyTrack = player.tracks.get("Aim");
upperBodyTrack?.Play(0.2);
upperBodyTrack?.AdjustWeight(0.8);
```

## 系统 API

### initializeAnimationsSystem

自动加载动画的系统，内置于 `AnimationPlugin` 中。

**功能：**
1. 查询带有 `AnimationConfig` 和 `RobloxInstance` 的实体
2. 获取 Model 的 `Animator` 或 `Humanoid`
3. 加载 `AnimationConfig` 中的所有动画
4. 将加载的 `AnimationTrack` 存储到 `AnimationPlayer`
5. 移除 `AnimationConfig` 组件

**执行时机：**
- 在 `First` 调度阶段执行
- 每帧检查新添加的 `AnimationConfig`

**注意事项：**
- 需要实体同时拥有 `RobloxInstance` 和 `AnimationConfig`
- Model 必须包含 `Humanoid` 或 `Animator`
- 如果没有 `AnimationPlayer` 组件，系统会自动添加

## 插件 API

### AnimationPlugin

提供动画系统的插件。

```typescript
function createAnimationPlugin(): Plugin
```

**功能：**
- 注册 `initializeAnimationsSystem` 系统到 `First` 调度

**使用：**

```typescript
import { createAnimationPlugin } from "bevy_animation";

app.addPlugin(createAnimationPlugin());
```

**注意：** 使用 `DefaultPlugins` 时会自动包含此插件，无需手动添加。

## 类型定义

### AnimationConfigData

```typescript
interface AnimationConfigData {
	readonly animations: Map<string, string>;
}
```

动画配置数据接口。

### AnimationPlayerData

```typescript
interface AnimationPlayerData {
	readonly tracks: Map<string, AnimationTrack>;
}
```

动画播放器数据接口。

## 性能考量

### 零开销封装

`bevy_animation` 采用最小化封装设计：

1. **直接使用原生 API** - `AnimationTrack` 直接存储在 `Map` 中
2. **无额外抽象层** - 不创建包装对象
3. **无运行时开销** - 系统只在初始化时工作

### 内存管理

- 动画轨道在实体销毁时自动清理
- `AnimationConfig` 在加载后自动移除，减少内存占用
- 使用 `Map` 而非数组，提供 O(1) 查找性能

### 推荐实践

```typescript
// ✅ 推荐：缓存频繁使用的轨道引用
class CharacterController {
	private idleTrack?: AnimationTrack;
	private runTrack?: AnimationTrack;

	constructor(player: AnimationPlayer) {
		this.idleTrack = player.tracks.get("Idle");
		this.runTrack = player.tracks.get("Run");
	}

	update(): void {
		// 使用缓存的引用，避免重复查找
		if (this.shouldRun()) {
			this.runTrack?.Play(0.2);
		} else {
			this.idleTrack?.Play(0.2);
		}
	}
}

// ❌ 避免：每帧查找动画轨道
function updateAnimation(player: AnimationPlayer): void {
	player.tracks.get("Idle")?.Play(0.2);  // 每帧都查找 Map
}
```

## 相关链接

- **[SKILL.md](../SKILL.md)** - 核心工作流程
- **[examples.md](./examples.md)** - 完整代码示例
- **[troubleshooting.md](./troubleshooting.md)** - 最佳实践和故障排查
- **[Roblox AnimationTrack API](https://create.roblox.com/docs/reference/engine/classes/AnimationTrack)** - 官方文档

---
name: bevy-animation
description: bevy_animation 动画系统 - 对标 Rust Bevy 0.16 bevy_animation，为 Roblox 平台提供 ECS 动画封装
license: MIT
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
---

# bevy_animation - 动画系统

## 与 Rust Bevy 0.16 的关系

本模块是 Rust Bevy 0.16 `bevy_animation` 的 Roblox 平台移植版本。

### 核心设计对标

| Rust Bevy 概念 | Roblox 版实现 | 说明 |
|---------------|--------------|------|
| `AnimationClip` 资产 | Roblox Animation 资产 | Bevy 使用 glTF/自定义曲线；Roblox 使用 AnimationId |
| `AnimationPlayer` 组件 | `AnimationPlayer` 组件 | 都用于存储和控制动画状态 |
| `AnimationTarget` 组件 | 隐式（通过 Animator） | Bevy 需要显式标记骨骼；Roblox 自动管理 |
| `AnimationGraph` | 无 | 图模式高级功能未移植 |
| `VariableCurve` | Roblox AnimationTrack | Bevy 手动插值；Roblox 引擎级处理 |
| `ActiveAnimation` 状态 | AnimationTrack 内部状态 | Bevy 自管理状态；Roblox 引擎管理 |
| 动画事件系统 | AnimationTrack.GetMarkerReachedSignal | 两者都支持事件标记 |

### 架构差异

**Rust Bevy 架构**：
- 完整的动画曲线系统（Transform/Material/自定义属性）
- 手动时间步进和插值计算
- 基于 ECS 的动画图（Blend/Add 节点）
- 支持任意属性的动画化（通过 `Animatable` trait）
- 需要 `advance_animations` 和 `animate_targets` 系统驱动

**Roblox 版架构**：
- 直接使用 Roblox 引擎的 `AnimationTrack` API（零计算开销）
- 引擎自动处理插值和播放
- 无图系统，仅支持单轨播放（混合需手动调权重）
- 仅支持骨骼动画（Roblox 引擎限制）
- 仅需 `initializeAnimationsSystem` 加载动画

### 功能对比

#### ✅ 已实现的 Bevy 功能
- 插件化集成（`AnimationPlugin`）
- 组件式动画管理（`AnimationPlayer`）
- 自动资产加载（`AnimationConfig` → 加载系统）
- 基础播放控制（Play/Stop/Speed/Weight）
- 动画事件（通过 Roblox Marker）

#### ❌ 未移植的 Bevy 功能
- **AnimationGraph**：复杂混合图和节点系统
  - 原因：Roblox 无底层曲线访问，无法实现精确混合逻辑
- **VariableCurve**：自定义属性动画曲线
  - 原因：Roblox 仅支持预定义骨骼动画
- **AnimationTarget**：显式骨骼标记系统
  - 原因：Roblox Animator 自动管理骨骼映射
- **Transition 系统**：复杂过渡状态机
  - 原因：可通过业务逻辑+淡入淡出参数实现基础过渡
- **ActiveAnimation 状态**：细粒度动画状态追踪
  - 原因：Roblox AnimationTrack 封装了状态（IsPlaying/TimePosition 等）

#### 🔄 实现差异的功能

**动画混合**：
- Bevy：基于图的 Blend/Add 节点，支持多层混合
- Roblox：手动调用 `AdjustWeight()` 实现简单混合，无自动归一化

**事件系统**：
- Bevy：`add_event_to_target()` → ECS 事件触发
- Roblox：`GetMarkerReachedSignal()` → Roblox Signal 回调

**时间控制**：
- Bevy：手动 `seek_time` 和 `update()` 计算
- Roblox：引擎自动驱动，通过 `TimePosition` 属性查询

## 核心工作流程

### 1. 添加动画插件

```typescript
import { App } from "bevy_app";
import { AnimationPlugin } from "bevy_animation";

const app = App.create();
app.addPlugins(new AnimationPlugin());  // 注册 PostStartup 和 PostUpdate 系统
```

**对比 Bevy**：
- Bevy：`app.add_plugins(AnimationPlugin)` 注册系统到 `PostUpdate`
- Roblox：同样注册到 `PostStartup`（初始化）和 `PostUpdate`（运行时加载）

### 2. 配置动画资产

```typescript
import { AnimationConfig, AnimationPlayer } from "bevy_animation";
import { RobloxModel } from "bevy_render";

world.spawn(
	RobloxModel({ instance: character }),
	AnimationConfig({ animations: new Map([
		["Idle", "rbxassetid://507766666"],
		["Run", "rbxassetid://507767714"],
	])}),
	AnimationPlayer({ tracks: new Map() })
);
```

**对比 Bevy**：
- Bevy：添加 `AnimationPlayer` 和 `AnimationGraphHandle`（指向 AnimationGraph 资产）
- Roblox：添加 `AnimationConfig` 和 `AnimationPlayer`（直接包含资产 ID）

**关键差异**：
- Bevy 使用资产系统（`Handle<AnimationClip>`），支持动态加载和共享
- Roblox 使用 AssetId 字符串，系统自动创建 Animation 实例并加载

### 3. 控制动画播放

```typescript
function movementSystem(world: World): void {
	for (const [entity, player] of world.query(AnimationPlayer)) {
		const idleTrack = player.tracks.get("Idle");
		if (idleTrack && !idleTrack.IsPlaying) {
			idleTrack.Play(0.2);  // 0.2 秒淡入
		}
	}
}
```

**关键差异**：
- Bevy：通过 `play(AnimationNodeIndex)` 启动，需要访问 AnimationGraph
- Roblox：直接调用 `AnimationTrack.Play()`，更接近原生 API

### 4. 动画混合（手动实现）

```typescript
function blendAnimations(player: AnimationPlayer, idleWeight: number, runWeight: number): void {
	const idleTrack = player.tracks.get("Idle");
	const runTrack = player.tracks.get("Run");

	// 手动归一化权重
	const totalWeight = idleWeight + runWeight;
	idleTrack?.AdjustWeight(idleWeight / totalWeight);
	runTrack?.AdjustWeight(runWeight / totalWeight);
}
```

**对比 Bevy**：
- Bevy：通过 AnimationGraph 的 Blend 节点自动混合
- Roblox：需要业务代码手动调用 `AdjustWeight()`

## 关键注意事项

### ⚠️ 平台限制

1. **无法实现曲线级控制**
   - Bevy 可以逐帧修改任意属性的曲线值
   - Roblox 仅能播放预制动画，无法访问关键帧数据

2. **混合逻辑由用户实现**
   - Bevy 提供 Blend/Add 节点自动计算混合
   - Roblox 需要手动管理多个 Track 的权重

3. **仅支持骨骼动画**
   - Bevy 可动画化任意组件属性（Transform/Material/自定义）
   - Roblox 仅支持 Humanoid/AnimationController 的骨骼动画

### ✅ 最佳实践

- **资产加载**：总是同时添加 `AnimationConfig` 和空的 `AnimationPlayer`
- **状态检查**：播放前检查 `tracks.size() > 0` 确保已加载
- **淡入淡出**：使用 `Play(fadeTime)` 和 `Stop(fadeTime)` 避免突兀切换
- **事件监听**：在系统内使用 `world.useHook()` 订阅 `GetMarkerReachedSignal`

## 架构决策说明

### 为何不实现 AnimationGraph？

Rust Bevy 的 `AnimationGraph` 需要：
1. 访问动画曲线的原始数据（关键帧时间和值）
2. 手动执行插值计算（lerp/slerp）
3. 在多个曲线间进行加权混合
4. 将计算结果写入目标组件

Roblox 平台限制：
- `AnimationTrack` 是黑盒 API，无法访问曲线数据
- 引擎内部处理插值和混合，无暴露底层接口
- 仅能通过 `AdjustWeight()` 影响最终结果

**结论**：AnimationGraph 的核心价值（精确混合控制）无法在 Roblox 实现，保留简化的单轨模式更符合平台特性。

### 为何使用 AnimationConfig 而非 Handle？

Bevy 的资产系统设计：
- `Handle<T>` 提供弱引用和延迟加载
- 支持热重载和资产共享
- 需要 `AssetServer` 和 `Assets<T>` 管理生命周期

Roblox 的资产加载特点：
- AssetId 字符串立即可用（`rbxassetid://`）
- `Animator.LoadAnimation()` 同步返回 Track
- 无需额外的资产管理系统

**结论**：使用 `AnimationConfig` 直接存储 AssetId，在首次查询时加载，简化实现并避免引入复杂的资产系统。

## 组件 API 快速参考

### AnimationPlayer 组件

```typescript
const AnimationPlayer = component<{
	readonly tracks: Map<string, AnimationTrack>;
}>("AnimationPlayer");

// 使用示例
const player = world.get(entity, AnimationPlayer);
player.tracks.get("Idle")?.Play(0.2);
```

### AnimationConfig 组件

```typescript
const AnimationConfig = component<{
	readonly animations: Map<string, string>;
}>("AnimationConfig");

// 使用示例
world.spawn(
	AnimationConfig({ animations: new Map([
		["Idle", "rbxassetid://123"],
		["Run", "rbxassetid://456"],
	])})
);
```

### AnimationTrack API（Roblox 原生）

```typescript
// 播放控制
track.Play(fadeTime?: number): void;
track.Stop(fadeTime?: number): void;

// 属性
track.IsPlaying: boolean;
track.Length: number;
track.TimePosition: number;
track.Speed: number;

// 调整
track.AdjustSpeed(speed: number): void;
track.AdjustWeight(weight: number): void;

// 事件
track.Ended: RBXScriptSignal;
track.Stopped: RBXScriptSignal;
track.DidLoop: RBXScriptSignal;
track.GetMarkerReachedSignal(name: string): RBXScriptSignal;
```

## 相关资源

### Rust Bevy 参考
- **[bevy_animation 源码](https://github.com/bevyengine/bevy/tree/v0.16/crates/bevy_animation)** - Rust 实现参考
- **[bevy_animation 文档](https://docs.rs/bevy_animation/0.16.0)** - API 文档

### 本项目资源
- **[API 参考](./references/api-reference.md)** - 完整的组件和系统 API
- **[故障排查](./references/troubleshooting.md)** - 常见问题和最佳实践
- **源码**: `src/bevy_animation/` - TypeScript 实现

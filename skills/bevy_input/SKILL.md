---
name: bevy-input
description: bevy_input - Rust Bevy 0.16 的 Roblox 移植版本
license: MIT
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
---

# bevy_input - Rust Bevy 0.16 移植版本

## 概述

本模块是 Rust Bevy 0.16 `bevy_input` crate 的 TypeScript 移植,专为 Roblox 平台优化。假设读者已精通 Rust Bevy,本文档**仅描述移植后的差异和平台适配**,不提供基础教程。

## 核心架构对比

### ✅ 保持一致的设计

| Bevy 原版 | Roblox 移植版 | 说明 |
|-----------|--------------|------|
| `ButtonInput<T>` 三态状态机 | 完全相同 | `pressed`/`just_pressed`/`just_released` |
| Resources 存储输入状态 | 完全相同 | 通过 `world.getResource()` 访问 |
| Events 传递输入变化 | 改为 Messages | 使用 `world.messages` |
| Plugin 架构 | 完全相同 | `InputPlugin` 实现 `Plugin` 接口 |
| `PreUpdate` 处理输入 | 改为 `PRE_UPDATE` | 调度标签名称差异 |
| `PostUpdate` 清理状态 | 改为 `POST_UPDATE` | 帧末清理逻辑相同 |

### ❌ 平台差异导致的变化

#### 1. **输入源替换**

**Bevy 原版**:
- 操作系统原生事件 (winit/gilrs)
- 跨平台输入抽象层

**Roblox 移植版**:
- `UserInputService` API
- `useEvent` hook (Matter ECS 集成)
- Roblox 特定的输入类型

**示例差异**:
```typescript
// ❌ Bevy: 使用 EventReader<InputEvent>
// ✅ Roblox: 使用 useEvent hook
for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputBegan")) {
	// 处理输入
}
```

#### 2. **游戏手柄实体管理**

**Bevy 原版**:
- 游戏手柄表示为 ECS `Entity`
- `Gamepad(Entity)` 作为标识符
- 支持动态生成/销毁实体

**Roblox 移植版**:
- 使用 `Enum.UserInputType` (Gamepad1-Gamepad8)
- 无需创建 ECS 实体
- 固定数量的手柄槽位

**API 对比**:
```typescript
// ❌ Bevy: gamepad.entity() -> Entity
// ✅ Roblox: gamepad 本身就是 Enum.UserInputType

const gamepadManager = getGamepadManager(world);
const gamepad = gamepadManager.get(Enum.UserInputType.Gamepad1);
```

#### 3. **键盘布局处理**

**Bevy 原版**:
- 完整的 `KeyCode` (物理键) 和 `Key` (逻辑键) 分离
- 支持国际化键盘布局
- 死键和组合键处理

**Roblox 移植版**:
- `Enum.KeyCode` 作为物理键
- 自定义 `Key` 枚举模拟逻辑键
- 简化的文本输入关联 (通过时间戳匹配)

**实现差异**:
```typescript
// Bevy: 系统级键盘布局映射
// Roblox: 手动实现 getLogicalKey(keyCode)

function getLogicalKey(keyCode: Enum.KeyCode, text?: string): Key {
	if (text && text.size() === 1) {
		return characterKey(text);
	}
	// 回退到物理键映射
	return physicalToLogical(keyCode);
}
```

#### 4. **鼠标滚轮方向**

**Bevy 原版**:
- `MouseScrollUnit` 区分像素和行
- `MouseWheel.x` 和 `MouseWheel.y` 分离

**Roblox 移植版**:
- 仅支持 `Position.Z` 单轴滚动
- 简化为 `AccumulatedMouseWheel.accumulate(delta)`

## 功能对照表

### 键盘输入

| 功能 | Bevy 原版 | Roblox 移植版 | 差异说明 |
|------|-----------|--------------|----------|
| 物理键检测 | `KeyCode` enum | `Enum.KeyCode` | Roblox 枚举 |
| 逻辑键检测 | `Key` enum | 自定义 `Key` 类 | 需手动映射 |
| 重复按键事件 | `KeyboardInput.repeat` | 未实现 | Roblox 无原生支持 |
| 文本输入 | `ReceivedCharacter` | `TextInputted` hook | 事件关联不完全 |
| 焦点丢失 | `WindowFocusReleased` | `WindowFocusReleased` | API 一致 |

### 鼠标输入

| 功能 | Bevy 原版 | Roblox 移植版 | 差异说明 |
|------|-----------|--------------|----------|
| 按钮状态 | `ButtonInput<MouseButton>` | `ButtonInput<UserInputType>` | 类型不同 |
| 移动累积 | `AccumulatedMouseMotion` | 完全相同 | ✅ |
| 滚轮累积 | `AccumulatedMouseScroll` | `AccumulatedMouseWheel` | 仅支持单轴 |
| 光标位置 | `CursorMoved` event | `MousePosition` resource | 额外提供 delta |
| 光标图标 | `CursorIcon` | 未实现 | Roblox 无权限 |

### 触摸输入

| 功能 | Bevy 原版 | Roblox 移植版 | 差异说明 |
|------|-----------|--------------|----------|
| 多点触摸 | `Touches` resource | 完全相同 | ✅ |
| 触摸阶段 | `TouchPhase` enum | 完全相同 | ✅ |
| 压感检测 | `ForceTouch` | 完全相同 | ✅ |
| 手势识别 | 无 | `GestureManager` | ⭐ Roblox 扩展 |

### 游戏手柄输入

| 功能 | Bevy 原版 | Roblox 移植版 | 差异说明 |
|------|-----------|--------------|----------|
| 按钮检测 | `GamepadButton` | 完全相同 | ✅ |
| 摇杆轴 | `GamepadAxis` | 完全相同 | ✅ |
| 死区过滤 | `AxisSettings` | 完全相同 | ✅ |
| 线性缩放 | `GamepadAxisType` | `gamepad-linear-scaling.ts` | 独立实现 |
| 振动反馈 | `GamepadRumbleRequest` | 已定义但未实现 | Roblox API 限制 |
| 连接事件 | `GamepadConnectionEvent` | 完全相同 | ✅ |

## 消息系统差异

### Bevy 原版事件

Bevy 使用 `Events<T>` 系统,事件在多个系统间共享:
- 自动排序和去重
- 双缓冲防止数据竞争
- 支持 `ParallelCommands`

### Roblox Messages

Matter ECS 使用 `Messages` 系统:
- 单帧生命周期
- Reader/Writer 分离
- 无内置并行处理

**迁移示例**:
```typescript
// ❌ Bevy:
// fn keyboard_system(mut events: EventReader<KeyboardInput>)

// ✅ Roblox:
function keyboardSystem(world: World): void {
	const events = world.messages.createReader<KeyboardInput>();
	for (const event of events.read()) {
		// 处理事件
	}
}
```

## 条件系统对比

### Bevy 原版

使用 `Condition<T>` trait:
- 编译时类型检查
- 自动依赖注入
- 支持泛型约束

### Roblox 移植版

使用函数闭包:
```typescript
export type InputCondition = (world: World) => boolean;

// 使用示例
const condition = KeyboardConditions.pressed(Enum.KeyCode.Space);
if (condition(world)) {
	// 执行逻辑
}
```

**限制**:
- 无编译时验证
- 手动传递 `world` 参数
- 无运行时缓存优化

## Roblox 专有功能

### 1. 手势识别 (`gestures.ts`)

**Bevy 原版**: 无内置手势支持

**Roblox 移植版**: 完整的手势系统
- `PinchGesture` (捏合缩放)
- `RotationGesture` (旋转)
- `DoubleTapGesture` (双击)
- `PanGesture` (平移)
- `LongPressGesture` (长按)

**配置**:
```typescript
const gestureManager = getGestureManager(world);
gestureManager.config.pinchMinScaleChange = 0.01;
gestureManager.config.doubleTapMaxTime = 0.3;
```

### 2. 环境检测 (`Env`)

Roblox 需要区分客户端/服务端/测试环境:
```typescript
const env = new Env();
if (env.isClient) {
	app.addSystems(MainScheduleLabel.UPDATE, inputSystem);
}
```

**Bevy 原版**: 无此限制,输入系统仅在有窗口时运行

### 3. `useEvent` Hook

利用 Matter ECS 的 hook 系统处理 Roblox 事件:
```typescript
for (const [_, input, gameProcessed] of useEvent(UserInputService, "InputBegan")) {
	// 自动在系统停止时清理事件连接
}
```

## 未实现的 Bevy 功能

| 功能 | 原因 |
|------|------|
| `InputMap` 系统 | 需用户自行实现 |
| `Axis` 和 `DualAxis` 通用轴类型 | 简化为游戏手柄专用 |
| 光标锁定/隐藏 | Roblox API 限制 |
| IME 输入法支持 | `UserInputService` 无接口 |
| 游戏手柄振动 | Roblox 无权限 |
| 鼠标原始输入 | 仅支持 Delta |

## 性能优化差异

### Bevy 原版

- 零成本抽象 (Rust 编译时优化)
- SIMD 向量运算
- 并行事件处理

### Roblox 移植版

- 使用 `Set` 优化状态查询 (O(1))
- 累积器减少垃圾回收
- 单线程事件循环

**优化建议**:
```typescript
// ✅ 预创建条件函数 (避免每帧分配)
const jumpCondition = KeyboardConditions.justPressed(Enum.KeyCode.Space);

// ❌ 避免每帧创建
function badSystem(world: World) {
	const condition = KeyboardConditions.justPressed(Enum.KeyCode.Space);
	if (condition(world)) { }
}
```

## 测试差异

### Bevy 原版

单元测试使用 Rust 的 `#[test]` 宏

### Roblox 移植版

```typescript
it("should track button states", () => {
	const input = new ButtonInput<Enum.KeyCode>("KeyCode");
	input.press(Enum.KeyCode.Space);
	expect(input.justPressed(Enum.KeyCode.Space)).to.equal(true);
});
```

**测试环境**: 使用 `@rbxts/testez`,在 Roblox Studio 或 Cloud 环境运行

## 迁移指南

### 从 Rust Bevy 迁移代码

1. **类型替换**:
   - `KeyCode` → `Enum.KeyCode`
   - `MouseButton` → `Enum.UserInputType`
   - `Entity` (gamepad) → `Enum.UserInputType`

2. **事件系统**:
   - `EventReader<T>` → `world.messages.createReader<T>()`
   - `EventWriter<T>` → `world.messages.createWriter<T>()`

3. **资源访问**:
   - `Res<ButtonInput<KeyCode>>` → `getKeyboardInput(world)`
   - `ResMut<ButtonInput<MouseButton>>` → `getMouseInput(world)`

4. **条件系统**:
   - `Condition::and(cond1, cond2)` → `andConditions(cond1, cond2)`

5. **游戏手柄**:
   - `Query<&Gamepad>` → `gamepadManager.getConnected()`
   - `gamepad.entity()` → 直接使用 `Enum.UserInputType`

### 代码示例对比

**TypeScript 示例** (Roblox):
```typescript
function inputSystem(world: World): void {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	if (keyboard.justPressed(Enum.KeyCode.Space)) {
		print("Jump!");
	}
}
```

## 资源链接

- **源码**: `src/bevy_input/`
- **测试**: `src/bevy_input/__tests__/`
- **Rust 原版**: [bevy_input v0.16](https://docs.rs/bevy_input/0.16.0/bevy_input/)
- **Roblox API**: [UserInputService](https://create.roblox.com/docs/reference/engine/classes/UserInputService)

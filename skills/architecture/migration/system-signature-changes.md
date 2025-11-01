# 系统签名变更迁移指南

> **版本**: v0.9.0-alpha
> **更新日期**: 2025-10-31
> **影响范围**: 所有系统函数

## 概述

从 v0.9.0 开始，系统函数签名发生了重大变更，移除了显式的 `context` 参数。系统现在通过 `world.context` 访问应用程序上下文。

## 变更对比

### 旧签名 (v0.8.x 及更早版本)

```typescript
function mySystem(world: World, context: Context): void {
	// 通过参数访问 context
	const resource = context.getExtension<MyExtension>();
}
```

### 新签名 (v0.9.0+)

```typescript
function mySystem(world: World): void {
	// 通过 world.context 访问
	const resource = world.context.myResource;
}
```

## 为什么要变更？

### 1. 简化系统签名

**之前**：
```typescript
function complexSystem(
	world: World,
	context: Context, // 每个系统都需要这个参数
): void {
	// ...
}
```

**现在**：
```typescript
function complexSystem(world: World): void {
	// context 通过 world 访问，更简洁
}
```

### 2. 统一访问模式

**之前**（多种访问方式）：
```typescript
function confusingSystem(world: World, context: Context): void {
	// 方式 1: 通过 world
	const resource1 = world.getResource<MyResource>();

	// 方式 2: 通过 context
	const extension = context.getExtension<MyExtension>();

	// 混乱：需要记住什么时候用哪个
}
```

**现在**（统一访问）：
```typescript
function clearSystem(world: World): void {
	// 统一通过 world 访问
	const resource = world.getResource<MyResource>();
	const contextResource = world.context.myResource;

	// 更清晰：所有访问都从 world 开始
}
```

### 3. 符合 Bevy 风格

Rust Bevy 的系统签名也不包含 context 参数：

```rust
// Rust Bevy 风格
fn my_system(
	time: Res<Time>,
	query: Query<&Transform>
) {
	// 系统参数通过依赖注入
}
```

虽然我们使用的是显式传递 `World` 的方式，但移除额外的参数使系统更加简洁。

## 迁移步骤

### 步骤 1: 更新系统签名

**查找所有需要更新的系统**：
```typescript
// 搜索模式: (world: World, context: Context)
// 替换为: (world: World)
```

**示例**：

**之前**：
```typescript
function playerMovement(world: World, context: Context): void {
	const time = context.getExtension<TimeExtension>();
	// ...
}

function enemyAI(world: World, context: Context): void {
	const time = context.getExtension<TimeExtension>();
	// ...
}
```

**之后**：
```typescript
function playerMovement(world: World): void {
	const time = world.context.virtualTime;
	// ...
}

function enemyAI(world: World): void {
	const time = world.context.virtualTime;
	// ...
}
```

### 步骤 2: 更新资源访问

**旧的扩展访问模式**：
```typescript
function oldWay(world: World, context: Context): void {
	// ❌ 旧方式
	const extension = context.getExtension<TimeExtension>();
	const time = extension.virtualTime;
}
```

**新的 context 访问模式**：
```typescript
function newWay(world: World): void {
	// ✅ 新方式 - 直接访问
	const time = world.context.virtualTime;
}
```

### 步骤 3: 更新系统配置对象

如果使用配置对象定义系统，也需要更新：

**之前**：
```typescript
export const mySystemConfig = {
	system: (world: World, context: Context) => {
		const time = context.getExtension<TimeExtension>();
		// ...
	},
	inSet: "Update",
};
```

**之后**：
```typescript
export const mySystemConfig = {
	system: (world: World) => {
		const time = world.context.virtualTime;
		// ...
	},
	inSet: "Update",
};
```

## 常见场景迁移

### 场景 1: 访问时间资源

**之前**：
```typescript
function updateAnimation(world: World, context: Context): void {
	const timeExt = context.getExtension<TimeExtension>();
	const deltaTime = timeExt.virtualTime.deltaSeconds();

	// 更新动画
	for (const [entity, animation] of world.query(Animation)) {
		animation.time += deltaTime;
	}
}
```

**之后**：
```typescript
function updateAnimation(world: World): void {
	const deltaTime = world.context.virtualTime.deltaSeconds();

	// 更新动画
	for (const [entity, animation] of world.query(Animation)) {
		animation.time += deltaTime;
	}
}
```

### 场景 2: 访问日志系统

**之前**：
```typescript
function debugSystem(world: World, context: Context): void {
	const logExt = context.getExtension<LogExtension>();
	const logger = logExt.logManager;

	logger.debug("Debug message");
}
```

**之后**：
```typescript
function debugSystem(world: World): void {
	const logger = world.context.logger;

	logger.debug("Debug message");
}
```

### 场景 3: 访问调试器

**之前**：
```typescript
function debugUI(world: World, context: Context): void {
	const debuggerExt = context.getExtension<DebuggerExtension>();
	const widgets = debuggerExt.widgets;

	widgets.window("Debug", () => {
		widgets.label("Info");
	});
}
```

**之后**：
```typescript
function debugUI(world: World): void {
	const widgets = world.context.debuggerWidgets;

	widgets.window("Debug", () => {
		widgets.label("Info");
	});
}
```

### 场景 4: 条件系统 (runIf)

条件系统的签名也需要更新：

**之前**：
```typescript
const conditionalSystem = {
	runIf: (world: World, context: Context) => {
		const env = context.env;
		return env.isServer;
	},
	system: (world: World, context: Context) => {
		// ...
	},
};
```

**之后**：
```typescript
const conditionalSystem = {
	runIf: (world: World) => {
		const env = world.context.env;
		return env.isServer;
	},
	system: (world: World) => {
		// ...
	},
};
```

## 批量迁移工具

### 正则表达式替换

**VSCode / 支持正则的编辑器**：

1. **查找**：`\(world: World, context: Context\)`
2. **替换为**：`(world: World)`

**注意**：替换后需要手动更新 `context` 的访问方式。

### 半自动化脚本

```typescript
// 替换脚本示例（伪代码）
function migrateSystemSignature(code: string): string {
	// 1. 移除 context 参数
	code = code.replace(
		/(world: World), context: Context/g,
		"$1"
	);

	// 2. 替换 context.getExtension 调用
	code = code.replace(
		/context\.getExtension<(\w+)>\(\)/g,
		"world.context.$1"
	);

	// 3. 替换 context.env 访问
	code = code.replace(/context\.env/g, "world.context.env");

	return code;
}
```

**警告**：自动化脚本可能无法处理所有情况，建议手动审查所有变更。

## 常见错误及解决

### 错误 1: 忘记更新系统签名

**错误信息**：
```
Type '(world: World, context: Context) => void' is not assignable to type 'System'
```

**解决**：移除 `context` 参数

**之前**：
```typescript
app.addSystems(Update, (world: World, context: Context) => {
	// ...
});
```

**之后**：
```typescript
app.addSystems(Update, (world: World) => {
	// ...
});
```

### 错误 2: 仍然使用 getExtension

**错误信息**：
```
Property 'getExtension' does not exist on type 'Context'
```

**解决**：使用新的 context 扩展模式

**之前**：
```typescript
const ext = context.getExtension<TimeExtension>();
```

**之后**：
```typescript
const time = world.context.virtualTime;
```

### 错误 3: context 未定义

**错误代码**：
```typescript
function badSystem(world: World): void {
	const time = context.virtualTime; // ❌ context 未定义
}
```

**解决**：通过 `world.context` 访问

```typescript
function goodSystem(world: World): void {
	const time = world.context.virtualTime; // ✅ 正确
}
```

## 兼容性说明

### 破坏性变更

- ❌ 旧的系统签名 `(world: World, context: Context)` 不再支持
- ❌ `context.getExtension<T>()` 方法已移除
- ❌ 直接传递 `context` 参数的系统将导致类型错误

### 迁移时间表

- **v0.8.x**: 旧签名仍然支持（最后支持的版本）
- **v0.9.0-alpha**: 新签名启用，旧签名废弃
- **v0.9.0**: 完全移除旧签名支持

### 向后兼容

如果需要同时支持旧版本和新版本代码，可以使用条件编译或版本检查：

```typescript
// 不推荐，但可用于过渡期
function hybridSystem(world: World, maybeContext?: Context): void {
	// 新版本：通过 world.context
	const context = maybeContext ?? world.context;

	// 使用 context
}
```

## 检查清单

完成迁移后，检查以下项目：

- [ ] 所有系统签名已更新为 `(world: World)`
- [ ] 所有 `context.getExtension<T>()` 调用已替换
- [ ] 所有 `context.env` 访问已改为 `world.context.env`
- [ ] 所有系统配置对象中的系统函数已更新
- [ ] 所有条件系统 (runIf) 的签名已更新
- [ ] 代码可以成功编译，无类型错误
- [ ] 所有测试通过
- [ ] 文档和注释已更新

## 相关资源

- [Context 扩展模式](../context-extension-pattern.md)
- [插件开发规范](../plugin-development-specification.md)
- [bevy_time SKILL文档](../../bevy_time/SKILL.md)
- [bevy_log SKILL文档](../../bevy_log/SKILL.md)

## FAQ

### Q: 为什么不保留 context 参数作为可选参数？

A: 这会导致 API 不一致，增加学习成本。统一通过 `world` 访问所有内容使 API 更加清晰和一致。

### Q: 性能会受到影响吗？

A: 不会。`world.context` 是直接属性访问，而 context 扩展使用懒加载和缓存机制，性能甚至可能更好。

### Q: 如何处理第三方插件？

A: 如果第三方插件还在使用旧签名，建议：
1. 联系插件作者更新
2. Fork 并自行迁移
3. 等待官方更新

### Q: 可以混用旧签名和新签名吗？

A: 不可以。v0.9.0+ 只支持新签名，混用会导致编译错误。

## 总结

系统签名变更带来了：

- ✅ **更简洁的 API**：减少了冗余参数
- ✅ **统一的访问模式**：所有访问从 `world` 开始
- ✅ **更好的类型安全**：通过 context 扩展提供类型提示
- ✅ **更符合 Bevy 风格**：保持与 Rust Bevy 的理念一致

迁移虽然需要一些工作，但带来的代码质量提升是值得的。

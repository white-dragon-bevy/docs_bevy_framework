---
name: unit-testing
description: White Dragon Bevy 的单元测试编写指南。当你需要编写单元测试、验证代码功能、确保代码质量或进行TDD开发时使用。整合了测试最佳实践、测试工厂、魔法数字提取等指南,适用于所有 roblox-ts 项目的单元测试场景。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/**/__tests__/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/docs/testing-best-practices.md)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/docs/test-factories-guide.md)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/docs/test-improvements-magic-numbers.md)
  - Bash(npm test)
  - Bash(npm run build)
---

# Unit Testing - 单元测试 Skill

## 📖 概述

单元测试是 White Dragon Bevy 框架质量保证的基石。本指南整合了项目的测试最佳实践、工厂模式和编码规范,提供了完整的单元测试编写方法论。

**项目测试成果**:
- ✅ **100% 测试通过率** - 1799/1799 测试通过
- ✅ **90%+ 代码覆盖率** - 覆盖所有核心功能
- ✅ **A+ 质量评级** - 零严重问题,零假阳性
- ✅ **完全规范** - 符合 Roblox-TS 和 TestEZ 标准

**核心特性**:
- **TestEZ 框架** - Roblox 官方测试框架
- **测试工厂** - 可重用的测试数据生成器
- **语义化常量** - 消除魔法数字
- **边界条件测试** - 完整的边界场景覆盖
- **中文命名** - 清晰的测试描述

## 🎯 何时使用

- 当你实现新功能时需要编写测试
- 当你修复 Bug 时需要添加回归测试
- 当你重构代码时需要确保功能不变
- 当你需要验证边界条件和错误处理时
- 当你采用 TDD 开发模式时
- 适用于所有需要质量保证的代码

## 🚀 快速开始

### 最简单的测试

```typescript
// src/my_module/__tests__/my-feature.spec.ts
export = () => {
	describe("我的功能", () => {
		it("应该正常工作", () => {
			const result = myFunction(42);
			expect(result).to.equal(42);
		});
	});
};
```

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test my-feature

# 编译后运行测试
npm run build && npm test
```

## 📚 核心概念

### 概念 1: TestEZ 框架

TestEZ 是 Roblox 官方的 BDD 风格测试框架。

**主要 API**:
- `describe(name, callback)` - 测试套件
- `it(name, callback)` - 测试用例
- `expect(value)` - 断言
- `beforeEach(callback)` - 每个测试前执行
- `afterEach(callback)` - 每个测试后执行

**基本结构**:
```typescript
export = () => {
	describe("功能模块", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		afterEach(() => {
			world.clear();
		});

		it("应该...", () => {
			// 准备
			const entity = world.spawn();

			// 执行
			const result = doSomething(entity);

			// 验证
			expect(result).to.be.ok();
		});
	});
};
```

### 概念 2: 强制规范

以下规范是**必须遵守**的,违反将导致测试失败。

#### 导出格式
```typescript
// ✅ 正确 - 必须使用 export =
export = () => {
	describe("测试", () => {
		it("应该通过", () => {
			expect(true).to.equal(true);
		});
	});
};

// ❌ 错误 - 其他导出方式会导致 TestEZ bug
export default () => { ... }
```

#### 错误处理
```typescript
// ✅ 正确 - 使用 error()
function validate(value: number): void {
	if (value < 0) {
		error("值不能为负数");
	}
}

// ❌ 错误 - 不要使用 throw
function validate(value: number): void {
	if (value < 0) {
		throw new Error("值不能为负数");  // 不符合 Roblox-TS
	}
}

// ✅ 测试错误抛出
it("应该在无效输入时抛出错误", () => {
	expect(() => {
		validate(-1);
	}).to.throw();
});
```

#### 异步控制
```typescript
// ✅ 正确 - 使用 loop.step() 模拟帧更新
it("应该在多帧后执行", () => {
	let frameCount = 0;
	const system = () => {
		frameCount++;
	};

	loop.scheduleSystems([system]);
	loop.step("default", 1 / 60);  // 第一帧
	loop.step("default", 1 / 60);  // 第二帧

	expect(frameCount).to.equal(2);
});

// ❌ 错误 - 不要使用 task.wait() 或其他 yield 函数
it("应该等待完成", () => {
	task.wait(1);  // ❌ Matter 系统不允许 yield
	expect(something).to.be.ok();
});
```

#### 测试清理
```typescript
// ✅ 正确 - 完整的清理逻辑
export = () => {
	describe("World 资源管理", () => {
		let world: World;
		let resource: TestResource;

		beforeEach(() => {
			world = new World();
			resource = new TestResource();
			world.insertResource(resource);
		});

		afterEach(() => {
			world.clear();  // 清理 world 状态
		});

		it("应该能获取资源", () => {
			const retrieved = world.getResource<TestResource>();
			expect(retrieved).to.equal(resource);
		});
	});
};

// ❌ 错误 - 缺少清理,可能导致状态污染
export = () => {
	describe("World 资源管理", () => {
		const world = new World();  // ❌ 共享状态

		it("测试1", () => {
			world.insertResource(new TestResource());
		});

		it("测试2", () => {
			// ❌ 可能受到测试1的影响
			const resource = world.getResource<TestResource>();
		});
	});
};
```

#### 命名规范
```typescript
// ✅ 正确 - 使用中文和"应该"句式
describe("Transform 组件", () => {
	it("应该使用默认值创建", () => {
		const transform = new Transform();
		expect(transform.position).to.equal(Vector3.zero);
	});

	it("应该能设置位置", () => {
		const transform = new Transform();
		transform.position = new Vector3(1, 2, 3);
		expect(transform.position.X).to.equal(1);
	});
});

// ❌ 错误 - 英文命名
describe("Transform component", () => {
	it("should create with default values", () => {
		// ...
	});
});

// ❌ 错误 - 不使用"应该"句式
describe("Transform 组件", () => {
	it("创建默认值", () => {  // ❌ 缺少"应该"
		// ...
	});
});
```

### 概念 3: 测试工厂模式

测试工厂提供可重用的测试数据生成器,大幅简化测试代码。

**三大类工厂**:
1. **TestFactories** - 创建实体、组件和基本操作
2. **ScenarioFactories** - 创建复杂的测试场景
3. **AppFactories** - 创建和配置 App 实例

**基础用法**:
```typescript
import { TestFactories, ScenarioFactories, AppFactories } from "@__tests__/test-factories";

// 创建单个实体
const entity = TestFactories.createTestEntity(world);

// 创建带组件的实体
const entity2 = TestFactories.createTestEntity(world, [
	Transform({ cframe: CFrame.identity, scale: Vector3.one }),
]);

// 批量创建实体
const entities = TestFactories.createTestEntities(world, 10, (index) => [
	Transform({
		cframe: new CFrame(index * 5, 0, 0),
		scale: Vector3.one,
	}),
]);

// 创建测试 App
const app = AppFactories.createTestApp();

// 创建带系统的 App
const app2 = AppFactories.createAppWithSystems(
	BuiltinSchedules.UPDATE,
	[system1, system2],
);
```

**完整文档**: 参见 `docs/test-factories-guide.md`

### 概念 4: 语义化常量

提取魔法数字为有意义的常量,提高代码可读性。

**命名规范**:
- 性能测试迭代次数: `{SCENARIO}_TEST_ITERATIONS`
- 时间和精度: `{UNIT}_DECIMAL_PLACES_{TYPE}`
- 阈值和限制: `{PURPOSE}_{TYPE}_THRESHOLD` 或 `MAX_{PURPOSE}_COUNT`
- 测试数据值: `TEST_{RESOURCE}_{PURPOSE}_VALUE`

**示例**:
```typescript
// ✅ 推荐 - 语义化常量
const TEST_RESOURCE_DEFAULT_VALUE = 0;
const TEST_RESOURCE_STANDARD_VALUE = 42;
const EXPECTED_ARRAY_INDEX_FIRST = 0;
const EXPECTED_ARRAY_INDEX_SECOND = 1;
const STANDARD_FRAME_TIME = 1 / 60;

it("应该使用默认值创建", () => {
	const resource = new TestResource(TEST_RESOURCE_DEFAULT_VALUE);
	expect(resource.value).to.equal(TEST_RESOURCE_DEFAULT_VALUE);
});

// ❌ 不推荐 - 魔法数字
it("应该使用默认值创建", () => {
	const resource = new TestResource(0);  // 0 是什么?
	expect(resource.value).to.equal(0);
});
```

**完整文档**: 参见 `docs/test-improvements-magic-numbers.md`

### 概念 5: 边界条件测试

为每个功能添加边界条件测试,包括零值、负值、极值、空值等。

**边界条件清单**:
- ✅ 零值 (0, "", [], undefined, null)
- ✅ 负值
- ✅ 最大值/最小值
- ✅ 空集合 ([], {})
- ✅ 单元素集合
- ✅ 大量元素 (1000+)
- ✅ 特殊值 (NaN, Infinity)

**示例**:
```typescript
describe("Axis 值限制", () => {
	it("应该限制超出上限的值", () => {
		axis.set(1.5);
		expect(axis.get()).to.equal(1.0);
	});

	it("应该限制超出下限的值", () => {
		axis.set(-1.5);
		expect(axis.get()).to.equal(-1.0);
	});

	it("应该保持边界值不变", () => {
		axis.set(1.0);
		expect(axis.get()).to.equal(1.0);

		axis.set(-1.0);
		expect(axis.get()).to.equal(-1.0);
	});

	it("应该处理零值", () => {
		axis.set(0);
		expect(axis.get()).to.equal(0);
	});

	it("应该处理未定义值", () => {
		axis.set(undefined as any);
		expect(axis.get()).to.equal(0);  // 默认值
	});
});
```

### 概念 6: 两步验证模式

先断言前置条件,再验证业务逻辑,避免假阳性。

**模式**:
```typescript
// ✅ 推荐 - 两步验证
it("应该在按下后立即检测为 justPressed", () => {
	// 第一步:验证初始状态
	expect(buttonInput.isPressed(TestButton.A)).to.equal(false);
	expect(buttonInput.justPressed(TestButton.A)).to.equal(false);

	// 执行操作
	buttonInput.press(TestButton.A);

	// 第二步:验证结果状态
	expect(buttonInput.isPressed(TestButton.A)).to.equal(true);
	expect(buttonInput.justPressed(TestButton.A)).to.equal(true);
});

// ❌ 不推荐 - 直接验证结果
it("应该检测按下", () => {
	buttonInput.press(TestButton.A);
	expect(buttonInput.isPressed(TestButton.A)).to.equal(true);
	// 如果初始状态就是 true,测试仍然通过(假阳性)
});
```

### 概念 7: 数据驱动测试

使用数据数组驱动测试,避免重复代码。

**示例**:
```typescript
// ✅ 推荐 - 数据驱动
it("应该正确限制各种输入值", () => {
	const testCases: Array<[number, number]> = [
		// [输入, 预期输出]
		[-1.5, -1.0],  // 超出下限
		[-1.0, -1.0],  // 边界值
		[-0.5, -0.5],  // 正常值
		[0.0, 0.0],    // 零值
		[0.5, 0.5],    // 正常值
		[1.0, 1.0],    // 边界值
		[1.5, 1.0],    // 超出上限
	];

	for (const [input, expected] of testCases) {
		axis.set(input);
		expect(axis.get()).to.equal(expected);
	}
});

// ❌ 不推荐 - 重复代码
it("应该限制负值", () => {
	axis.set(-1.5);
	expect(axis.get()).to.equal(-1.0);
});

it("应该限制正值", () => {
	axis.set(1.5);
	expect(axis.get()).to.equal(1.0);
});
// ... 更多重复
```

## 🔧 常用工具和 API

### TestEZ 断言 API

#### `expect(value).to.equal(expected)`
严格相等比较。

```typescript
expect(result).to.equal(42);
expect(name).to.equal("Player");
```

#### `expect(value).to.be.ok()`
检查值是否为真(非 nil、非 false)。

```typescript
expect(entity).to.be.ok();
expect(resource).to.be.ok();
```

#### `expect(value).to.be.near(expected, epsilon)`
浮点数近似比较。

```typescript
expect(0.1 + 0.2).to.be.near(0.3, 0.0001);
```

#### `expect(fn).to.throw()`
验证函数抛出错误。

```typescript
expect(() => {
	validateInput(-1);
}).to.throw();

// 验证错误消息
expect(() => {
	validateInput(-1);
}).to.throw("值不能为负数");
```

#### `expect(value).to.be.a(typeName)`
类型检查。

```typescript
expect(name).to.be.a("string");
expect(count).to.be.a("number");
```

#### `expect(value).to.be.greaterThan(expected)`
数值比较。

```typescript
expect(count).to.be.greaterThan(0);
expect(duration).to.be.lessThan(0.1);
```

### 测试工厂工具

#### `CallCounter`
统计函数调用次数。

```typescript
import { CallCounter } from "@__tests__/test-factories";

const counter = new CallCounter();
const countingSystem = counter.createSystem();

app.addSystems(BuiltinSchedules.UPDATE, countingSystem);
app.update();
app.update();

expect(counter.getCount()).to.equal(2);
counter.reset();
```

#### `EventCollector`
收集和验证事件。

```typescript
import { EventCollector } from "@__tests__/test-factories";

const collector = new EventCollector<TestEvent>();

collector.add({ type: "test", value: 42 });

const events = collector.getEvents();
expect(events.size()).to.equal(1);
```

#### `DelayedExecutor`
测试延迟执行逻辑。

```typescript
import { DelayedExecutor } from "@__tests__/test-factories";

const executor = new DelayedExecutor(5);  // 延迟 5 帧
let executed = false;

const delayedSystem = () => {
	executor.update(() => {
		executed = true;
	});
};

for (let i = 0; i < 4; i++) {
	app.update();
	expect(executed).to.equal(false);
}

app.update();  // 第 5 帧
expect(executed).to.equal(true);
```

## ✅ 最佳实践

完整的最佳实践请参考 `docs/testing-best-practices.md`。

### 1. 使用测试工厂

```typescript
// ✅ 推荐 - 使用工厂
const entity = ScenarioFactories.createTransformEntity(world);

// ❌ 不推荐 - 手动创建
const entity = world.spawn();
world.insert(entity, Transform({ cframe: CFrame.identity, scale: Vector3.one }));
```

### 2. 提取魔法数字

```typescript
// ✅ 推荐 - 语义化常量
const TEST_VALUE = 42;
expect(result).to.equal(TEST_VALUE);

// ❌ 不推荐 - 魔法数字
expect(result).to.equal(42);
```

### 3. 完整的边界测试

```typescript
describe("边界条件", () => {
	it("应该处理零值", () => { ... });
	it("应该处理负值", () => { ... });
	it("应该处理最大值", () => { ... });
	it("应该处理空集合", () => { ... });
});
```

### 4. 两步验证

```typescript
it("应该更新值", () => {
	// 验证初始状态
	expect(value).to.equal(0);

	// 执行操作
	updateValue(10);

	// 验证结果
	expect(value).to.equal(10);
});
```

### 5. 学习参考标准

推荐学习的测试文件:
- `src/bevy_input/__tests__/button-input.spec.ts` - 状态机测试典范
- `src/bevy_input/__tests__/gamepad.spec.ts` - 完整功能覆盖
- `src/bevy_ecs/__tests__/query-extended.spec.ts` - 边界条件测试
- `src/bevy_app/__tests__/app.spec.ts` - 语义化常量使用

## ⚠️ 严禁反模式

详细反模式请参考 `docs/testing-best-practices.md`。

### 1. 空测试/无意义测试

```typescript
// ❌ 反模式:只测试存在性
it("应该创建 Transform", () => {
	const transform = new Transform();
	expect(transform).to.be.ok();  // ❌ 只检查对象存在
});

// ✅ 正确:验证具体功能
it("应该使用默认值创建 Transform", () => {
	const transform = new Transform();
	expect(transform.position).to.equal(Vector3.zero);
	expect(transform.rotation).to.equal(Vector3.zero);
	expect(transform.scale).to.equal(Vector3.one);
});
```

### 2. 条件验证

```typescript
// ❌ 反模式:条件断言
it("应该返回玩家", () => {
	const player = getPlayer();

	if (player) {  // ❌ 如果 player 是 undefined,测试仍然通过
		expect(player.Name).to.be.a("string");
	}
});

// ✅ 正确:强制断言
it("应该返回玩家", () => {
	const player = getPlayer();

	expect(player).to.be.ok();
	expect(player!.Name).to.be.a("string");
});
```

### 3. pcall 断言失败

```typescript
// ❌ 反模式:使用 pcall 验证错误
it("应该在无效输入时抛出错误", () => {
	const [success, err] = pcall(() => {
		validateInput(-1);
	});
	expect(success).to.equal(false);  // ❌ 假阳性风险
});

// ✅ 正确:使用 expect().to.throw()
it("应该在无效输入时抛出错误", () => {
	expect(() => {
		validateInput(-1);
	}).to.throw();
});
```

### 4. try-catch 包裹 hook

```typescript
// ❌ 反模式:用 try-catch 包裹 hook
it("应该使用 hook", () => {
	const system = (world: World) => {
		try {
			const state = useHookState({});  // ❌ 每次都创建新闭包,内存泄漏
			state.value = 42;
		} catch (err) {
			print("Hook error", err);
		}
	};
});

// ✅ 正确:不包裹 hook
it("应该使用 hook", () => {
	const system = (world: World) => {
		const state = useHookState({ value: 0 });  // ✅ 正常使用
		state.value = 42;
	};
});
```

## 💡 完整示例

### 示例 1: 组件测试

参考 `docs/testing-best-practices.md` 中的组件测试模板。

### 示例 2: 系统测试

参考 `docs/testing-best-practices.md` 中的系统测试模板。

### 示例 3: 使用测试工厂

参考 `docs/test-factories-guide.md` 中的示例。

## 🔗 相关资源

### 相关文档
- [测试编写最佳实践](../../testing-best-practices.md) - 完整的最佳实践指南
- [测试工厂使用指南](../../test-factories-guide.md) - 测试工厂详细文档
- [魔法数字提取改进](../../test-improvements-magic-numbers.md) - 语义化常量指南

### 相关 Skills
- [integration-testing](../integration-testing/SKILL.md) - 集成测试
- [cloud-testing](../cloud-testing/SKILL.md) - 云端测试

### 外部文档
- [TestEZ 文档](https://roblox.github.io/testez/) - Roblox 测试框架
- [@rbxts/testez API](https://www.npmjs.com/package/@rbxts/testez) - TypeScript 类型定义

## 📋 测试编写检查清单

在提交 PR 前,请确保通过以下检查:

### 基础检查
- [ ] 使用正确的导出格式 (`export = () => {}`)
- [ ] 所有测试用例使用中文命名
- [ ] `it` 使用"应该..."句式
- [ ] 文件以换行符 `\n` 结尾
- [ ] 所有导出函数有 JSDoc(参数使用 `-` 格式)

### 测试结构
- [ ] 有 `beforeEach`/`afterEach` 清理逻辑
- [ ] 每个 `describe` 块功能明确、分组合理
- [ ] 测试相互独立,没有依赖关系
- [ ] 使用嵌套 `describe` 组织相关测试

### 测试内容
- [ ] 提取了魔法数字为语义化常量
- [ ] 包含边界条件测试
- [ ] 使用两步验证
- [ ] 没有空测试或占位符
- [ ] 没有条件验证

### 错误处理
- [ ] 使用 `error()` 而非 `throw new Error()`
- [ ] 使用 `expect().to.throw()` 而非 `pcall`
- [ ] 验证了错误情况和异常输入

### Roblox-TS 规范
- [ ] 不使用 `task.wait()` 或其他 yield 函数
- [ ] 使用 `loop.step()` 或 `os.clock()` 替代异步等待
- [ ] 没有用 `try-catch` 包裹 hook

### 代码质量
- [ ] 没有调试代码残留
- [ ] 没有预期失败的测试
- [ ] 变量命名清晰
- [ ] 使用数据驱动测试减少重复代码

### 执行验证
- [ ] 运行 `npm test` 确保所有测试通过
- [ ] 运行 `npm run build` 确保编译无错误

## 🎓 进阶主题

### 性能测试

```typescript
const ITERATIONS = 10000;

it("应该在 10ms 内创建 1000 个组件", () => {
	// 预热
	for (let i = 0; i < 100; i++) {
		createComponent(i);
	}

	// 测量
	const startTime = os.clock();
	for (let i = 0; i < ITERATIONS; i++) {
		createComponent(i);
	}
	const duration = os.clock() - startTime;

	expect(duration).to.be.lessThan(0.01);  // 10ms
});
```

### 浮点数比较

```typescript
it("应该计算正确的浮点数", () => {
	const result = 0.1 + 0.2;

	// ❌ 错误:浮点数精度问题
	expect(result).to.equal(0.3);  // 可能失败

	// ✅ 正确:使用容差
	expect(result).to.be.near(0.3, 0.0001);
});
```

### 组织大型测试文件

```typescript
export = () => {
	describe("主模块", () => {
		// 共享的 setup
		let sharedResource: Resource;

		beforeEach(() => {
			sharedResource = createResource();
		});

		describe("功能组 1", () => {
			describe("子功能 1.1", () => {
				it("应该...", () => { ... });
			});

			describe("子功能 1.2", () => {
				it("应该...", () => { ... });
			});
		});

		describe("功能组 2", () => {
			// 特定的 setup
			let specificResource: SpecificResource;

			beforeEach(() => {
				specificResource = createSpecific();
			});

			it("应该...", () => { ... });
		});

		describe("边界条件", () => {
			it("应该处理零值", () => { ... });
			it("应该处理负值", () => { ... });
		});
	});
};
```

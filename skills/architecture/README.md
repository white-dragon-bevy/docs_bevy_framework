# White Dragon Bevy 架构文档

本目录包含 White Dragon Bevy 框架的架构设计文档，涵盖核心设计理念、扩展机制和开发规范。

## 📚 文档索引

### 核心设计

#### [设计哲学](./design-philosophy.md)

记录了 Rust Bevy 框架的核心设计理念，用于指导 TypeScript 移植版本的开发。

**包含内容**:
- ECS (Entity Component System) 基础
- World 与资源系统
- 插件系统设计
- 变更检测机制
- 系统访问原则
- 设计决策指南

**适合阅读对象**:
- 想要理解框架设计决策的开发者
- 需要深入了解 Bevy 架构的贡献者
- 从 Rust Bevy 迁移的开发者

**关键主题**:
- 数据中心化原则（World 是唯一真相源）
- Resources 本质（存储在 World 中的全局单例）
- Events 定位（特殊的 Resource）
- 统一注入，不同访问
- Change Detection vs Events

---

#### [World API 对比](./world-api-comparison.md)

对比 Rust Bevy 的 World API 和我们的 TypeScript 实现。

**包含内容**:
- Entity 管理 API 对比
- Component 管理 API 对比
- Resource 管理 API 对比
- Query 查询 API 对比
- Schedule 调度 API 对比
- Change Detection API 对比
- Event & Observer API 对比
- 架构差异分析

**适合阅读对象**:
- 熟悉 Rust Bevy 的开发者
- 需要了解 API 差异的迁移者
- 想要理解实现限制的贡献者

**总体实现率**: 43% (25/58 方法)

**独有功能**:
- Message 系统（领先 Bevy 0.17）
- 增强的 Resource API（withResource、withResourceMut）
- QueryBuilder 链式调用
- CommandBuffer 延迟执行

---

### 扩展机制

#### [插件扩展系统](./plugin-extensions.md)

介绍如何创建和使用插件扩展系统，实现类型安全的插件功能扩展。

**包含内容**:
- 扩展系统概述和核心特性
- 创建插件扩展（定义接口、实现扩展、导出接口）
- 使用插件扩展（context 快捷方式、app 资源访问）
- 多插件扩展（独立访问、扩展组合）
- 实际示例（LogPlugin 扩展）
- 最佳实践和故障排除

**适合阅读对象**:
- 插件开发者
- 需要提供扩展功能的模块作者
- 想要理解扩展机制的用户

**核心特性**:
- ✅ 类型安全（完整的 TypeScript 类型推导）
- ✅ 便捷访问（通过 context.getExtension<T>()）
- ✅ 资源化管理（扩展作为资源存储）
- ✅ 类型明确（通过泛型参数 Plugin<T>）
- ✅ 代码提示（IDE 中有完整的智能提示）

**访问方式**:
- `context.getExtension<T>()` - 系统中使用（推荐）
- `app.getResource<T>()` - 插件方法、测试中使用

---

#### [App 扩展指南](./app-extension-guide.md)

通过 metatable 实现类似 Rust trait 的扩展模式，为 App 类添加模块化功能。

**包含内容**:
- App 扩展机制概述
- 快速开始（5 分钟上手）
- 关键概念（扩展注册、类型声明、自动导入）
- 详细教程（完整示例）
- 高级用法（泛型扩展、状态访问、条件扩展）
- 最佳实践和常见问题
- 工作原理（核心实现、Lua 类继承机制）

**适合阅读对象**:
- 需要为 App 添加扩展方法的开发者
- 插件作者（提供便捷 API）
- 想要理解扩展机制的贡献者

**核心特性**:
- ✅ 非侵入式（不修改 App 源码）
- ✅ 类型安全（完整的 TypeScript 类型支持）
- ✅ 链式调用（支持流畅的 API 风格）
- ✅ 继承友好（子类自动继承扩展方法）
- ✅ 模块化（每个功能模块独立注册）

**使用示例**:
```typescript
// 注册扩展方法
setAppExtension("enableDebug", function(this: App, level: number): App {
	this.addPlugin(new DebugPlugin(level));
	return this;
});

// 类型声明
declare module "@white-dragon-bevy/bevy_app/app" {
	interface App {
		enableDebug(level: number): this;
	}
}

// 使用
app.enableDebug(2).run();
```

---

### 开发规范

#### [插件开发规范](./plugin-development-specification.md)

完整的插件开发标准和最佳实践。

**包含内容**:
- 插件规范总则（命名、导入、目录组织、导出）
- 插件结构规范（接口方法、生命周期、唯一性、Roblox 上下文）
- 扩展系统规范（定义、实现、使用、命名）
- 系统注册规范（调度阶段、命名、配置、依赖顺序）
- 资源管理规范（定义、注册、访问、TypeDescriptor）
- 插件依赖规范（依赖声明、添加顺序、重复处理）
- 错误处理规范（系统级错误、build 方法、日志、防抖打印）
- 测试规范（单元测试结构、文件组织、必须测试的内容）
- 代码示例（最小插件、数据管理、状态管理、完整插件）
- 检查清单（发布前检查、代码审查）

**适合阅读对象**:
- 插件开发者（必读）
- 贡献者（编写符合规范的代码）
- 代码审查者

**核心原则**:
- **类型安全优先** - 充分利用 TypeScript 和泛型扩展
- **明确胜于隐含** - 清晰的命名和结构
- **防御性编程** - 总是检查和验证
- **模块化设计** - 高内聚低耦合
- **文档完善** - 代码即文档，文档即规范

**扩展系统新模式**:
- 使用 `Plugin<ExtensionType>` 泛型接口
- 实现 `getExtension(app: App): ExtensionType`
- 定义 `extensionDescriptor` 属性
- 直接声明方法签名（不使用 ExtensionFactory）

---

## 📖 阅读建议

### 初学者路径

1. 先阅读 [快速入门指南](../getting-started/SKILL.md)
2. 然后查看 [设计哲学](./design-philosophy.md) 了解核心理念
3. 需要时参考 [World API 对比](./world-api-comparison.md) 理解 API 差异

### 插件开发者路径

1. 阅读 [插件开发规范](./plugin-development-specification.md)（必读）
2. 学习 [插件扩展系统](./plugin-extensions.md) 提供扩展功能
3. 参考 [App 扩展指南](./app-extension-guide.md) 添加 App 方法

### 贡献者路径

1. 理解 [设计哲学](./design-philosophy.md) 的核心理念
2. 查看 [World API 对比](./world-api-comparison.md) 了解实现状态
3. 遵循 [插件开发规范](./plugin-development-specification.md) 的标准

### Rust Bevy 开发者路径

1. 查看 [World API 对比](./world-api-comparison.md) 了解 API 差异
2. 阅读 [设计哲学](./design-philosophy.md) 理解移植决策
3. 参考 [插件扩展系统](./plugin-extensions.md) 了解新增特性

---

## 🔗 相关资源

### Core Skills

- [@bevy-app](../core-skills/bevy-app/SKILL.md) - 应用程序和插件系统
- [@bevy-ecs](../core-skills/bevy-ecs/SKILL.md) - ECS 核心系统
- [@bevy-time](../core-skills/bevy-time/SKILL.md) - 时间系统
- [@bevy-state](../core-skills/bevy-state/SKILL.md) - 状态管理
- [@bevy-log](../core-skills/bevy-log/SKILL.md) - 日志系统

### 快速入门

- [快速入门指南](../getting-started/SKILL.md) - 5 分钟开始使用框架

### 示例代码

- `src/__examples__/` - 各种实际示例
- `src/bevy_app/__tests__/` - App 测试用例
- `src/bevy_ecs/__tests__/` - ECS 测试用例

### 外部文档

- [Rust Bevy 官方文档](https://docs.rs/bevy/latest/bevy/)
- [@rbxts/matter 文档](https://eryn.io/matter/)
- [roblox-ts 文档](https://roblox-ts.com/)

---

## 📝 文档更新日志

### 2025-10-20
- 创建 architecture 目录
- 整理现有架构文档到统一目录
- 创建 README.md 索引文件
- 从 `docs/` 迁移:
  - bevy-design-philosophy.md → design-philosophy.md
  - plugin-extensions.md → plugin-extensions.md
  - app-extension-guide.md → app-extension-guide.md
  - plugin-development-specification.md → plugin-development-specification.md
- 从 `docs/manual/` 迁移:
  - world-api-comparison.md → world-api-comparison.md

---

**提示**: 本目录的文档会随着框架发展持续更新。如发现文档过时或有改进建议，欢迎提交 Issue 或 PR。

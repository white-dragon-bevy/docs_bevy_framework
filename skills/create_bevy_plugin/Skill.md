---
name: create bevy plugin & system plugins
description: 创建, 更新 bevy 插件和 bevy 系统插件集的技能.
---


# 插件

## 插件结构示例
```
some-plugin/
├── __tests__                    # ✅ 测试目录
├── __examples__                 # ✅ 例子目录
├── contracts                    # ✅ 契约目录（纯数据）
│   ├── components/
│   ├── messages/
│   ├── types/
│   └── index.ts                 # 导出所有契约
├── index.ts                     # ✅ 导出契约
├── plugins.ts                   # ✅ 导出插件
└── helpers.ts                   # ✅ 导出帮助方法
```



## 契约定义（Contracts）

### ✅ 允许的内容

`contracts/` 目录**只能包含纯数据定义**：

- `components/` - 组件定义（纯数据类）
- `messages/` - 消息定义（纯数据类）
- `types/` - TypeScript 类型定义
- `index.ts` - 仅用于导出上述定义

以上目录可以用文件代替,比如:
- `components.ts`
- `messages.ts`
- `types.ts`

### ❌ 禁止的内容

- ❌ `plugin.ts` - 插件类（包含业务逻辑）
- ❌ `system/` - 系统函数（包含业务逻辑）
- ❌ `config/` - 配置逻辑
- ❌ 任何包含业务逻辑的代码

### 为什么 contracts 必须纯净？

1. **避免循环依赖** - 契约是多个模块共同依赖的接口
2. **依赖关系清晰** - 契约 ← 业务逻辑（单向）
3. **易于重用** - 纯数据定义可以安全地被任意模块导入

## 导出规则

### 系统的 `index.ts` - 只导出契约

```typescript
// input-system/index.ts
/**
 * 输入系统 - 契约导出
 * 插件类和插件组请从 ./plugins 导入
 */
export { Action, ActionPressedMessage } from "./contracts";
```

### 系统的 `plugins.ts` - 导出所有插件

```typescript
// some-plugin/plugins.ts
/**
 * 插件示例 - 插件导出
 * 契约定义请从 ./index 导入
 */
export { SomePlugin } from "./some-plugin";
```

### 导入路径清晰

```typescript
// 导入契约（数据）
import { CastSkillMessage } from "@bevy-plugins/combat-system";

// 导入插件（逻辑）
import { SkillPlugin } from "@bevy-plugins/combat-system/plugins";
```


## 常见错误与解决方案

### ❌ 错误 1：在 index.ts 中导出插件

```typescript
// ❌ 错误
export { CombatStats } from "./contracts";
export { SkillPlugin } from "./skill";  // 不应导出插件

// ✅ 正确 - 使用 plugins.ts
export { SkillPlugin } from "./skill";
```

### ❌ 错误 2：contracts 中包含业务逻辑

```typescript
// ❌ 错误 - 不应在契约中包含业务方法
export class Health {
    takeDamage(amount: number) { /* ... */ }
}

// ✅ 正确 - 纯数据
export class Health {
    constructor(public current: number, public max: number) {}
}
```

### ❌ 错误 3：循环依赖

```typescript
// ❌ 错误 - index.ts 导出插件导致循环
// input-system/index.ts
export { InputPlugin } from "./input";  // InputPlugin 依赖 combat-system

// ✅ 正确 - index.ts 只导出契约
export { Action } from "./contracts";
```

## 检查清单

### 契约纯净性
- [ ] `contracts/` 目录只包含纯数据定义
- [ ] `contracts/` 中没有 `plugin.ts`、`system/`、`config/`
- [ ] `contracts/` 中的类只有构造函数和属性

### 导出规则
- [ ] `index.ts` 只导出契约定义
- [ ] `index.ts` 不导出任何插件类
- [ ] `plugins.ts` 导出所有功能插件和插件组

### 依赖关系
- [ ] 没有循环依赖
- [ ] 跨系统依赖只通过契约（从其他系统的 index.ts 导入）

### 编译检查
- [ ] `npm run build` 无错误
- [ ] 无 TypeScript 类型错误



## 总结

✅ **清晰的职责分离** - contracts = 数据，plugins = 逻辑
✅ **无循环依赖** - 单向依赖流，契约作为稳定接口
✅ **易于维护** - 新系统遵循相同模式
✅ **类型安全** - TypeScript 编译时错误发现



# 系统插件集

`系统插件集` 是为了实现业务的系统需求, 而创建的一系列的 `bevy` 插件集合.

每个`bevy`插件的创建规则, 参考: .claude\commands\bevy\create-plugin.md

**结构示例**:
```
some-system-plugins/
├── __tests__                    # ✅ 测试目录
├── __examples__                 # ✅ 例子目录
├── contracts/                   # ✅ 契约目录（纯数据）
│   ├── components/
│   ├── messages/
│   ├── types/
│   └── index.ts                 # 导出所有契约
│
├── skill/                       # ✅ 功能插件（业务逻辑）
│   ├── systems/
│   ├── plugin.ts
│   └── index.ts
│
├── hit-test/                    # ✅ 功能插件
├── damage/                      # ✅ 功能插件
├── combat-feedback/             # ✅ 功能插件
│
├── index.ts                     # ✅ 导出契约
├── plugins.ts                   # ✅ 导出插件
├── helpers.ts                   # ✅ 导出帮助方法
└── plugin-group.ts              # ✅ 插件组
```

可以看出, `系统插件集`的结构与 `bevy插件`的结构非常相似.

## 系统插件集与插件的区别

- `系统插件集` 没有业务代码, 只是整理 `插件` 的导出
- `系统插件集` 的 `contracts` 会隐藏 `插件` 的细节, 仅导出必要部分. 

# 文档
应在插件或插件集根目录包含 `README.md`, 结构:
- 插件或系统插件集概述
- 系统插件集插件组成
- 重要的数据流, 严格服从 `插件数据流规范`


# others
## references
- **插件数据流规范**: './reference/plugin-data-flow.md`

## examples
- **插件例子**: './examples/plugin-example`
- **系统插件集例子**: './examples/system-example`

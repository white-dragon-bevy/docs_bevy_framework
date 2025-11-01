# App 扩展设计方案

## 核心原则

**95% 的插件使用 Plugin + Resources，5% 使用 Ext 对象扩展。**

由于 roblox-ts 不支持 `prototype` 操作，我们无法完全模拟 Rust Bevy 的 Trait 系统，因此采用 Ext 对象作为次优方案。

## 快速决策

```
需要为插件添加功能？
│
├─ Rust Bevy 中存在对应的 AppExt trait？
│   ├─ 是（如 AppExtStates） → 创建 Ext 对象
│   └─ 否 → 使用 Resources
│
└─ 功能需要多个复杂操作？
    ├─ 是 → 考虑创建 Ext
    └─ 否 → 使用 Resources

默认答案：使用 Resources
```

## Bevy 的实际设计

### 官方提供的 AppExt Trait（极少）

| Trait | 模块 | 用途 |
|-------|------|------|
| `AppExtStates` | bevy_state | 状态管理（init/insert/addComputed/addSub） |

**官方不提供的**：AppExtLog、AppExtTime、AppExtWindow、AppExtRender 等。

### 两种设计模式

#### 模式 1：Plugin + Resources（95%）

```rust
// Rust Bevy 实际用法
app.add_plugins(LogPlugin::default())
   .insert_resource(LogSettings { level: Level::Debug });
```

#### 模式 2：AppExt Trait（5%）

```rust
// 仅在极少数情况
app.init_state::<GameState>()
   .insert_state(GameState::Menu);
```

## TypeScript 实现

### roblox-ts 技术限制

| 特性 | JavaScript | roblox-ts | 影响 |
|------|-----------|-----------|------|
| `prototype` | ✅ | ❌ | 无法用模块增强 |
| 普通对象 | ✅ | ✅ | Ext 对象可行 |
| `as const` | ✅ | ✅ | 确保不可变 |

**结论**：只能使用 Ext 对象，无法让方法直接出现在 App 上。

### API 对比

| Rust Bevy | 理想 TypeScript（不可行） | 实际 TypeScript（可行） |
|-----------|------------------------|---------------------|
| `app.init_state()` | `app.initState()` ❌ | `StateExt.init(app, ...)` ✅ |
| 原生链式调用 | 原生链式调用 ❌ | 手动嵌套 ✅ |

## 实现指南

### 标准插件（95%）：Plugin + Resources

**文件结构**：
```
bevy_log/
├── lib.ts
├── index.ts
└── __tests__/
```

**实现**：
```typescript
// bevy_log/lib.ts

export enum Level {
    Debug = "Debug",
    Info = "Info",
    Warn = "Warn",
    Error = "Error",
}

export class LogSettings {
    public level: Level = Level.Info;
    public filter: string = "";

    public constructor(options?: { level?: Level; filter?: string }) {
        if (options?.level !== undefined) this.level = options.level;
        if (options?.filter !== undefined) this.filter = options.filter;
    }
}

export class LogPlugin implements Plugin {
    private readonly settings: LogSettings;

    public constructor(settings?: LogSettings) {
        this.settings = settings ?? new LogSettings();
    }

    public build(app: App): void {
        app.insertResource(this.settings);
        // 添加系统...
    }
}
```

```typescript
// bevy_log/index.ts
export { LogPlugin, LogSettings, Level } from './lib';
```

**使用**：
```typescript
// 方式 1：构造函数配置（推荐）
app.addPlugin(new LogPlugin(new LogSettings({ level: Level.Debug })));

// 方式 2：通过 Resource 配置
app.addPlugin(new LogPlugin());
const settings = app.getResource<LogSettings>();
if (settings) {
    settings.level = Level.Debug;
}
```

### 扩展插件（5%）：Plugin + Resources + Ext

**何时创建 Ext**：
1. ✅ Rust Bevy 官方有对应 Trait（如 AppExtStates）
2. ✅ 需要多个复杂链式操作
3. ✅ 无法通过 Resource 简洁表达

**文件结构**：
```
bevy_state/
├── lib.ts
├── app-ext.ts
├── index.ts
└── __tests__/
```

**实现**：
```typescript
// bevy_state/lib.ts

export class StatePlugin implements Plugin {
    public build(app: App): void {
        app.insertResource(new StateManager());
    }
}

class StateManager {
    // 状态管理逻辑
}
```

```typescript
// bevy_state/app-ext.ts

import type { App } from '../bevy_app';

/**
 * 状态扩展（对应 Rust AppExtStates）
 *
 * ⚠️ 注意：仅在 Bevy 官方有对应 Trait 时创建
 */
export const StateExt = {
    /**
     * 初始化状态
     * @param app - App 实例
     * @param defaultState - 默认状态工厂函数
     * @returns App 实例
     */
    init<S>(app: App, defaultState: () => S): App {
        const manager = app.getResource<StateManager>();
        if (!manager) {
            error("StatePlugin not installed!");
        }

        const state = defaultState();
        app.insertResource(state);
        return app;
    },

    /**
     * 插入状态
     * @param app - App 实例
     * @param state - 状态值
     * @returns App 实例
     */
    insert<S>(app: App, state: S): App {
        const manager = app.getResource<StateManager>();
        if (!manager) {
            error("StatePlugin not installed!");
        }

        app.insertResource(state);
        return app;
    },

    /**
     * 添加计算状态
     * @param app - App 实例
     * @returns App 实例
     */
    addComputed<S>(app: App): App {
        // 实现逻辑
        return app;
    },

    /**
     * 添加子状态
     * @param app - App 实例
     * @returns App 实例
     */
    addSub<S>(app: App): App {
        // 实现逻辑
        return app;
    },
} as const;
```

```typescript
// bevy_state/index.ts
export { StatePlugin } from './lib';
export { StateExt } from './app-ext';
```

**使用**：
```typescript
import { StatePlugin, StateExt } from '@bevy_state';

enum GameState {
    Menu = "Menu",
    Playing = "Playing",
}

const app = new App().addPlugin(new StatePlugin());

StateExt.init(app, () => GameState.Menu);
StateExt.insert(app, GameState.Playing);
```

## 最佳实践

### 1. 优先使用 Resources

```typescript
// ✅ 推荐
const settings = app.getResource<LogSettings>();
settings.level = Level.Debug;

// ❌ 不推荐（LogExt 不存在于 Bevy）
// LogExt.setLevel(app, Level.Debug);
```

### 2. Ext 方法必须返回 App

```typescript
// ✅ 正确
export const StateExt = {
    init<S>(app: App, defaultState: () => S): App {
        // ...
        return app;  // 支持链式调用
    },
} as const;

// ❌ 错误
export const StateExt = {
    init<S>(app: App, defaultState: () => S): void {
        // 无法链式调用
    },
} as const;
```

### 3. 检查插件是否安装

```typescript
export const StateExt = {
    init<S>(app: App, defaultState: () => S): App {
        const manager = app.getResource<StateManager>();
        if (!manager) {
            error("StatePlugin not installed!");
        }
        // ...
    },
} as const;
```

### 4. 使用 as const

```typescript
// ✅ 正确：防止意外修改
export const StateExt = { /* ... */ } as const;

// ❌ 错误：可能被修改
export const StateExt = { /* ... */ };
```

### 5. 提供完整的 JSDoc

```typescript
export const StateExt = {
    /**
     * 初始化状态
     *
     * 对应 Rust Bevy 的 `App::init_state()`
     *
     * @param app - App 实例
     * @param defaultState - 默认状态工厂函数
     * @returns App 实例（支持链式调用）
     * @example
     * ```typescript
     * StateExt.init(app, () => GameState.Menu);
     * ```
     */
    init<S>(app: App, defaultState: () => S): App {
        // ...
    },
} as const;
```

## 命名约定

### Ext 对象

| TypeScript  | Rust Bevy       | 是否创建？ |
|-------------|-----------------|---------|
| `StateExt`  | `AppExtStates`  | ✅ 创建   |
| ~~LogExt~~  | ~~AppExtLog~~   | ❌ 不创建 |
| ~~TimeExt~~ | ~~AppExtTime~~  | ❌ 不创建 |

### 方法

| Rust Bevy | TypeScript |
|-----------|------------|
| `init_state` | `StateExt.init` |
| `insert_state` | `StateExt.insert` |
| `add_computed_state` | `StateExt.addComputed` |
| `add_sub_state` | `StateExt.addSub` |

### 文件

| 文件 | 用途 |
|------|------|
| `lib.ts` | 插件核心（Plugin、Resources） |
| `app-ext.ts` | Ext 对象（极少使用） |
| `index.ts` | 统一导出 |

## 常见问题

### Q: 为什么不为所有插件创建 Ext？

**A**: Rust Bevy 只为极少数插件提供 AppExt trait。95% 的插件通过 Resources 配置。

### Q: 为什么不能用模块增强？

**A**: 需要 `prototype` 操作，roblox-ts 不支持：
```typescript
// ❌ roblox-ts 不支持
App.prototype.initState = function() { /* ... */ };
```

### Q: Ext API 不如 Rust 优雅，能改进吗？

**A**: 这是 roblox-ts 的技术限制。可以通过变量改善：
```typescript
// 方式 1：接受限制
StateExt.init(app, () => GameState.Menu);

// 方式 2：使用变量
let a = app;
a = StateExt.init(a, () => GameState.Menu);
a = StateExt.insert(a, GameState.Playing);
```

### Q: LogPlugin 需要 Ext 吗？

**A**: 不需要。Rust Bevy 的 LogPlugin 不提供 AppExtLog，通过 LogSettings Resource 配置。

### Q: 为什么 StateExt 是例外？

**A**: Rust Bevy 官方有 AppExtStates trait。状态管理需要多个复杂操作，通过 Ext 提供更清晰的 API。

## 设计对比

### 不可行的方案

```typescript
// ❌ 方案 1：继承
class StateApp extends App {
    // 问题：破坏 App 单一性，难以组合多个插件
}

// ❌ 方案 2：模块增强
App.prototype.initState = function() { /* ... */ };
// 问题：roblox-ts 不支持 prototype

// ❌ 方案 3：装饰器
@addStateMethods
class App { }
// 问题：roblox-ts 装饰器支持有限
```

### 可行的方案

```typescript
// ✅ Ext 对象
export const StateExt = {
    init<S>(app: App, defaultState: () => S): App {
        return app;
    },
} as const;

// 优点：
// - 简单、可靠
// - roblox-ts 完全支持
// - 易于理解和维护
```

## 参考资源

- [Bevy AppExtStates](https://docs.rs/bevy/latest/bevy/state/prelude/trait.AppExtStates.html)
- [roblox-ts 限制](https://roblox-ts.com/docs/guides/typescript-transformers)
- [TypeScript const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)

## 总结

| 维度 | 方案 |
|------|------|
| **默认选择** | Plugin + Resources（95%） |
| **特殊情况** | Plugin + Ext（5%，仅当 Bevy 官方有 Trait） |
| **技术限制** | roblox-ts 不支持 prototype |
| **次优方案** | Ext 对象（虽不完美但可行） |
| **核心理念** | 遵循 Bevy 设计哲学：极少扩展，主要用 Resources |

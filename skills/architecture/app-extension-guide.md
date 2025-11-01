# App 扩展机制使用指南

> 通过 metatable 实现类似 Rust trait 的扩展模式，为 App 类添加模块化功能

## 📖 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [关键概念](#关键概念)
- [详细教程](#详细教程)
- [完整示例](#完整示例)
- [高级用法](#高级用法)
- [最佳实践](#最佳实践)
- [工作原理](#工作原理)
- [调试指南](#调试指南)
- [常见问题](#常见问题)
- [参考资料](#参考资料)

---

## 概述

App 扩展机制允许你在**不修改 `App` 类源代码**的情况下为其添加新方法，实现模块化和可扩展的架构。

### 核心特性

- ✅ **非侵入式**: 不修改 App 源码
- ✅ **类型安全**: 完整的 TypeScript 类型支持
- ✅ **链式调用**: 支持流畅的 API 风格
- ✅ **继承友好**: 子类自动继承扩展方法
- ✅ **模块化**: 每个功能模块独立注册

### 设计理念

类似于 Rust 的 trait 系统：

```rust
// Rust: trait 扩展
impl AppExtStates for App {
    fn init_state<S: FreelyMutableState>(&mut self, state: S) -> &mut Self {
        // ...
    }
}
```

```typescript
// TypeScript: 扩展方法
setAppExtension("initState", function(this: App, state: S): App {
    // ...
});
```

---

## 快速开始

### 5 分钟上手

```typescript
// 1. 导入现有扩展
import { App } from "@rbxts/bevy_app";
import "@rbxts/bevy_state/app";  // 自动注册状态管理扩展

// 2. 使用扩展方法
const app = new App();
app.initState(() => GameState.Menu)  // 扩展方法
   .addPlugin(myPlugin)              // 原生方法
   .run();
```

### 创建自己的扩展（3 步骤）

```typescript
// 步骤 1: 注册方法
import { setAppExtension } from "@rbxts/bevy_app/app-extension";
import type { App } from "@rbxts/bevy_app/app";

setAppExtension("enableDebug", function(this: App, level: number): App {
    print(`Debug mode enabled: level ${level}`);
    return this;
});

// 步骤 2: 类型声明
declare module "@rbxts/bevy_app/app" {
    interface App {
        enableDebug(level: number): this;
    }
}

// 步骤 3: 使用
app.enableDebug(2);  // ✅ 完整的类型支持和智能提示
```

---

## 关键概念

### 1. 扩展注册 (`setAppExtension`)

将方法添加到 App 类：

```typescript
setAppExtension(
    "methodName",           // 方法名
    function(this: App) {   // 方法实现，this 指向 App 实例
        return this;        // 返回 this 支持链式调用
    }
);
```

### 2. 类型声明 (`declare module`)

让 TypeScript 编译器识别扩展方法：

```typescript
declare module "@rbxts/bevy_app/app" {
    interface App {
        methodName(): this;
    }
}
```

### 3. 自动导入

扩展方法在模块导入时自动注册：

```typescript
import "@rbxts/bevy_state/app";  // 注册发生在这里
// 之后所有 App 实例都能使用扩展方法
```

---

## 详细教程

### 示例：为 App 添加日志功能

#### 完整文件结构

```
my-plugin/
├── plugin.ts            # LogPlugin 插件实现
├── app-extension.ts     # 扩展方法注册
└── index.ts             # 模块导出
```

#### 步骤 1: 实现插件 (`plugin.ts`)

```typescript
import { Plugin } from "@rbxts/bevy_app/plugin";
import type { App } from "@rbxts/bevy_app/app";

export class LogPlugin implements Plugin {
    private logLevel: "info" | "debug" | "warn" | "error";

    constructor(logLevel: "info" | "debug" | "warn" | "error") {
        this.logLevel = logLevel;
    }

    public build(app: App): void {
        // 初始化日志系统
        print(`[LogPlugin] Initialized with level: ${this.logLevel}`);
        // 添加日志系统到 Update 调度
        // app.addSystems("Update", logSystem);
    }

    public name(): string {
        return "LogPlugin";
    }

    public isUnique(): boolean {
        return true;
    }
}
```

#### 步骤 2: 注册扩展方法 (`app-extension.ts`)

```typescript
import { setAppExtension } from "@rbxts/bevy_app/app-extension";
import type { App } from "@rbxts/bevy_app/app";
import { LogPlugin } from "./plugin";

// =====================================================================
// 运行时方法注册
// =====================================================================

/**
 * 启用日志功能
 */
setAppExtension(
    "enableLogging",
    function (this: App, logLevel: "info" | "debug" | "warn" | "error"): App {
        // this 指向当前 App 实例
        const plugin = new LogPlugin(logLevel);
        this.addPlugin(plugin);
        return this;  // 返回 this 支持链式调用
    },
);

/**
 * 禁用日志功能
 */
setAppExtension(
    "disableLogging",
    function (this: App): App {
        print("[LogPlugin] Logging disabled");
        // 实际实现中可能需要移除插件或设置标志
        return this;
    },
);

// =====================================================================
// TypeScript 类型声明
// =====================================================================

/**
 * 为 App 类添加日志方法的类型声明
 *
 * 注意：这只是类型声明，实际实现在上面的 setAppExtension 中
 */
declare module "@rbxts/bevy_app/app" {
    interface App {
        /**
         * 启用日志功能
         * @param logLevel - 日志级别
         * @returns App 实例，支持链式调用
         * @example
         * ```typescript
         * app.enableLogging("debug");
         * ```
         */
        enableLogging(logLevel: "info" | "debug" | "warn" | "error"): this;

        /**
         * 禁用日志功能
         * @returns App 实例，支持链式调用
         * @example
         * ```typescript
         * app.disableLogging();
         * ```
         */
        disableLogging(): this;
    }
}
```

#### 步骤 3: 模块导出 (`index.ts`)

```typescript
// 导出插件类
export { LogPlugin } from "./plugin";

// 导入扩展注册（副作用导入）
import "./app-extension";
```

#### 步骤 4: 使用扩展

```typescript
import { App } from "@rbxts/bevy_app";
import "@rbxts/my-plugin";  // 导入后自动注册扩展

const app = new App();

// ✅ 享受完整的类型支持和智能提示
app
    .enableLogging("debug")   // 扩展方法
    .addPlugin(otherPlugin)   // 原生方法
    .disableLogging()         // 扩展方法
    .run();
```

---

## 完整示例

### 性能监控扩展

完整的生产级扩展示例，展示所有最佳实践。

#### 文件: `performance/app-extension.ts`

```typescript
import { setAppExtension } from "@rbxts/bevy_app/app-extension";
import type { App } from "@rbxts/bevy_app/app";
import { PerformanceMonitorPlugin } from "./plugin";

// =====================================================================
// 接口定义
// =====================================================================

/**
 * 性能监控配置
 */
export interface PerformanceConfig {
    /** 是否监控 FPS */
    readonly fps?: boolean;
    /** 是否监控内存使用 */
    readonly memory?: boolean;
    /** 是否监控网络 */
    readonly network?: boolean;
}

/**
 * 性能预算配置
 */
export interface PerformanceBudget {
    /** 最大允许 FPS */
    readonly maxFPS: number;
    /** 最大内存使用（MB）*/
    readonly maxMemoryMB: number;
}

// =====================================================================
// 扩展方法注册
// =====================================================================

/**
 * 启用性能监控
 */
setAppExtension(
    "enablePerformanceMonitoring",
    function (this: App, config?: PerformanceConfig): App {
        const finalConfig: PerformanceConfig = {
            fps: config?.fps ?? true,
            memory: config?.memory ?? true,
            network: config?.network ?? false,
        };

        const plugin = new PerformanceMonitorPlugin(finalConfig);
        this.addPlugin(plugin);
        return this;
    },
);

/**
 * 设置性能预算
 */
setAppExtension(
    "setPerformanceBudget",
    function (this: App, budget: PerformanceBudget): App {
        // 插入性能预算资源供监控系统使用
        this.insertResource(budget);
        return this;
    },
);

/**
 * 获取当前性能指标
 */
setAppExtension(
    "getPerformanceMetrics",
    function (this: App): { fps: number; memoryMB: number } | undefined {
        // 从资源中读取性能指标
        return this.getResource<{ fps: number; memoryMB: number }>();
    },
);

// =====================================================================
// TypeScript 类型声明
// =====================================================================

declare module "@rbxts/bevy_app/app" {
    interface App {
        /**
         * 启用性能监控
         *
         * @param config - 监控配置，默认启用 FPS 和内存监控
         * @returns App 实例
         *
         * @example
         * ```typescript
         * app.enablePerformanceMonitoring({
         *     fps: true,
         *     memory: true,
         *     network: false
         * });
         * ```
         */
        enablePerformanceMonitoring(config?: PerformanceConfig): this;

        /**
         * 设置性能预算
         *
         * 超过预算时会触发警告或采取降级措施
         *
         * @param budget - 性能预算配置
         * @returns App 实例
         *
         * @example
         * ```typescript
         * app.setPerformanceBudget({
         *     maxFPS: 60,
         *     maxMemoryMB: 512
         * });
         * ```
         */
        setPerformanceBudget(budget: PerformanceBudget): this;

        /**
         * 获取当前性能指标
         *
         * @returns 当前性能数据，如果监控未启用则返回 undefined
         */
        getPerformanceMetrics(): { fps: number; memoryMB: number } | undefined;
    }
}
```

#### 使用示例

```typescript
import { App } from "@rbxts/bevy_app";
import "@rbxts/performance";

const app = new App();

app
    .enablePerformanceMonitoring({
        fps: true,
        memory: true,
        network: false,
    })
    .setPerformanceBudget({
        maxFPS: 60,
        maxMemoryMB: 512,
    })
    .addPlugin(gamePlugin)
    .run();

// 稍后获取性能指标
const metrics = app.getPerformanceMetrics();
if (metrics) {
    print(`FPS: ${metrics.fps}, Memory: ${metrics.memoryMB}MB`);
}
```

---

## 高级用法

### 1. 泛型扩展方法

支持泛型参数，提供类型安全的扩展：

```typescript
setAppExtension(
    "registerSystem",
    function <T extends System>(
        this: App,
        systemClass: new () => T,
        schedule: string,
    ): App {
        const system = new systemClass();
        this.addSystems(schedule, system);
        return this;
    },
);

declare module "@rbxts/bevy_app/app" {
    interface App {
        /**
         * 注册系统到指定调度
         * @param systemClass - 系统类
         * @param schedule - 调度名称
         */
        registerSystem<T extends System>(
            systemClass: new () => T,
            schedule: string,
        ): this;
    }
}

// 使用 - 完整的类型推断
app.registerSystem(PhysicsSystem, "Update");
app.registerSystem(RenderSystem, "PostUpdate");
```

### 2. 访问和修改 App 状态

扩展方法可以完全访问 App 的内部状态：

```typescript
setAppExtension(
    "getPluginCount",
    function (this: App): number {
        // 访问 App 的公共方法
        const plugins = this.getAddedPlugins();
        return plugins.size();
    },
);

setAppExtension(
    "hasPlugin",
    function (this: App, pluginName: string): boolean {
        return this.isPluginAdded(pluginName);
    },
);

declare module "@rbxts/bevy_app/app" {
    interface App {
        /** 获取已添加的插件数量 */
        getPluginCount(): number;
        /** 检查插件是否已添加 */
        hasPlugin(pluginName: string): boolean;
    }
}

// 使用
const count = app.getPluginCount();
if (app.hasPlugin("PhysicsPlugin")) {
    print("Physics already initialized");
}
```

### 3. 条件扩展

根据环境或配置动态添加功能：

```typescript
setAppExtension(
    "enableDevMode",
    function (this: App): App {
        // 仅在开发环境启用
        if (game.PlaceId === 0) {  // Studio 环境
            this.enableLogging("debug")
                .enablePerformanceMonitoring()
                .addPlugin(new DebugOverlayPlugin());
        }
        return this;
    },
);

declare module "@rbxts/bevy_app/app" {
    interface App {
        /** 启用开发模式（仅在 Studio 中生效）*/
        enableDevMode(): this;
    }
}

// 使用
app.enableDevMode()  // 在 Studio 中启用所有调试功能
   .run();
```

### 4. 多模块协作

不同模块可以组合使用扩展方法：

```typescript
// 模块 A: 数据库扩展
setAppExtension("connectDatabase", function (this: App, url: string): App {
    this.addPlugin(new DatabasePlugin(url));
    return this;
});

// 模块 B: 缓存扩展
setAppExtension("enableCache", function (this: App, size: number): App {
    this.addPlugin(new CachePlugin(size));
    return this;
});

// 模块 C: 认证扩展
setAppExtension("setupAuth", function (this: App, secret: string): App {
    this.addPlugin(new AuthPlugin(secret));
    return this;
});

// 组合使用
app
    .connectDatabase("mongodb://localhost")
    .enableCache(1024)
    .setupAuth("my-secret-key")
    .run();
```

---

## 最佳实践

### ✅ 推荐做法

#### 1. 总是返回 `this`

支持流畅的链式调用 API：

```typescript
setAppExtension("myMethod", function (this: App): App {
    // ... 执行操作
    return this;  // ✅ 支持链式调用
});
```

#### 2. 完整的类型声明

提供详细的 JSDoc 和类型信息：

```typescript
declare module "@rbxts/bevy_app/app" {
    interface App {
        /**
         * 方法描述
         *
         * @param param - 参数说明
         * @returns App 实例
         *
         * @example
         * ```typescript
         * app.myMethod(value);
         * ```
         */
        myMethod(param: string): this;
    }
}
```

#### 3. 描述性方法名

使用清晰的动词+名词组合：

```typescript
// ✅ 清晰
setAppExtension("enableDebugMode", ...);
setAppExtension("connectToDatabase", ...);
setAppExtension("registerEventHandler", ...);

// ⚠️ 模糊
setAppExtension("debug", ...);
setAppExtension("db", ...);
setAppExtension("reg", ...);
```

#### 4. 使用 TypeScript 接口

定义清晰的配置接口：

```typescript
export interface MyPluginConfig {
    readonly enabled: boolean;
    readonly level: number;
}

setAppExtension("configurePlugin", function (this: App, config: MyPluginConfig): App {
    // ...
    return this;
});
```

#### 5. 提供合理的默认值

让 API 易于使用：

```typescript
setAppExtension(
    "enableFeature",
    function (this: App, config?: FeatureConfig): App {
        const finalConfig = {
            enabled: config?.enabled ?? true,
            level: config?.level ?? 1,
        };
        // ...
        return this;
    },
);
```

### ❌ 避免的做法

#### 1. 直接修改原型

使用 `setAppExtension` 而不是直接修改：

```typescript
// ❌ 错误 - 绕过了扩展系统
App.prototype.myMethod = function() { ... };
(App as any).myMethod = function() { ... };

// ✅ 正确 - 使用扩展机制
setAppExtension("myMethod", function(this: App) { ... });
```

#### 2. 忘记 `this` 类型

必须标注 `this: App` 才能访问 App 方法：

```typescript
// ❌ 错误 - 类型不安全
setAppExtension("myMethod", function() {
    this.addPlugin(...);  // TS 错误：this 类型为 any
});

// ✅ 正确 - 明确 this 类型
setAppExtension("myMethod", function(this: App) {
    this.addPlugin(...);  // ✅ 类型安全
});
```

#### 3. 阻塞操作

避免在扩展方法中执行长时间阻塞操作：

```typescript
// ❌ 避免 - 阻塞 App 初始化
setAppExtension("loadData", function(this: App): App {
    task.wait(5);  // 阻塞 5 秒！
    return this;
});

// ✅ 推荐 - 使用异步模式
setAppExtension("loadDataAsync", function(this: App, callback: () => void): App {
    task.spawn(() => {
        // 异步加载数据
        task.wait(5);
        callback();
    });
    return this;  // 立即返回
});
```

#### 4. 污染命名空间

使用前缀避免冲突：

```typescript
// ⚠️ 可能冲突
setAppExtension("enable", ...);
setAppExtension("start", ...);

// ✅ 使用插件前缀
setAppExtension("myPlugin_enable", ...);
setAppExtension("myPlugin_start", ...);

// 或使用描述性全名
setAppExtension("enableMyFeature", ...);
```

#### 5. 缺少文档

始终提供完整的文档：

```typescript
// ❌ 缺少文档
setAppExtension("doThing", function(this: App, x: number): App {
    return this;
});

// ✅ 完整文档
/**
 * 执行特定操作
 * @param level - 操作级别 (1-10)
 * @returns App 实例
 */
setAppExtension("doThing", function(this: App, level: number): App {
    return this;
});
```

---

## 工作原理

### 核心实现

扩展机制的实现非常简洁（仅 3 行核心代码）：

```typescript
// src/bevy_app/app-extension.ts
export function setAppExtension<TArgs extends Array<unknown>, TReturn>(
    name: string,
    method: (this: App, ...args: TArgs) => TReturn,
): void {
    // 直接将方法添加到 App 类（Lua table）
    const AppTable = App as unknown as Record<string, ExtensionMethod>;
    AppTable[name] = method as ExtensionMethod;
}
```

### Lua 类继承机制

在 roblox-ts 编译后的 Lua 代码中，类结构如下：

```lua
-- 编译后的 Lua 代码
App = setmetatable({}, {
    __tostring = function() return "App" end,
})
App.__index = App  -- 关键：__index 指向自身

function App.new(...)
    local self = setmetatable({}, App)
    return self:constructor(...) or self
end

function App:myMethod()
    -- 实例方法
end
```

### 方法查找路径

当访问 `app.someMethod()` 时，Lua 的查找顺序：

1. **实例本身** → `app.someMethod`
2. **元表的 `__index`** → `getmetatable(app).__index.someMethod`
3. **`__index` 指向 App** → `App.someMethod`

因此，通过 `setAppExtension` 添加的方法会被所有实例（包括子类）找到：

```typescript
// 扩展注册
setAppExtension("enableDebug", function(this: App) { ... });

// 等价于 Lua
App.enableDebug = function(self) { ... }

// 所有实例都能访问
const app = new App();
app.enableDebug();  // ✅ 找到 App.enableDebug

// 子类也能访问
class MyApp extends App {}
const myApp = new MyApp();
myApp.enableDebug();  // ✅ 通过 __index 链找到
```

### 为什么不用 Metatable `__index`

我们曾尝试修改 metatable，但发现直接修改 App table 更简单：

```typescript
// ❌ 复杂方式 - 修改 metatable
const meta = getmetatable(App);
if (!meta.__index) {
    meta.__index = {};
}
(meta.__index as any)[name] = method;

// ✅ 简单方式 - 直接赋值
App[name] = method;
```

因为 `App.__index = App`，两种方式效果相同，但直接赋值更简洁。

---

## 调试指南

### 检查扩展是否注册

在 Roblox Studio 的命令栏或脚本中：

```lua
-- 检查方法是否存在
print(App.enableDebug)  -- 应该输出: function: 0x...

-- 检查所有扩展方法
for key, value in pairs(App) do
    if type(value) == "function" then
        print(key)
    end
end
```

### 调试扩展方法执行

在扩展方法中添加调试输出：

```typescript
setAppExtension("myMethod", function(this: App): App {
    print("[DEBUG] myMethod called");
    print("[DEBUG] App instance:", this);
    print("[DEBUG] Plugin count:", this.getPluginCount());
    return this;
});
```

### 验证继承类功能

```typescript
class CustomApp extends App {
    public customMethod(): string {
        return "custom";
    }
}

// 注册扩展
setAppExtension("testMethod", function(this: App): App {
    print("Test method works!");
    return this;
});

// 测试
const customApp = new CustomApp();
customApp.testMethod();  // ✅ 应该输出 "Test method works!"
customApp.customMethod();  // ✅ 自定义方法也可用
```

### 常见问题排查

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 方法未定义 | 忘记导入扩展模块 | `import "@rbxts/my-plugin/app"` |
| TypeScript 报错 | 缺少类型声明 | 添加 `declare module` |
| `this` 类型错误 | 忘记标注 `this: App` | 函数参数加 `this: App` |
| 方法不返回 App | 忘记 `return this` | 确保返回 `this` |

---

## 常见问题

### Q: 扩展方法会污染全局命名空间吗？

**A:** 不会。扩展方法只添加到 `App` 类，不影响其他类或全局作用域。

```typescript
setAppExtension("myMethod", ...);  // 只影响 App 类

const app = new App();
app.myMethod();  // ✅ 可用

const obj = {};
obj.myMethod();  // ❌ 未定义
```

### Q: 多个模块添加同名扩展会怎样？

**A:** 后注册的会覆盖先注册的。建议使用前缀避免冲突：

```typescript
// ⚠️ 可能冲突
import "module-a/app";  // 注册 "enable"
import "module-b/app";  // 覆盖 "enable"

// ✅ 使用前缀
setAppExtension("moduleA_enable", ...);
setAppExtension("moduleB_enable", ...);
```

### Q: 可以在扩展方法中调用其他扩展方法吗？

**A:** 可以！扩展方法就像普通方法一样可以互相调用：

```typescript
setAppExtension("enableFeatureA", function(this: App): App {
    // ...
    return this;
});

setAppExtension("enableFeatureB", function(this: App): App {
    // ...
    return this;
});

setAppExtension("enableAllFeatures", function(this: App): App {
    return this.enableFeatureA()
               .enableFeatureB();
});
```

### Q: 扩展方法支持异步操作吗？

**A:** 扩展方法本身应该是同步的（App 初始化流程是同步的），但可以启动异步任务：

```typescript
// ✅ 正确 - 启动异步任务但立即返回
setAppExtension("loadDataAsync", function(this: App, callback: () => void): App {
    task.spawn(() => {
        // 异步操作
        task.wait(1);
        callback();
    });
    return this;  // 立即返回
});

// ❌ 错误 - 阻塞 App 初始化
setAppExtension("loadData", function(this: App): App {
    task.wait(1);  // 阻塞！
    return this;
});
```

### Q: 扩展方法可以访问私有成员吗？

**A:** 不能。扩展方法只能访问 App 的公共 API（public 方法和属性）：

```typescript
setAppExtension("myMethod", function(this: App): App {
    this.addPlugin(...);     // ✅ 公共方法
    this.world();            // ✅ 公共方法
    this.privateField;       // ❌ 无法访问私有成员
    return this;
});
```

### Q: 性能开销大吗？

**A:** 几乎没有开销。扩展方法和普通方法的调用性能相同：

- 注册时间：O(1)，只是简单的 table 赋值
- 调用开销：与普通方法完全相同
- 内存占用：每个扩展方法只占用一个函数引用

### Q: 可以删除已注册的扩展方法吗？

**A:** 技术上可以，但不推荐：

```typescript
// ⚠️ 不推荐 - 可能破坏其他模块
const AppTable = App as unknown as Record<string, unknown>;
AppTable["myMethod"] = undefined;

// ✅ 推荐 - 使用条件扩展
setAppExtension("conditionalFeature", function(this: App, enable: boolean): App {
    if (enable) {
        // 启用功能
    } else {
        // 禁用功能
    }
    return this;
});
```

---

## 参考资料

### 源代码

- **核心实现**: `src/bevy_app/app-extension.ts` - 扩展机制核心代码（~15 行）
- **状态扩展**: `src/bevy_state/app.ts` - 状态系统的完整扩展实现
- **单元测试**: `src/bevy_app/__tests__/app-extension.spec.ts` - 扩展机制测试用例

### 相关文档

- [Plugin 开发规范](./plugin-development-specification.md) - 插件系统详细文档
- [Plugin 扩展快速入门](./plugin-extensions-quickstart.md) - 插件扩展的快速指南
- [泛型类型处理](./generic-type-handling.md) - 类型系统使用指南

### 示例代码

查看以下模块的实际应用：

- **bevy_state** - 状态管理扩展（目前唯一的完整实现）
  - 文件：`src/bevy_state/app.ts`
  - 提供 4 个扩展方法：`initState`, `insertState`, `addComputedState`, `addSubState`
  - 包含完整的类型声明和单元测试

> **注意**：其他模块（如 bevy_diagnostic、bevy_log、bevy_transform 等）目前使用传统的 Plugin 接口，尚未实现 App 扩展。如需为其他模块添加扩展，可参考 bevy_state 的实现模式。

### 外部资源

- [roblox-ts 文档](https://roblox-ts.com) - roblox-ts 编译器
- [Rust Bevy 文档](https://docs.rs/bevy) - 原始 Bevy 引擎文档
- [Lua 元表教程](http://www.lua.org/pil/13.html) - Lua metatable 机制

---

## 更新日志

- **2025-10-12**:
  - 初始版本，包含完整的使用指南和最佳实践
  - 更新示例代码章节，移除不存在的 bevy_hierarchy 和 bevy_scene 模块引用
  - 明确说明 bevy_state 是目前唯一实现 App 扩展的模块
- **贡献者**: 如果你发现文档问题或有改进建议，欢迎提交 Issue 或 PR

---

**提示**: 本文档随代码更新而更新。如发现不一致，请以源代码为准并提交文档更新请求。

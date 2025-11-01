---
name: bevy-log
description: White Dragon Bevy 的日志系统。当你需要配置日志级别、输出调试信息、追踪系统执行、过滤日志输出时使用。适用于调试、性能分析、问题排查等场景。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_log/**)
  - Bash(npm test bevy_log)
---

# bevy-log - 日志系统使用指南

## 📖 概述

`bevy_log` 提供日志记录和配置功能，支持 ERROR、WARN、INFO、DEBUG、TRACE 五个级别，可以精确控制每个模块的日志输出。

**核心功能**：
- 🎯 多级别日志：ERROR、WARN、INFO、DEBUG、TRACE
- 🔍 模块过滤：通过 EnvFilter 控制不同模块的日志级别
- ⚡ 防抖打印：`usePrintDebounce` 避免高频日志刷屏
- 🔂 Once 日志：`*Once` 函数在同一位置只记录一次


---

## 🚀 快速开始

### 基础使用

```typescript
import { App } from "bevy_app";
import { LogPlugin, Level, info, debug, warn, error } from "bevy_log";

// 1. 添加 LogPlugin（通常在 App 初始化时）
const app = new App()
  .addPlugin(new LogPlugin({
    level: Level.INFO,  // 默认级别
    filter: "wgpu=error,bevy_render=info"  // 模块过滤
  }));

// 2. 在系统中使用日志函数
function gameSystem(world: World): void {
  info("Game started");
  debug("Player spawned at position", "GameSystem");
  warn("Low memory warning");
  error("Critical failure!");
}
```

### Context 访问 (v0.9.0+)

```typescript
import { App } from "bevy_app";
import { LogPlugin, Level } from "bevy_log";

// 添加 LogPlugin
const app = new App()
  .addPlugin(new LogPlugin({
    level: Level.INFO,
  }));

// 在系统中通过 context 访问日志资源
function gameSystem(world: World): void {
  // ✅ 推荐：通过 context 访问日志管理器
  const logger = world.context.logger;

  // 查询当前日志级别
  const currentLevel = logger.level;
  print(`Current log level: ${currentLevel}`);

  // 动态修改日志级别
  logger.setLevel(Level.DEBUG);

  // 访问日志过滤器
  const filter = logger.filter;
}
```

### 在 DefaultPlugins 中使用

LogPlugin 已包含在 `DefaultPlugins` 中，无需手动添加：

```typescript
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";

const app = new App()
  .addPlugins(DefaultPlugins);  // 已包含 LogPlugin
```

如果需要自定义日志配置，可以移除默认的 LogPlugin：

```typescript
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";
import { LogPlugin, Level } from "bevy_log";

const app = new App()
  .addPlugins(DefaultPlugins.build().disable(LogPlugin))
  .addPlugin(new LogPlugin({
    level: Level.DEBUG,  // 自定义配置
  }));
```

---

## 📚 使用方法

### 1. LogPlugin 配置

```typescript
// 默认配置
app.addPlugin(new LogPlugin());

// 自定义级别和过滤器
app.addPlugin(new LogPlugin({
  level: Level.DEBUG,
  filter: "wgpu=error,bevy_ecs=trace,my_module=debug"
}));
```

### 2. 日志级别

| 级别 | 用途 |
|------|------|
| ERROR | 严重错误 |
| WARN | 警告 |
| INFO | 常规信息（默认） |
| DEBUG | 调试信息 |
| TRACE | 详细追踪 |

**过滤规则**：设置为 INFO 时，只输出 ERROR、WARN、INFO，DEBUG 和 TRACE 被过滤。

### 3. EnvFilter（模块过滤）

**语法**：`"<全局级别>,<模块1>=<级别1>,<模块2>=<级别2>"`

```typescript
// 默认 WARN，my_game 模块 DEBUG
const filter = new EnvFilter("warn,my_game=debug");

// 复杂配置
const filter = new EnvFilter(
  "error," +                    // 默认只显示 ERROR
  "bevy_app=warn," +            // bevy_app 显示 WARN+
  "my_game=trace," +            // my_game 显示全部
  "my_game::physics=debug"      // physics 子模块覆盖为 DEBUG
);
```

**前缀匹配**：更具体的规则优先，子模块继承父模块配置。

### 4. usePrintDebounce（防抖打印）

⚠️ **必须在 Matter 系统中使用**

```typescript
import { usePrintDebounce } from "bevy_log";

function playerMonitorSystem(world: World): void {
  // 每 10 秒最多打印一次
  usePrintDebounce(`Player count: ${count}`, 10);
}

// 默认 30 秒防抖
function debugSystem(world: World): void {
  usePrintDebounce("System is running");
}
```

### 5. Once 日志函数

在同一位置只记录一次，适用于避免重复警告。

```typescript
import { warnOnce, errorOnce } from "bevy_log";

function validateSystem(world: World): void {
  // 循环中调用，只输出一次
  for (let i = 0; i < 100; i++) {
    warnOnce("Deprecated API usage", "ValidationSystem");
  }
}
```

**清除缓存**（测试用）：
```typescript
import { clearOnceCache } from "bevy_log";
beforeEach(() => clearOnceCache());
```

---

## 🔧 API 参考

### 日志函数

```typescript
// 基础用法
info("Application started");

// 带模块名称
debug("Player spawned", "GameSystem");

// 带额外字段
const fields = new Map<string, unknown>();
fields.set("player_id", 12345);
error("Player spawn failed", "GameSystem", fields);
```

### Span 函数（追踪代码区域）

```typescript
import { infoSpan, debugSpan } from "bevy_log";

function dataProcessingSystem(world: World): void {
  const span = infoSpan("data_processing");
  span(() => {
    processData();
    // 自动记录进入和退出
  });
}
```

可用：`errorSpan`, `warnSpan`, `infoSpan`, `debugSpan`, `traceSpan`

---

## ✅ 最佳实践

### 1. 选择合适的日志级别

```typescript
// ✅ 正确
error("Database connection failed");  // 严重错误
warn("Player count exceeds limit");   // 潜在问题
info("Server started");               // 重要事件
debug("Cache hit");                   // 调试信息

// ❌ 错误
error("User logged in");              // 应用 info
info("Variable x = 42");              // 应用 debug
```

### 2. 使用模块名称

```typescript
// ✅ 推荐
info("Player connected", "NetworkSystem");

// ❌ 不推荐
info("Player connected");
```

### 3. 环境配置

```typescript
const isProduction = !RunService.IsStudio();

app.addPlugin(new LogPlugin({
  level: isProduction ? Level.WARN : Level.DEBUG,
  filter: isProduction ? "error" : "debug,my_game=trace"
}));
```

### 4. 避免刷屏

```typescript
// ❌ 错误：每帧打印
function updateSystem(world: World): void {
  debug("Update tick");  // 60 FPS!
}

// ✅ 正确：防抖或 once
function updateSystem(world: World): void {
  usePrintDebounce("Update tick", 5);
}
```

### 5. 结构化字段

```typescript
// ✅ 推荐
const fields = new Map();
fields.set("player_id", playerId);
info("Player updated", "GameSystem", fields);

// ❌ 不推荐
info(`Player ${playerId} health ${health}`);
```

---

## ⚠️ 常见陷阱与错误排查

### 1. 循环中日志刷屏

```typescript
// ❌ 错误：每次循环都打印
for (const [id] of world.query(Player)) {
  debug(`Processing ${id}`);  // 可能数百条！
}

// ✅ 正确：打印摘要或使用防抖
debug(`Processed ${count} entities`);
```

### 2. 模块过滤配置错误

```typescript
// ❌ 问题：所有模块 TRACE
app.addPlugin(new LogPlugin({ level: Level.TRACE }));

// ✅ 改进：精确控制
app.addPlugin(new LogPlugin({
  level: Level.INFO,
  filter: "my_debug_module=trace,other=warn"
}));
```

### 3. 日志不能替代错误处理

```typescript
// ❌ 错误：只记录不处理
function loadData(): Data | undefined {
  if (!fileExists) {
    error("File not found");
    return undefined;
  }
}

// ✅ 正确：结合错误处理
function loadData(): Result<Data> {
  if (!fileExists) {
    error("File not found", "DataLoader");
    return { success: false, err: "File not found" };
  }
  return { success: true, value: data };
}
```

### 4. usePrintDebounce 使用错误

```typescript
// ❌ 错误：在普通函数中使用
function utilityFunction(): void {
  usePrintDebounce("Error!");  // 无 Matter Hooks
}

// ✅ 正确：只在系统中使用
function mySystem(world: World): void {
  usePrintDebounce("Works!");
}
```

### 5. 性能：字符串拼接在过滤前执行

```typescript
// ⚠️ 注意：即使过滤，函数仍调用
debug(`Expensive: ${expensiveFunction()}`);

// ✅ 改进：先检查级别
if (filter.isEnabled(Level.DEBUG)) {
  debug(`Expensive: ${expensiveFunction()}`);
}
```

---

## 💡 示例

### 基础使用

```typescript
import { App } from "bevy_app";
import { LogPlugin, Level, info, debug } from "bevy_log";

// 配置日志
const app = new App()
  .addPlugin(new LogPlugin({
    level: Level.DEBUG,
    filter: "wgpu=error,my_game=trace"
  }));

// 使用日志
info("Application initialized");
debug("Debug mode enabled", "GameSystem");
```

### 模块化日志

```typescript
const MODULE_NAME = "PlayerSystem";

function playerHealthSystem(world: World): void {
  for (const [entityId, health] of world.query(Health)) {
    if (health.value <= 0) {
      warn(`Player ${entityId} health is zero`, MODULE_NAME);
    }
  }
}
```

### 防抖打印

```typescript
function monitorSystem(world: World): void {
  const playerCount = world.query(Player).size();
  usePrintDebounce(`Player count: ${playerCount}`, 10);
}
```

### Once 日志

```typescript
function deprecatedSystem(world: World): void {
  for (let i = 0; i < 100; i++) {
    warnOnce("This system is deprecated", "DeprecatedSystem");
  }
}
```

### 环境配置

```typescript
import { RunService } from "@rbxts/services";

const isStudio = RunService.IsStudio();

const app = new App()
  .addPlugin(new LogPlugin({
    level: isStudio ? Level.DEBUG : Level.INFO,
    filter: isStudio ? "trace" : "warn,critical_module=info"
  }));
```

---

## 🔗 相关资源

### 测试命令

```bash
npm test bevy_log              # 运行所有测试
npm test filter.spec           # 过滤器测试
npm test once.spec             # Once 测试
npm test hook-debug-print.spec # 防抖测试
```

### 源码文件

- `src/bevy_log/plugin.ts` - 核心实现（v0.9.0+ 从 lib.ts 重命名）
- `src/bevy_log/context-extension.ts` - Context 扩展定义
- `src/bevy_log/filter.ts` - 环境过滤器
- `src/bevy_log/once.ts` - Once 函数
- `src/bevy_log/hooks/hook-debug-print.ts` - 防抖打印

---

## 🔌 Context 扩展 (v0.9.0+)

bevy_log 提供了 `context.logger` 扩展，允许在系统中方便地访问日志配置：

### 访问日志资源

```typescript
function mySystem(world: World): void {
  // 通过 context 访问日志资源
  const logger = world.context.logger;

  // 查询当前配置
  print(`Log level: ${logger.level}`);
  print(`Filter: ${logger.filter.toString()}`);

  // 动态修改日志级别
  if (debugMode) {
    logger.setLevel(Level.DEBUG);
  }
}
```

### LogPluginResource API

```typescript
interface LogPluginResource {
  /** 当前日志级别 */
  level: Level;

  /** 日志过滤器 */
  filter: EnvFilter;

  /** 设置日志级别 */
  setLevel(level: Level): void;

  /** 设置过滤器 */
  setFilter(filter: EnvFilter | string): void;
}
```

### 使用场景

**动态调试控制**：
```typescript
function debugToggleSystem(world: World): void {
  const logger = world.context.logger;
  const input = world.getResource<InputResource>();

  // 按 F3 切换调试模式
  if (input.isKeyJustPressed("F3")) {
    const currentLevel = logger.level;
    const newLevel = currentLevel === Level.DEBUG ? Level.INFO : Level.DEBUG;
    logger.setLevel(newLevel);
    print(`Debug mode: ${newLevel === Level.DEBUG ? "ON" : "OFF"}`);
  }
}
```

**环境感知日志**：
```typescript
function setupLogging(world: World): void {
  const logger = world.context.logger;
  const env = world.context.env;

  if (env.isInCloud) {
    // 云端测试环境启用详细日志
    logger.setLevel(Level.TRACE);
    logger.setFilter("trace,wgpu=error");
  } else if (env.isServer) {
    // 服务端使用中等级别
    logger.setLevel(Level.INFO);
  } else {
    // 客户端使用较少日志
    logger.setLevel(Level.WARN);
  }
}
```

**性能分析模式**：
```typescript
function performanceMonitor(world: World): void {
  const logger = world.context.logger;
  const timeStats = world.context.timeStats;

  const avgFPS = timeStats.getAverageFPS();

  if (avgFPS < 30) {
    // FPS 低时启用性能追踪
    logger.setLevel(Level.TRACE);
    logger.setFilter("trace,bevy_render=trace,bevy_ecs=debug");
  } else if (avgFPS > 55) {
    // FPS 正常时恢复默认级别
    logger.setLevel(Level.INFO);
  }
}
```

---

## 📝 重要提示

### ⚠️ usePrintDebounce 限制

- **必须在 Matter 系统中使用**
- 不能在普通函数、构造函数或类方法中使用
- **不能在 try-catch 块中使用**（会导致内存泄漏）

### 🎮 Roblox 环境

- **Cloud 测试**：DEBUG 和 TRACE 自动启用
- **Studio**：日志自动添加 `[Server]`/`[Client]` 前缀
- **生产环境**：DEBUG 和 TRACE 不输出

### ⚡ 性能注意

- 字符串拼接在过滤前执行，高频路径应避免复杂日志
- 极高频代码可手动检查日志级别再调用日志函数

## 📦 与其他模块集成

### 与 bevy_time 集成

```typescript
function timeAwareLogging(world: World): void {
  const logger = world.context.logger;
  const virtualTime = world.context.virtualTime;

  const elapsed = virtualTime.elapsedSeconds();

  // 游戏运行 10 秒后启用详细日志
  if (elapsed > 10 && logger.level !== Level.TRACE) {
    logger.setLevel(Level.TRACE);
    info("Enabling detailed logging after 10 seconds");
  }
}
```

### 与 bevy_ecs_debugger 集成

```typescript
function debuggerWithLogging(world: World): void {
  const widgets = world.context.debuggerWidgets;
  const logger = world.context.logger;

  widgets.window("Log Settings", () => {
    widgets.heading("Log Level");

    // 显示当前级别
    widgets.label(`Current: ${logger.level}`);

    // 切换按钮
    if (widgets.button("DEBUG").clicked()) {
      logger.setLevel(Level.DEBUG);
    }

    if (widgets.button("INFO").clicked()) {
      logger.setLevel(Level.INFO);
    }

    if (widgets.button("TRACE").clicked()) {
      logger.setLevel(Level.TRACE);
    }
  });
}
```

---

**版本**：1.0.0 (v0.9.0-alpha)
**最后更新**：2025-10-31

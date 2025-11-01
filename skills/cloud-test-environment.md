# 云端测试环境文档

## 概述

White Dragon Bevy 框架提供了完整的云端测试环境支持，通过 `Env` 类和相关的日志系统，开发者可以在 Roblox Cloud 环境中进行自动化测试和调试。

## 环境检测

### Env 类

`Env` 类提供统一的环境检测接口，用于区分生产环境、Studio 和 Cloud 测试环境。

```typescript
import { Env, RobloxContext } from "bevy_roblox/env";

const env = new Env();
```

#### 属性说明

| 属性 | 类型 | 说明 |
|------|------|------|
| `isClient` | `boolean` | 是否在客户端运行 |
| `isServer` | `boolean` | 是否在服务端运行 |
| `isStudio` | `boolean` | 是否在 Roblox Studio 中运行 |
| `isInCloud` | `boolean` | 是否在 Roblox Cloud 测试环境 |
| `isEnableTest` | `boolean` | 是否允许运行测试功能（Studio 或 Cloud） |
| `isLocal` | `boolean` | 是否为本地开发模式 |
| `robloxContext` | `RobloxContext` | 运行上下文（Server 或 Client） |
| `runServiceIsClient` | `boolean` | 对应 RunService.IsClient() |
| `runServiceIsServer` | `boolean` | 对应 RunService.IsServer() |
| `runServiceIsStudio` | `boolean` | 对应 RunService.IsStudio() |

#### 环境检测逻辑

1. **基础环境检测**：
   - 使用 `RunService.IsServer()` 和 `RunService.IsClient()` 检测服务端/客户端
   - 使用 `RunService.IsStudio()` 检测 Studio 环境

2. **云端环境检测**：
   - 检查全局标志 `_G.__isInCloud__` 判断是否在 Cloud 环境
   - 该标志由 cloud-test.lua 脚本自动设置

3. **测试权限控制**：
   - 在 Studio 或 Cloud 环境中，`isEnableTest` 为 `true`
   - 生产环境中，`isEnableTest` 为 `false`

4. **本地开发模式**：
   - 当 `isLocal` 为 `true` 时，同时设置 `isServer` 和 `isClient` 为 `true`
   - 用于本地开发时的特殊需求

### RobloxContext 枚举

```typescript
export enum RobloxContext {
    Server = "Server",
    Client = "Client",
}
```

## 使用示例

### 基本环境检测

```typescript
import { Env, RobloxContext } from "bevy_roblox/env";

const env = new Env();

// 检查运行环境
if (env.isStudio) {
    print("Running in Roblox Studio");
} else if (env.isInCloud) {
    print("Running in Cloud test environment");
} else {
    print("Running in production");
}

// 检查客户端/服务端
if (env.isServer) {
    print("Server-side code");
} else if (env.isClient) {
    print("Client-side code");
}

// 使用上下文枚举
if (env.robloxContext === RobloxContext.Server) {
    print("Running as server");
}
```

### 测试功能控制

```typescript
import { Env } from "bevy_roblox/env";
import { debug, trace } from "bevy_log";

const env = new Env();

// 启用测试功能
if (env.isEnableTest) {
    enableDebugFeatures();

    // 测试环境专用日志
    debug("Debug information only visible in test environment");
    trace("Detailed trace information");
}

// 生产环境日志
info("This log appears in all environments");
```

### 环境特定的插件加载

```typescript
import { Env, RobloxContext } from "bevy_roblox/env";
import { App } from "bevy_app";

const app = App.create();
const env = new Env();

// 根据环境加载不同插件
if (env.isServer) {
    app.addPlugin(new ServerPlugin());
} else if (env.isClient) {
    app.addPlugin(new ClientPlugin());
}

// 测试环境专用插件
if (env.isEnableTest) {
    app.addPlugin(new DebugPlugin());
    app.addPlugin(new DiagnosticPlugin());
}
```

### 云端测试自动化

```typescript
import { Env } from "bevy_roblox/env";
import { debug, info, warn, error } from "bevy_log";

export = () => {
    const env = new Env();

    describe("云端测试环境检测", () => {
        it("应该正确检测 Cloud 环境", () => {
            if (env.isInCloud) {
                expect(env.isEnableTest).to.equal(true);
                info("Cloud environment detected successfully");
            } else {
                info("Not running in Cloud environment, skipping Cloud-specific tests");
            }
        });

        it("应该在 Cloud 环境中启用测试功能", () => {
            if (env.isInCloud) {
                expect(env.isEnableTest).to.equal(true);
                debug("Test features are enabled in Cloud environment");
            }
        });

        it("应该正确识别运行上下文", () => {
            expect(env.robloxContext).to.be.oneOf([
                RobloxContext.Server,
                RobloxContext.Client
            ]);

            debug(`Running context: ${env.robloxContext}`);
        });
    });

    describe("环境隔离测试", () => {
        it("应该保持环境状态一致性", () => {
            const env1 = new Env();
            const env2 = new Env();

            expect(env1.isInCloud).to.equal(env2.isInCloud);
            expect(env1.isEnableTest).to.equal(env2.isEnableTest);
            expect(env1.robloxContext).to.equal(env2.robloxContext);
        });
    });
};
```

## 日志系统

### 日志级别控制

框架提供了基于环境检测的日志级别控制：

| 日志函数 | 生产环境 | 测试环境 | 说明 |
|---------|---------|---------|------|
| `error()` | ✅ | ✅ | 错误信息，始终显示 |
| `warn()` | ✅ | ✅ | 警告信息，始终显示 |
| `info()` | ✅ | ✅ | 一般信息，始终显示 |
| `debug()` | ❌ | ✅ | 调试信息，仅测试环境 |
| `trace()` | ❌ | ✅ | 详细跟踪，仅测试环境 |

### 日志使用示例

```typescript
import { debug, trace, info, warn, error } from "bevy_log";
import { Env } from "bevy_roblox/env";

const env = new Env();

function gameSystem(world: World): void {
    // 基础日志 - 所有环境
    info("Game system started");

    // 警告日志 - 所有环境
    if (performance.isPoor()) {
        warn("Performance warning: low FPS detected");
    }

    // 错误日志 - 所有环境
    if (criticalError) {
        error("Critical error occurred");
    }

    // 调试日志 - 仅测试环境
    if (env.isEnableTest) {
        debug("Detailed system state for debugging");
        trace("Very detailed execution trace");

        // 测试环境特有的验证
        validateSystemState(world);
    }
}
```

## 云端测试环境特性

### 自动日志捕获

在 Cloud 环境中，框架会自动捕获所有 `print()`、`warn()` 和框架日志函数的输出：

```typescript
// 这些输出在 Cloud 环境中会被自动捕获
print("Standard print output");
warn("Warning message");
debug("Debug message"); // 仅测试环境可见
```

### 环境标志

Cloud 环境通过全局标志 `_G.__isInCloud__` 进行标识：

```typescript
// 框架内部检测逻辑
if (_G.__isInCloud__ !== undefined && _G.__isInCloud__) {
    this.isInCloud = true;
    this.isEnableTest = true;
}
```

### 测试权限

通过 `Env.isEnableTest` 属性控制测试功能的启用：

```typescript
const env = new Env();

if (env.isEnableTest) {
    // 启用调试功能
    enableDeveloperConsole();

    // 加载测试插件
    loadTestPlugins();

    // 输出详细日志
    debug("Debug mode enabled");
}
```

## 最佳实践

### 1. 环境检测

```typescript
// ✅ 推荐：使用 Env 类进行环境检测
import { Env } from "bevy_roblox/env";

const env = new Env();
if (env.isEnableTest) {
    // 测试环境逻辑
}

// ❌ 避免：直接检查全局标志
if (_G.__isInCloud__) {
    // 这样做不够抽象，且可能在未来变化
}
```

### 2. 日志使用

```typescript
// ✅ 推荐：使用框架日志函数
import { debug, info, warn, error } from "bevy_log";

debug("Debug info"); // 自动环境过滤

// ❌ 避免：手动环境判断
if (env.isEnableTest) {
    print("Debug info");
}
```

### 3. 测试隔离

```typescript
// ✅ 推荐：测试功能与生产逻辑分离
function gameSystem(world: World): void {
    // 生产逻辑
    processGameLogic(world);

    // 测试功能（可选）
    if (env.isEnableTest) {
        runValidations(world);
        debug("System state validated");
    }
}
```

### 4. 环境配置

```typescript
// ✅ 推荐：基于环境加载不同配置
function loadConfig(env: Env): GameConfig {
    if (env.isInCloud) {
        return new CloudTestConfig();
    } else if (env.isStudio) {
        return new DevelopmentConfig();
    } else {
        return new ProductionConfig();
    }
}
```

## 迁移指南

### 从 bevy_dev 迁移

如果你之前使用 `bevy_dev/env`，需要更新导入路径：

```typescript
// ❌ 旧版本
import { Env, RobloxContext } from "bevy_dev";

// ✅ 新版本
import { Env, RobloxContext } from "bevy_roblox";
```

API 完全兼容，无需修改其他代码。

### 测试环境配置

确保你的测试配置文件正确设置：

```lua
-- cloud-test.lua (由 test-cloud-testez 提供)
_G.__isInCloud__ = true

-- 运行测试
require(game:GetService("ServerScriptService").TestRunner)
```

## 故障排除

### 常见问题

1. **Q: 为什么 `isInCloud` 始终为 false？**
   - A: 确保在 Cloud 环境中运行，并且 `_G.__isInCloud__` 标志已正确设置。

2. **Q: 为什么 debug 日志不显示？**
   - A: 确保在测试环境（Studio 或 Cloud）中运行，检查 `isEnableTest` 是否为 true。

3. **Q: 环境检测结果不一致？**
   - A: 确保 Env 实例在应用启动后创建，或在环境变化时重新创建。

### 调试技巧

```typescript
import { Env } from "bevy_roblox/env";
import { info } from "bevy_log";

const env = new Env();

// 输出完整的环境信息
info("Environment Debug Info:");
info(`  isClient: ${env.isClient}`);
info(`  isServer: ${env.isServer}`);
info(`  isStudio: ${env.isStudio}`);
info(`  isInCloud: ${env.isInCloud}`);
info(`  isEnableTest: ${env.isEnableTest}`);
info(`  robloxContext: ${env.robloxContext}`);
```

## 相关文档

- [云端测试技能文档](cloud_testing/SKILL.md)
- [Roblox 集成文档](roblox_integration/SKILL.md)
- [单元测试指南](unit_testing/SKILL.md)
- [集成测试指南](integration_testing/SKILL.md)
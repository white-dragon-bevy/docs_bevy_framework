---
name: cloud-testing
description: White Dragon Bevy 的 Roblox 云端测试环境。对应 Bevy 0.16 的 CiTestingPlugin，针对 Roblox 平台改造。提供环境检测、日志捕获等功能。
license: See project root LICENSE
allowed-tools:
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_roblox/**)
  - Read(//d/projects/white-dragon-bevy/bevy_framework/src/bevy_log/**)
  - Bash(npm test)
  - Bash(npm run build)
---

# Cloud Testing - 云端测试

## 与 Bevy 0.16 的关系

本插件对应 Bevy 0.16 的 `bevy_dev_tools::ci_testing::CiTestingPlugin`，针对 Roblox 平台进行了重大改造。

### 核心差异对比

| 特性 | Bevy CiTestingPlugin | White Dragon Cloud Testing |
|------|---------------------|----------------------------|
| **配置方式** | RON 文件 + `CI_TESTING_CONFIG` 环境变量 | 全局标志 `_G.__isInCloud__` |
| **事件系统** | 基于帧数的事件调度 | 环境感知的运行时检测 |
| **截图功能** | ✅ Screenshot/NamedScreenshot | ❌ 不支持 (Roblox 无 API) |
| **时间控制** | ✅ TimeUpdateStrategy::ManualDuration | ❌ 依赖 TestEZ |
| **环境检测** | 编译时特性开关 | 运行时 RunService 检测 |
| **日志过滤** | tracing 过滤器字符串 | isEnableTest 布尔开关 |
| **退出机制** | AppExit 事件 | Roblox 环境自动管理 |

### 为何不同？

**平台约束**:
- Roblox Cloud 无文件系统 → 不能用 RON 配置
- Roblox 无截图 API → 改用日志验证  
- Roblox 托管环境 → 应用生命周期受限

**测试哲学**:
- Bevy: 帧精确的视觉/性能测试
- White Dragon: 基于 TestEZ 的单元/集成测试

**实现策略**:
- Bevy: 声明式配置驱动
- White Dragon: 运行时环境检测

## 快速上手

### 环境检测 API

```typescript
import { Env } from "bevy_roblox";

const env = new Env();

// 环境类型 (对应 Bevy 的编译时特性)
env.isEnableTest // Studio 或 Cloud (等同 #[cfg(feature = "bevy_ci_testing")])
env.isStudio     // Roblox Studio
env.isInCloud    // Roblox Cloud 测试环境
env.isServer     // 服务端
env.isClient     // 客户端
env.robloxContext // 运行上下文 (Server 或 Client)
```

### 日志级别控制

```typescript
import { debug, trace, info, warn, error } from "bevy_log";

// 类似 Bevy 的 tracing 宏
debug("Debug info");   // 仅测试环境 (类似 tracing::debug!)
trace("Trace info");   // 仅测试环境 (类似 tracing::trace!)
info("Info");          // 所有环境 (类似 tracing::info!)
warn("Warning");       // 所有环境 (类似 tracing::warn!)
error("Error");        // 所有环境 (类似 tracing::error!)
```

| 日志级别 | 生产环境 | 测试环境 |
|---------|---------|---------|
| ERROR   | ✅      | ✅      |
| WARN    | ✅      | ✅      |
| INFO    | ✅      | ✅      |
| DEBUG   | ❌      | ✅      |
| TRACE   | ❌      | ✅      |

## 核心概念

### 概念 1: 全局测试标志

**Bevy 方式**: `std::env::var("CI_TESTING_CONFIG")` 环境变量
**White Dragon 方式**: `_G.__isInCloud__` 全局标志

```typescript
// Bevy: 从环境变量读取配置文件
// CI_TESTING_CONFIG=ci_testing_config.ron

// White Dragon 检测全局标志
const isInCloud = _G.__isInCloud__ === true;
```

**设计差异**: Bevy 用外部文件配置行为，White Dragon 用运行时标志检测环境。

### 概念 2: Env 统一环境检测

替代 Bevy 的编译时特性开关，提供运行时环境判断：

```typescript
const env = new Env();

// 对应 Bevy 的 #[cfg(feature = "bevy_ci_testing")]
if (env.isEnableTest) {
    runDebugCode();
}

// 环境特定逻辑 (Bevy 无此需求)
if (env.isStudio) {
    useStudioFeatures();
} else if (env.isInCloud) {
    useCloudFeatures();
}
```

### 概念 3: 日志自动捕获

**Bevy**: 通过 `tracing::subscriber` 和 `EnvFilter` 配置
**White Dragon**: 云端环境自动捕获，基于 `isEnableTest` 切换

## API 参考

### Env 类

#### `isEnableTest: boolean`
是否允许测试 (Studio 或 Cloud)

**对应 Bevy**: `#[cfg(feature = "bevy_ci_testing")]` 编译时检查

#### `isStudio: boolean`
是否在 Roblox Studio 环境 (开发调试)

#### `isInCloud: boolean`
是否在 Roblox Cloud 测试环境

**对应 Bevy**: 检测到 `CI_TESTING_CONFIG` 文件存在

#### `isServer / isClient: boolean`
服务端/客户端检测 (Bevy 无对应概念)

#### `robloxContext: RobloxContext`
运行上下文 (Server 或 Client)

**说明**: 提供 enum 类型的安全上下文检测

#### `isLocal: boolean`
是否为本地开发模式

**说明**: 本地模式时 `isServer` 和 `isClient` 同时为 `true`

### 日志函数

所有日志函数对应 Bevy 的 `tracing` 宏：

- `debug()` → `tracing::debug!`
- `trace()` → `tracing::trace!`
- `info()` → `tracing::info!`
- `warn()` → `tracing::warn!`
- `error()` → `tracing::error!`

## 最佳实践

### 1. 使用 Env 类检测环境

```typescript
// ✅ 推荐
import { Env } from "bevy_roblox";
const env = new Env();
if (env.isEnableTest) { }

// ❌ 避免
if (_G.__isInCloud__) { }
```

### 2. 使用框架日志 API

```typescript
// ✅ 推荐
import { debug } from "bevy_log";
debug("Debug info");

// ❌ 避免
if (env.isEnableTest) { print("Debug info"); }
```

### 3. 环境特定逻辑

```typescript
if (env.isStudio) {
    enableHotReload();
} else if (env.isInCloud) {
    enableCloudLogging();
} else {
    useMinimalLogging();
}
```

## 常见用例

### 用例 1: TestEZ 测试套件

```typescript
import { Env } from "bevy_roblox";
import { debug } from "bevy_log";

export = () => {
    const env = new Env();

    // 只在测试环境运行
    if (!env.isEnableTest) return;

    describe("功能测试", () => {
        beforeEach(() => debug("Test starting"));

        it("应该检测到测试环境", () => {
            expect(env.isEnableTest).to.equal(true);
        });

        it("应该正确检测 Cloud 环境", () => {
            if (env.isInCloud) {
                expect(env.isEnableTest).to.equal(true);
                debug("Cloud environment detected");
            }
        });

        it("应该正确识别运行上下文", () => {
            expect(env.robloxContext).to.be.oneOf(["Server", "Client"]);
        });
    });
};
```

### 用例 2: 环境感知系统

```typescript
import { Env } from "bevy_roblox";
import { debug, info } from "bevy_log";

function createSystem(world: World) {
    const env = new Env();

    return () => {
        if (env.isEnableTest) {
            debug("System tick in test mode");

            // Cloud 环境特殊处理
            if (env.isInCloud) {
                debug("Running in Cloud test environment");
            }
        }
        // 系统逻辑...
        info("System executed");
    };
}
```

## 限制与约束

### 相比 Bevy 缺失的功能

#### 1. 截图系统
**Bevy 有**: `Screenshot`, `NamedScreenshot`, `ScreenshotAndExit`
**White Dragon 无**: Roblox Cloud 无截图 API
**替代方案**: 使用日志输出 + TestEZ 断言

#### 2. 固定帧时间
**Bevy 有**: `TimeUpdateStrategy::ManualDuration`
**White Dragon 无**: 时间由 Roblox 引擎控制
**替代方案**: 使用 `os.clock()` 测量相对时间

#### 3. 基于帧的事件调度
**Bevy 有**: `CiTestingEventOnFrame(frame_number, event)`
**White Dragon 无**: 无帧计数器
**替代方案**: 使用 TestEZ 的测试生命周期

#### 4. 自定义测试事件
**Bevy 有**: `CiTestingCustomEvent`
**White Dragon 无**: 直接用 TestEZ
**替代方案**: 不需要，TestEZ 提供完整测试 API

## 迁移指南

### 从 Bevy CiTestingPlugin 迁移

#### 配置文件 → 环境标志

**Bevy**:
```ron
// ci_testing_config.ron
(
    setup: (
        fixed_frame_time: Some(0.03),
    ),
)
```

**White Dragon**:
```typescript
// 无需配置，运行时自动检测
const env = new Env();
```

#### 基于帧的事件 → 测试断言

**Bevy**:
```ron
events: [
    (100, Custom("event")),
    (200, Screenshot),
]
```

**White Dragon**:
```typescript
it("测试用例", () => {
    expect(result).to.equal(expected);
});
```

#### 截图验证 → 日志验证

**Bevy**:
```ron
(100, NamedScreenshot("test"))
```

**White Dragon**:
```typescript
import { debug } from "bevy_log";

it("验证状态", () => {
    debug("State:", state);
    expect(state.isValid).to.equal(true);
});
```

## 相关资源

### 源代码
- 环境检测: `src/bevy_roblox/env/index.ts`
- 日志系统: `src/bevy_log/lib.ts`

### Bevy 原始实现
- CI 测试插件: `bevy-origin/crates/bevy_dev_tools/src/ci_testing/`
- 配置定义: `config.rs`
- 事件系统: `systems.rs`

### 外部文档
- [Roblox Cloud 文档](https://create.roblox.com/docs/cloud)
- [TestEZ 文档](https://roblox.github.io/testez/)
- [Bevy CI Testing 文档](https://docs.rs/bevy/latest/bevy/dev_tools/ci_testing/)
- [云端测试环境文档](../cloud-test-environment.md)

## 检查清单

- [ ] 使用 `Env` 类检测环境
- [ ] 使用框架日志 API
- [ ] 检查 `isEnableTest` 权限
- [ ] 提供环境降级逻辑
- [ ] 使用日志验证替代截图
- [ ] 使用相对时间测量
- [ ] 遵循 TestEZ 测试模式

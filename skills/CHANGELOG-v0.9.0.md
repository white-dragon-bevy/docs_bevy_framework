# White Dragon Bevy Framework v0.9.0-alpha 变更日志

> **发布日期**: 2025-10-31
> **版本**: v0.9.0-alpha

## 概述

v0.9.0 是一个重大更新版本，引入了新的 Context 扩展模式和 App 扩展模式，重构了系统签名，提升了框架的可扩展性和易用性。

## 🎯 核心变更

### 1. Context 扩展模式 (Breaking Change)

**引入了新的资源访问机制**，允许插件模块通过类型安全的方式向 Context 对象添加资源引用访问器。

#### 新增 API

```typescript
// 注册 context 资源引用
setContextResourceRef<T>(name: string, id?, text?): void

// 访问资源（懒加载 + 缓存）
world.context.myResource
```

#### 影响的模块

所有插件模块都已迁移到新的扩展模式：

- **bevy_time**: 8个扩展（timeResource, virtualTime, realTime, fixedTime, genericTime, frameCount, timeStats, timeUpdateStrategy）
- **bevy_log**: 1个扩展（logger）
- **bevy_ecs_debugger**: 1个扩展（debuggerWidgets）
- **bevy_camera**: 相机相关扩展
- **bevy_state**: 状态相关扩展
- **bevy_diagnostic**: 诊断相关扩展

#### 迁移示例

**之前**（v0.8.x）:
```typescript
function system(world: World, context: Context): void {
    const ext = context.getExtension<TimeExtension>();
    const time = ext.virtualTime;
}
```

**之后**（v0.9.0+）:
```typescript
function system(world: World): void {
    const time = world.context.virtualTime;
}
```

**文档**: [Context 扩展模式](./architecture/context-extension-pattern.md)

### 2. 系统签名变更 (Breaking Change)

**移除了显式的 `context` 参数**，系统现在通过 `world.context` 访问应用程序上下文。

#### 签名对比

**旧签名**:
```typescript
function mySystem(world: World, context: Context): void { }
```

**新签名**:
```typescript
function mySystem(world: World): void { }
```

#### 影响范围

- ✅ 所有系统函数签名
- ✅ 系统配置对象中的系统函数
- ✅ 条件系统 (runIf) 的签名
- ✅ 所有示例代码和测试

#### 迁移工具

**正则替换**（VSCode / 支持正则的编辑器）:
- 查找: `\(world: World, context: Context\)`
- 替换为: `(world: World)`

**文档**: [系统签名变更迁移指南](./architecture/migration/system-signature-changes.md)

### 3. App 扩展模式

**新增了 App 扩展机制**，允许外部模块通过运行时方法注入扩展 App 类。

#### 新增 API

```typescript
// 注册 App 扩展方法
setAppExtension<TArgs, TReturn>(
    name: string,
    method: (this: App, ...args: TArgs) => TReturn
): void
```

#### 使用示例

```typescript
// 在外部模块中扩展 App
setAppExtension("initState", function (this: App, state) {
    const plugin = StatesPlugin.create({ defaultState: () => state });
    this.addPlugins(plugin);
    return this;
});

// 使用扩展方法
app.initState(() => GameState.Menu);
```

**文档**: [App 扩展模式指南](./architecture/app-extension-guide.md)

### 4. Debugger 增强

#### 本地调试器模式

新增了本地模式支持，允许客户端和服务端分离调试：

```typescript
// 客户端：正常业务
const clientApp = new App({env: {isLocal: true}});
clientApp.addPlugins(new DefaultPlugins());
clientApp.run();

// 服务端：单独启动调试器
const debugApp = new App();
debugApp.addPlugins(new DebuggerPlugin());
```

#### Context 扩展

新增 `context.debuggerWidgets` 访问器：

```typescript
function debugUI(world: World): void {
    const widgets = world.context.debuggerWidgets;
    widgets.window("Debug Info", () => {
        widgets.label("Debug information here");
    });
}
```

#### Plasma Widgets 完整示例

新增了完整的 Plasma widgets 使用示例（`src/__examples__/debugger/widgets.ts`），包含：
- Button, Checkbox, Label, Slider
- Heading, Row, Space, Table, Spinner
- Arrow, Blur, Highlight, Portal, Window

**示例文件**: `src/__examples__/debugger/widgets.ts`

## 📁 文件重命名

| 旧路径 | 新路径 | 原因 |
|--------|--------|------|
| `bevy_app/extensions.ts` | `bevy_app/app-extensions.ts` | 更明确的命名 |
| `bevy_xxx/extension.ts` | `bevy_xxx/context-extension.ts` | 区分 App 和 Context 扩展 |
| `bevy_log/lib.ts` | `bevy_log/plugin.ts` | 统一插件文件命名 |
| `bevy_state/extension.ts` | `bevy_state/types.ts` | 类型定义文件 |
| `bevy_time/extension.ts` | `bevy_time/types.ts` | 类型定义文件 |

## 🔧 API 变更

### 新增

- `setContextResourceRef<T>(name, id?, text?)` - 注册 context 资源引用
- `setAppExtension(name, method)` - 注册 App 扩展方法
- `world.context.xxx` - 通过 context 访问资源（懒加载 + 缓存）

### 移除

- `context.getExtension<T>()` - 使用 `world.context.xxx` 替代
- 系统签名中的 `context` 参数 - 通过 `world.context` 访问

### 修改

- Context 类构造函数参数 `world` 现在是 `readonly`
- Context 使用 metatable `__index` 实现懒加载

## 📝 文档更新

### 新增文档

- [Context 扩展模式](./architecture/context-extension-pattern.md)
- [系统签名变更迁移指南](./architecture/migration/system-signature-changes.md)
- [App 扩展模式指南](./architecture/app-extension-guide.md)

### 更新文档

- [bevy_time SKILL文档](./bevy_time/SKILL.md) - 添加 context 访问示例
- [bevy_log SKILL文档](./bevy_log/SKILL.md) - 添加 context.logger 使用
- [插件开发规范](./architecture/plugin-development-specification.md) - 更新扩展模式说明

### 更新示例

所有示例代码已更新为新的系统签名和 context 访问模式：
- `src/__examples__/time/*`
- `src/__examples__/app/custom_loop/*`
- `src/__examples__/dev/hot_reload/*`
- `src/__examples__/debugger/*` (新增)

## 🧪 测试更新

- ✅ 所有测试用例已更新为新签名
- ✅ 测试通过率保持 100% (1980/1980)
- ✅ 新增 debugger widgets 测试

## ⚠️ 破坏性变更

### 1. 系统签名变更

**影响**: 所有使用旧签名的系统函数将导致类型错误

**迁移**:
```typescript
// 旧代码
function system(world: World, context: Context): void { }

// 新代码
function system(world: World): void { }
```

### 2. 扩展访问方式变更

**影响**: 使用 `context.getExtension()` 的代码将编译失败

**迁移**:
```typescript
// 旧代码
const ext = context.getExtension<TimeExtension>();
const time = ext.virtualTime;

// 新代码
const time = world.context.virtualTime;
```

### 3. 文件导入路径变更

**影响**: 直接导入 `extension.ts` 的代码需要更新

**迁移**:
```typescript
// 旧代码
import { TimeExtension } from "bevy_time/extension";

// 新代码
import "bevy_time/context-extension"; // 自动注册扩展
```

## 🔄 兼容性

### 支持的版本

- ✅ roblox-ts: ^2.3.0
- ✅ @rbxts/matter: ^0.7.0
- ✅ @rbxts/matter-hooks: 最新版本
- ✅ TypeScript: 5.x

### 迁移时间表

- **v0.8.x**: 最后支持旧签名的版本
- **v0.9.0-alpha**: 新签名启用，旧签名废弃（当前版本）
- **v0.9.0**: 计划正式版本，完全移除旧签名支持

## 📊 性能影响

### Context 扩展性能

- **首次访问**: 资源查询 + 缓存写入
- **后续访问**: 直接读取缓存（O(1）查找）
- **内存占用**: 仅缓存已访问的资源

### 系统签名变更

- **无性能影响**: 仅是参数传递方式变更
- **代码简洁度**: 减少了冗余参数

## 🎓 升级建议

### 步骤 1: 备份代码

```bash
git checkout -b upgrade-to-v0.9.0
git commit -am "Backup before upgrading to v0.9.0"
```

### 步骤 2: 更新依赖

```bash
pnpm update @your-org/white-dragon-bevy@0.9.0-alpha
```

### 步骤 3: 批量替换系统签名

使用正则表达式在整个项目中查找和替换：
- 查找: `\(world: World, context: Context\)`
- 替换: `(world: World)`

### 步骤 4: 更新资源访问

手动更新所有 `context.getExtension()` 调用为 `world.context.xxx`

### 步骤 5: 测试

```bash
pnpm build
pnpm test
```

### 步骤 6: 提交变更

```bash
git add .
git commit -m "Upgrade to v0.9.0-alpha"
```

## 🐛 已知问题

### Issue #1: TypeScript 类型推导

在某些情况下，TypeScript 可能无法正确推导 `world.context.xxx` 的类型。

**解决方案**: 显式类型注解
```typescript
const time: VirtualTime = world.context.virtualTime;
```

### Issue #2: 热重载与 Context 缓存

在开发环境中使用热重载时，context 缓存可能不会自动清除。

**解决方案**: 重启应用或清除缓存
```typescript
// 临时解决方案（不推荐用于生产）
delete (world.context as unknown as Record<string, unknown>).myResource;
```

## 🔮 未来计划

### v0.9.1

- 更多 context 扩展示例
- 性能优化
- 文档完善

### v0.10.0

- 更多内置插件支持 context 扩展
- App 扩展模式增强
- 自动化迁移工具

## 📖 相关资源

### 文档

- [Context 扩展模式](./architecture/context-extension-pattern.md)
- [系统签名变更迁移指南](./architecture/migration/system-signature-changes.md)
- [App 扩展模式指南](./architecture/app-extension-guide.md)

### 示例

- [Time 示例](../src/__examples__/time/)
- [Debugger 示例](../src/__examples__/debugger/)
- [Hot Reload 示例](../src/__examples__/dev/hot_reload/)

### 支持

- GitHub Issues: https://github.com/your-org/white-dragon-bevy/issues
- 文档站点: https://docs.white-dragon-bevy.dev

## 🙏 致谢

感谢所有为这个版本做出贡献的开发者！

---

**完整提交历史**:
- `bb513b6` - feat: new context extension pattern
- `377cfa7` - fix: 移除签名中的 context
- `7e312eb` - chore: update lint, 对齐
- `0d3876f` - feat: debugger in local mode, context.debuggerWidget
- `f463511` - v0.9.0-alpha

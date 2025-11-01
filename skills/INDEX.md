# White Dragon Bevy 文档索引

> **版本**: v0.9.0-alpha
> **最后更新**: 2025-10-31

## 📖 快速导航

### 🚀 快速开始
- [项目概述](../CLAUDE.md) - 项目介绍和技术栈
- [快速入门](./getting_started/SKILL.md) - 新手入门指南
- [架构介绍](./architecture/white-dragon-bevy-introduction.md) - 框架架构概览

### 📋 重要变更
- [v0.9.0 变更日志](./CHANGELOG-v0.9.0.md) - 最新版本变更详情
- [文档更新总结](./DOCUMENTATION-UPDATE-SUMMARY.md) - 文档更新记录

## 🏗️ 架构文档

### 核心架构
| 文档 | 说明 | 版本 |
|------|------|------|
| [Context 扩展模式](./architecture/context-extension-pattern.md) | Context 资源访问机制 | v0.9.0+ |
| [App 扩展模式](./architecture/app-extension-guide.md) | App 运行时方法注入 | v0.9.0+ |
| [插件开发规范](./architecture/plugin-development-specification.md) | 插件开发指南 | 通用 |
| [插件扩展机制](./architecture/plugin-extensions.md) | 扩展机制详解 | 通用 |
| [设计哲学](./architecture/design-philosophy.md) | 框架设计理念 | 通用 |
| [World API 对比](./architecture/world-api-comparison.md) | World API 演进 | 通用 |

### 迁移指南
| 文档 | 说明 | 从版本 → 到版本 |
|------|------|----------------|
| [系统签名变更](./architecture/migration/system-signature-changes.md) | 系统函数签名迁移 | v0.8.x → v0.9.0+ |

## 📦 模块文档

### 核心模块

#### bevy_ecs - ECS 系统
- [SKILL 文档](./bevy_ecs/SKILL.md) - ECS 系统使用指南

#### bevy_app - 应用程序
- [SKILL 文档](./bevy_app/SKILL.md) - App 生命周期管理

#### bevy_time - 时间系统
- [SKILL 文档](./bevy_time/SKILL.md) - 时间、计时器和调度
- **Context 扩展**: `virtualTime`, `realTime`, `fixedTime`, `genericTime`, `timeResource`, `frameCount`, `timeStats`, `timeUpdateStrategy`

#### bevy_log - 日志系统
- [SKILL 文档](./bevy_log/SKILL.md) - 日志级别和过滤
- **Context 扩展**: `logger`

#### bevy_state - 状态管理
- [SKILL 文档](./bevy_state/SKILL.md) - 游戏状态机

### 渲染和UI

#### bevy_camera - 相机系统
- [SKILL 文档](./bevy_camera/SKILL.md) - 相机控制

#### bevy_render - 渲染系统
- [SKILL 文档](./bevy_render/SKILL.md) - 渲染管线

#### bevy_transform - 变换系统
- [SKILL 文档](./bevy_transform/SKILL.md) - 位置、旋转、缩放

### 动画和输入

#### bevy_animation - 动画系统
- [SKILL 文档](./bevy_animation/SKILL.md) - 动画控制
- [API 参考](./bevy_animation/references/api-reference.md)
- [故障排查](./bevy_animation/references/troubleshooting.md)

#### bevy_input - 输入系统
- [SKILL 文档](./bevy_input/SKILL.md) - 键盘、鼠标、触摸

### 调试和诊断

#### bevy_ecs_debugger - ECS 调试器
- [SKILL 文档](./bevy_ecs_debugger/SKILL.md) - 可视化调试工具
- **Context 扩展**: `debuggerWidgets`
- **新特性**: 本地模式、Plasma Widgets

#### bevy_diagnostic - 诊断系统
- [测试覆盖率 - bevy_ecs_debugger](./test-coverage/bevy_ecs_debugger.md)

## 🧪 测试文档

### 测试指南
- [单元测试 SKILL](./unit_testing/SKILL.md) - 单元测试编写指南
- [集成测试 SKILL](./integration_testing/SKILL.md) - 集成测试指南
- [云端测试 SKILL](./cloud_testing/SKILL.md) - Cloud 测试环境

### 测试覆盖率
| 模块 | 覆盖率报告 | 状态 |
|------|-----------|------|
| bevy_ecs | [覆盖率报告](./test-coverage/bevy_ecs.md) | ≥90% |
| bevy_core | [覆盖率报告](./test-coverage/bevy_core.md) | ≥60% |
| bevy_render | [覆盖率报告](./test-coverage/bevy_render.md) | ≥60% |
| bevy_ecs_debugger | [覆盖率报告](./test-coverage/bevy_ecs_debugger.md) | ≥60% |
| App 环境模拟 | [测试报告](./test-coverage/app-env-simulation.md) | 33 tests |
| bevy_time 扩展 | [分析报告](./test-coverage/bevy_time_extension_analysis.md) | 分析完成 |

## 📊 性能文档

### 性能基准
- [基准汇总](./benchmarks/baseline.md) - 总体性能基准
- [ECS 查询](./benchmarks/ecs-query.md) - 查询性能
- [调度器](./benchmarks/scheduler.md) - 系统调度性能
- [资源访问](./benchmarks/resource-access.md) - 资源访问性能

## 🎓 教程和示例

### 插件开发
- [插件开发示例](./create_bevy_plugin/examples/plugin-example/README.md)
- [系统示例](./create_bevy_plugin/examples/plugin-example/systems/path-calculate-system.ts)
- [插件数据流](./create_bevy_plugin/reference/plugin-data-flow.md)
- [Skill 文档](./create_bevy_plugin/Skill.md)

### 示例代码
- [系统节流指南](./getting_started/examples/system-throttle-guide.md)
- Time 示例: `src/__examples__/time/`
- Debugger 示例: `src/__examples__/debugger/`
- App 示例: `src/__examples__/app/`
- Hot Reload 示例: `src/__examples__/dev/hot_reload/`

## 🔧 Roblox 集成

### Roblox 专用功能
- [云端测试环境](./cloud-test-environment.md) - Cloud 环境测试
- [Roblox 集成 SKILL](./roblox_integration/SKILL.md) - Roblox 平台集成

## 📝 开发指南

### 最佳实践
- [插件扩展快速入门](./plugin_creation/plugin-extensions-quickstart.md)
- Context 扩展模式最佳实践 (见 [Context 扩展模式](./architecture/context-extension-pattern.md))
- 系统开发规范 (见 [CLAUDE.md](../CLAUDE.md))

### 代码规范
- [roblox-ts 规范](../.claude/agents/roblox-ts-pro.md)
- [Bevy Pro 规范](../.claude/agents/bevy/bevy-pro.md)

## 🔍 按主题查找

### Context 扩展
| 主题 | 相关文档 |
|------|---------|
| Context 扩展机制 | [Context 扩展模式](./architecture/context-extension-pattern.md) |
| bevy_time 扩展 | [bevy_time SKILL](./bevy_time/SKILL.md) |
| bevy_log 扩展 | [bevy_log SKILL](./bevy_log/SKILL.md) |
| bevy_ecs_debugger 扩展 | [bevy_ecs_debugger SKILL](./bevy_ecs_debugger/SKILL.md) |

### 系统开发
| 主题 | 相关文档 |
|------|---------|
| 系统签名 | [系统签名变更](./architecture/migration/system-signature-changes.md) |
| 系统节流 | [系统节流指南](./getting_started/examples/system-throttle-guide.md) |
| 热重载 | [Hot Reload 示例](../src/__examples__/dev/hot_reload/README.md) |

### 调试
| 主题 | 相关文档 |
|------|---------|
| ECS 调试器 | [bevy_ecs_debugger SKILL](./bevy_ecs_debugger/SKILL.md) |
| Plasma Widgets | [Widgets 示例](../src/__examples__/debugger/widgets.ts) |
| 本地模式调试 | [Local 模式示例](../src/__examples__/debugger/local.ts) |
| 日志调试 | [bevy_log SKILL](./bevy_log/SKILL.md) |

### 测试
| 主题 | 相关文档 |
|------|---------|
| 单元测试 | [单元测试 SKILL](./unit_testing/SKILL.md) |
| 集成测试 | [集成测试 SKILL](./integration_testing/SKILL.md) |
| Cloud 测试 | [云端测试 SKILL](./cloud_testing/SKILL.md) |
| 测试覆盖率 | [各模块覆盖率报告](./test-coverage/) |

## 📚 参考资料

### 外部资源
- [Rust Bevy 官方文档](https://bevyengine.org/)
- [@rbxts/matter 文档](https://eryn.io/matter/)
- [@rbxts/plasma 文档](https://github.com/matter-ecs/plasma)
- [roblox-ts 文档](https://roblox-ts.com/)

### 框架版本对应
- **White Dragon Bevy**: v0.9.0-alpha
- **Rust Bevy 参考版本**: 0.16-0.17-dev
- **Matter**: ^0.7.0
- **roblox-ts**: ^2.3.0

## 🗺️ 文档地图

```
docs/
├── INDEX.md                          # 本文件 - 文档索引
├── CHANGELOG-v0.9.0.md               # v0.9.0 变更日志
├── DOCUMENTATION-UPDATE-SUMMARY.md    # 文档更新总结
├── architecture/                      # 架构文档
│   ├── context-extension-pattern.md
│   ├── app-extension-guide.md
│   ├── migration/
│   │   └── system-signature-changes.md
│   └── ...
├── bevy_*/                           # 各模块文档
│   └── SKILL.md
├── test-coverage/                    # 测试覆盖率
├── benchmarks/                       # 性能基准
├── getting_started/                  # 入门指南
└── ...
```

## 🔄 文档更新日志

### v0.9.0-alpha (2025-10-31)
- ✅ 新增 Context 扩展模式文档
- ✅ 新增系统签名变更迁移指南
- ✅ 更新 bevy_time SKILL 文档
- ✅ 更新 bevy_log SKILL 文档
- ✅ 更新 bevy_ecs_debugger SKILL 文档
- ✅ 更新主 CLAUDE.md 文档
- ✅ 创建完整的文档索引

### v0.8.x
- App 环境模拟测试文档
- bevy_roblox 模块测试覆盖率
- 云端测试环境文档

## 📞 获取帮助

### 常见问题
1. **如何开始学习框架？**
   - 阅读 [项目概述](../CLAUDE.md)
   - 查看 [快速入门](./getting_started/SKILL.md)
   - 参考 [架构介绍](./architecture/white-dragon-bevy-introduction.md)

2. **如何迁移到 v0.9.0？**
   - 阅读 [v0.9.0 变更日志](./CHANGELOG-v0.9.0.md)
   - 参考 [系统签名迁移指南](./architecture/migration/system-signature-changes.md)
   - 查看 [Context 扩展模式](./architecture/context-extension-pattern.md)

3. **如何开发插件？**
   - 阅读 [插件开发规范](./architecture/plugin-development-specification.md)
   - 参考 [插件扩展快速入门](./plugin_creation/plugin-extensions-quickstart.md)
   - 查看 [插件示例](./create_bevy_plugin/examples/)

4. **如何调试？**
   - 使用 [ECS 调试器](./bevy_ecs_debugger/SKILL.md)
   - 配置 [日志系统](./bevy_log/SKILL.md)
   - 参考 [Debugger 示例](../src/__examples__/debugger/)

### 技术支持
- **GitHub Issues**: 提交问题和建议
- **文档问题**: 标记 `documentation` 标签
- **Bug 报告**: 提供详细的复现步骤

---

**维护者**: White Dragon Bevy 开发团队
**文档版本**: v0.9.0-alpha
**最后更新**: 2025-10-31

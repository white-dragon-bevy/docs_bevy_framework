# White Dragon Bevy Framework 文档项目

## 项目概述

通过 TypeDoc 为 framework/ 生成文档，整合 API 文档和开发指南。

## 包含的模块

API 文档包括以下模块：

- bevy_app - 应用程序生命周期管理和插件系统
- bevy_camera - 摄像机控制
- bevy_core - 核心类型和工具
- bevy_diagnostic - 性能监控和诊断
- bevy_ecs - 基于 Matter 的 ECS 实现
- bevy_ecs_debugger - ECS 调试器
- bevy_input - 输入事件处理
- bevy_internal - 内部工具和类型
- bevy_log - 日志记录
- bevy_render - 渲染管道
- bevy_state - 游戏状态机
- bevy_time - 时间追踪和控制
- bevy_transform - 位置、旋转、缩放管理
- simple_replication - 简单网络同步

## 文档结构

```
dist/
├── index.html              # 主页（文档导航）
├── api/                    # API 参考文档
│   ├── index.html
│   ├── modules/
│   └── ...
└── guides/                 # 开发指南
    ├── introduction.html
    ├── design-philosophy.html
    ├── plugin-development.html
    └── ...
```

## 文档维护指南

### 当前目标

**根据 bevy_framework/docs/ 目录重新组织首页和链接，维护文档的一致性和完整性。**

### 维护任务

1. **同步 docs/ 内容**
   - 当 `bevy_framework/docs/` 目录中有新文档时，需要：
     - 将新文档复制到 `pages/guides/`
     - 更新 `dist/index.html` 中的导航链接
     - 运行 `npm run docs:build` 重新生成

2. **更新主页导航**
   - 确保 `dist/index.html` 中的链接与 `guides/` 目录中的文件一致
   - 按照主题分类组织文档链接
   - 保持首页、指南、API 三个部分的清晰结构

3. **检查文档链接**
   - 定期检查所有链接是否有效
   - 确保模块列表与实际代码模块一致
   - 验证 guides 中的文档都能正确访问

4. **文档内容更新**
   - 当源代码 JSDoc 注释更新后，重新生成 API 文档
   - 当 `bevy_framework/docs/` 中的 Markdown 文件更新后，重新构建
   - 保持文档版本与代码版本同步

### 构建命令

```bash
# 构建所有文档
npm run docs:build

# 清理生成的文档
npm run docs:clean
```

### 注意事项

- 所有文档源文件位于 `bevy_framework/docs/`
- 生成的文档位于 `dist/`（已被 git 忽略）
- 修改文档后必须重新运行构建命令
- 主页模板在 `dist/index.html` 中，修改后需手动更新构建脚本

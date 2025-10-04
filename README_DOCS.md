# 文档生成说明

## 文档结构

生成的文档位于 `dist/` 目录，包含以下部分：

```
dist/
├── index.html              # 主页（文档导航）
├── api/                    # API 参考文档
│   ├── index.html
│   ├── modules/
│   ├── classes/
│   └── ...
└── guides/                 # 开发指南
    ├── introduction.html
    ├── design-philosophy.html
    ├── plugin-development.html
    ├── plugin-extensions.html
    ├── plugin-extensions-quickstart.html
    └── generic-type-handling.html
```

## 构建文档

### 一键构建

```bash
npm run docs:build
```

这个命令会：
1. 使用 TypeDoc 生成 API 文档到 `dist/api/`
2. 复制指南文档到 `dist/guides/`
3. 将 Markdown 文件转换为 HTML
4. 创建主页 `dist/index.html`

### 清理文档

```bash
npm run docs:clean
```

## 手动构建步骤

如果需要手动构建：

```bash
cd docs_bevy_framework

# 1. 生成 API 文档
npx typedoc --options typedoc.json

# 2. 转换 Markdown 为 HTML
node convert-md.js
```

## 查看文档

在浏览器中打开 `dist/index.html` 即可查看完整文档。

## 修改文档

- **API 文档**：修改源代码中的 JSDoc 注释
- **指南文档**：修改 `framework/docs/` 目录下的 Markdown 文件
- **主页**：修改 `dist/index.html`（需要在构建脚本前修改模板）

## 注意事项

- 文档会输出到 `dist/` 目录，该目录已在 `.gitignore` 中忽略
- 每次修改源代码或指南后，需要重新运行 `npm run docs:build`

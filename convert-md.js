const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const sourceDir = './pages/guides';
const targetDir = './dist/guides';

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));

const htmlTemplate = (title, content) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - White Dragon Bevy Framework</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1.5rem 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 1.8rem;
        }

        .nav {
            margin-top: 0.5rem;
        }

        .nav a {
            color: white;
            text-decoration: none;
            margin-right: 1.5rem;
            opacity: 0.9;
        }

        .nav a:hover {
            opacity: 1;
            text-decoration: underline;
        }

        .container {
            max-width: 900px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .content h1, .content h2, .content h3, .content h4 {
            color: #667eea;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
        }

        .content h1 {
            font-size: 2rem;
            border-bottom: 2px solid #667eea;
            padding-bottom: 0.5rem;
        }

        .content h2 {
            font-size: 1.5rem;
        }

        .content h3 {
            font-size: 1.25rem;
        }

        .content p {
            margin-bottom: 1rem;
        }

        .content ul, .content ol {
            margin-left: 2rem;
            margin-bottom: 1rem;
        }

        .content code {
            background: #f5f5f5;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }

        .content pre {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 1rem;
            border-radius: 6px;
            overflow-x: auto;
            margin-bottom: 1rem;
        }

        .content pre code {
            background: transparent;
            color: inherit;
            padding: 0;
        }

        .content a {
            color: #667eea;
            text-decoration: none;
        }

        .content a:hover {
            text-decoration: underline;
        }

        .content blockquote {
            border-left: 4px solid #667eea;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #666;
        }

        .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
        }

        .content th, .content td {
            border: 1px solid #ddd;
            padding: 0.75rem;
            text-align: left;
        }

        .content th {
            background: #f5f5f5;
            font-weight: 600;
        }

        footer {
            text-align: center;
            padding: 2rem;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <nav class="nav">
            <a href="../index.html">首页</a>
            <a href="../api/index.html">API 文档</a>
            <a href="./introduction.html">框架介绍</a>
        </nav>
    </div>

    <div class="container">
        <div class="content">
            ${content}
        </div>
    </div>

    <footer>
        <p>&copy; 2024 White Dragon Bevy Framework</p>
    </footer>
</body>
</html>`;

files.forEach(file => {
    const mdPath = path.join(sourceDir, file);
    const htmlPath = path.join(targetDir, file.replace('.md', '.html'));

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const htmlContent = marked(mdContent);

    // 从 markdown 中提取标题
    const titleMatch = mdContent.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

    const fullHtml = htmlTemplate(title, htmlContent);

    fs.writeFileSync(htmlPath, fullHtml);
    console.log(`Converted ${file} to ${path.basename(htmlPath)}`);
});

console.log('All markdown files converted to HTML!');

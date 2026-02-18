import * as vscode from 'vscode';

export class Scaffolder {
  public static async scaffold(root: vscode.Uri, files: Record<string, string>) {
    for (const [relativePath, content] of Object.entries(files)) {
      const uri = vscode.Uri.joinPath(root, relativePath);
      
      // Ensure directory exists
      const lastSlash = relativePath.lastIndexOf('/');
      if (lastSlash !== -1) {
        const dirPath = relativePath.substring(0, lastSlash);
        const dirUri = vscode.Uri.joinPath(root, dirPath);
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    }
  }

  public static async createReactTailwind(root: vscode.Uri, aiFiles: Record<string, string>, nodeName: string) {
    // Merge AI files with necessary boilerplate if missing
    const boilerplate: Record<string, string> = {
      'package.json': JSON.stringify({
        name: nodeName.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        dependencies: { "react": "^18.2.0", "react-dom": "^18.2.0" },
        devDependencies: { "tailwindcss": "^3.3.0", "autoprefixer": "^10.4.14", "postcss": "^8.4.24" }
      }, null, 2),
      'tailwind.config.js': `module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}`
    };

    const finalFiles = { ...boilerplate, ...aiFiles };
    await this.scaffold(root, finalFiles);
  }

  public static async createHtmlCss(root: vscode.Uri, aiFiles: Record<string, string>, nodeName: string) {
    const boilerplate: Record<string, string> = {};
    const title = nodeName || 'Generated Design';
    
    // Core HTML project layout
    const htmlPath = 'index.html';
    const cssPath = 'assets/css/style.css';

    // If AI gave standard files, we respect them but move CSS if needed for organization
    let mainHtml = aiFiles['index.html'] || aiFiles['html'] || Object.values(aiFiles).find(v => v.includes('<html') || v.includes('<div')) || '';
    let mainCss = aiFiles['style.css'] || aiFiles['assets/css/style.css'] || aiFiles['css'] || '';

    // If it's a raw fragment, wrap it in a professional shell
    if (!mainHtml.includes('<html')) {
        mainHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="${cssPath}">
    <style>
        /* Base Reset */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #333; }
    </style>
</head>
<body>
    ${mainHtml}
</body>
</html>`;
    }

    boilerplate[htmlPath] = mainHtml;
    if (mainCss) boilerplate[cssPath] = mainCss;

    const finalFiles = { ...aiFiles, ...boilerplate };
    // Cleanup AI keys that were moved
    delete finalFiles['html'];
    delete finalFiles['css'];

    await this.scaffold(root, finalFiles);
  }
}

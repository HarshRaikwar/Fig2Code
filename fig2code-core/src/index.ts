import * as fs from 'fs';
import * as path from 'path';
import { FigmaParser } from './parser/index.js';
import { FigmaToIRConverter } from './generator/converter.js';
import { HtmlGenerator } from './generator/html.js';
import { CssGenerator } from './generator/css.js';

const parser = new FigmaParser();
const converter = new FigmaToIRConverter();
const htmlGen = new HtmlGenerator();
const cssGen = new CssGenerator();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: fig2code <input-file.json> <output-dir>');
    process.exit(1);
    return;
  }

  const inputFile = path.resolve(args[0]);
  const outputDir = path.resolve(args[1]);

  console.log(`Loading Figma file: ${inputFile}`);
  parser.loadFile(inputFile);

  const root = parser.findFirstCanvas(); // Or use parser.getRoot() if processing entire doc
  if (!root) {
    console.error('No Canvas/Page found in document.');
    process.exit(1);
    return;
  }

  console.log(`Processing Frame/Canvas: ${root.name} (${root.id})`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Convert to IR
  // Only process children of canvas for now, as canvas itself is infinite usually.
  // Or if root is a FRAME, process it directly.
  // Let's iterate over children frames of the canvas and generate separate files or one big file?
  // For Phase 3, let's pick the first top-level FRAME on the canvas.
  const mainFrame = root.children?.find(c => c.type === 'FRAME');
  
  if (!mainFrame) {
    console.warn('No top-level FRAME found on the first page. Processing the page itself (might be huge).');
    // process root directly
    const ir = converter.convert(root);
    
    // Generate
    const html = htmlGen.generate(ir);
    const css = cssGen.generate(ir);

    fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
  } else {
    // Process the first frame found
    console.log(`Found main frame: ${mainFrame.name}`);
    const ir = converter.convert(mainFrame);
    
    // Generate
    const html = htmlGen.generate(ir);
    const css = cssGen.generate(ir);

    fs.writeFileSync(path.join(outputDir, 'index.html'), `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${mainFrame.name}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            justify-content: center;
        }
    </style>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    ${html}
</body>
</html>`);
    fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
  }

  console.log(`Successfully generated code in ${outputDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

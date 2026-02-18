import type { IRNode, Style } from '../types/ir.js';

export class HtmlGenerator {
  public generate(node: IRNode): string {
    const tagName = node.type || 'div';
    const classAttr = node.classes.length > 0 ? ` class="${node.classes.join(' ')}"` : '';
    const styleAttr = ''; // We will use external CSS for cleanliness, or inline for now?
    // User wants "Basic CSS generation" which implies separate CSS file or output.
    // Let's stick to classes and generate a separate CSS file.
    
    // Attributes
    let attributes = '';
    if (node.attributes) {
      attributes = Object.entries(node.attributes)
        .map(([key, value]) => ` ${key}="${value}"`)
        .join('');
    }

    let html = `<${tagName}${classAttr}${attributes}>`;

    if (node.textContent) {
      html += node.textContent;
    }

    if (node.children && node.children.length > 0) {
      html += '\n' + node.children.map(child => this.generate(child)).join('\n') + '\n';
    }

    html += `</${tagName}>`;
    return html;
  }
}

import type { IRNode, Style } from '../types/ir.js';

export class CssGenerator {
  private styles: Map<string, Style> = new Map();

  constructor() {}

  public generate(node: IRNode): string {
    this.collectStyles(node);
    let css = '';
    
    this.styles.forEach((style, className) => {
      const properties = Object.entries(style)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `  ${this.camelToKebab(key)}: ${value};`)
        .join('\n');
      
      if (properties) {
        css += `.${className} {\n${properties}\n}\n`;
      }
    });
    
    return css;
  }

  private collectStyles(node: IRNode): void {
    if (node.classes && node.classes.length > 0) {
      // Assuming one main class per node for now, or merge styles
      // In Converter, we add `node-${id}` as the first class.
      const className = node.classes[0];
      this.styles.set(className, node.style);
    }
    
    if (node.children) {
      node.children.forEach(child => this.collectStyles(child));
    }
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

import { FigmaNode } from './FigmaClient';

export interface IRNode {
  type: string;
  name: string;
  id: string;
  classes: string[];
  style: Record<string, any>;
  children?: IRNode[];
  textContent?: string;
  attributes?: Record<string, string>;
}

export class Generator {
  public convertToIR(node: FigmaNode, parent?: FigmaNode): IRNode {
    const irNode: IRNode = {
      type: 'div',
      name: node.name,
      id: node.id,
      classes: [`node-${node.id.replace(/:/g, '-')}`],
      style: {},
      children: [],
      attributes: {},
    };

    if (node.type === 'TEXT') {
      irNode.type = 'p';
      irNode.textContent = node.characters;
    } else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      irNode.type = 'div';
    }

    this.applyStyles(irNode, node, parent);

    if (node.children) {
      irNode.children = node.children.map(child => this.convertToIR(child, node));
    }

    return irNode;
  }

  private applyStyles(irNode: IRNode, node: FigmaNode, parent?: FigmaNode) {
    const style: any = {};

    if (node.absoluteBoundingBox) {
        style.width = `${node.absoluteBoundingBox.width}px`;
        style.height = `${node.absoluteBoundingBox.height}px`;
        
        if (parent && parent.absoluteBoundingBox) {
            style.position = 'absolute';
            style.left = `${node.absoluteBoundingBox.x - parent.absoluteBoundingBox.x}px`;
            style.top = `${node.absoluteBoundingBox.y - parent.absoluteBoundingBox.y}px`;
        } else {
            style.position = 'relative';
        }
    }

    if (node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === 'SOLID' && fill.color) {
            const r = Math.round(fill.color.r * 255);
            const g = Math.round(fill.color.g * 255);
            const b = Math.round(fill.color.b * 255);
            const a = fill.opacity ?? (fill.color.a ?? 1);
            if (node.type === 'TEXT') {
                style.color = `rgba(${r}, ${g}, ${b}, ${a})`;
            } else {
                style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
            }
        }
    }

    if (node.type === 'TEXT' && node.style) {
        style.fontSize = `${node.style.fontSize}px`;
        style.fontWeight = node.style.fontWeight;
        style.fontFamily = node.style.fontFamily;
    }

    irNode.style = style;
  }

  public generateHTML(node: IRNode): string {
    const tagName = node.type || 'div';
    const classAttr = node.classes.length > 0 ? ` class="${node.classes.join(' ')}"` : '';
    let html = `<${tagName}${classAttr}>`;
    if (node.textContent) html += node.textContent;
    if (node.children) {
      html += node.children.map(child => this.generateHTML(child)).join('');
    }
    html += `</${tagName}>`;
    return html;
  }

  public generateCSS(node: IRNode, styles: Map<string, any> = new Map()): string {
    if (node.classes.length > 0) {
        styles.set(node.classes[0], node.style);
    }
    if (node.children) {
        node.children.forEach(child => this.generateCSS(child, styles));
    }

    let css = '';
    styles.forEach((style, className) => {
        const props = Object.entries(style)
            .map(([k, v]) => `  ${k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}: ${v};`)
            .join('\n');
        if (props) {
            css += `.${className} {\n${props}\n}\n\n`;
        }
    });
    return css;
  }
}

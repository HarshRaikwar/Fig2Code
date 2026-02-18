import type { FigmaNode, Paint } from '../types/figma.js';
import type { IRNode, Style } from '../types/ir.js';
import { StyleConverter } from '../utils/styles.js';

export class FigmaToIRConverter {
  constructor() {}

  public convert(node: FigmaNode, parent?: FigmaNode): IRNode {
    const irNode: IRNode = {
      type: 'div',
      name: node.name,
      id: node.id,
      classes: [`node-${node.id.replace(/:/g, '-')}`],
      style: {},
      children: [],
      attributes: {},
    };

    // Determine basic HTML tag
    if (node.type === 'TEXT') {
      irNode.type = 'p'; // Default to p, maybe h1-h6 based on size later
      irNode.textContent = node.characters;
    } else if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE') {
      if (this.hasImageFill(node)) {
        irNode.type = 'img';
        const imageFill = node.fills?.find(f => f.type === 'IMAGE');
        if (imageFill) {
          irNode.attributes = { src: imageFill.imageRef || '', alt: node.name };
        }
      } else {
        irNode.type = 'div';
      }
    } else if (node.type === 'VECTOR') {
      irNode.type = 'div'; // Placeholder for SVG or simple vector
      irNode.classes.push('vector-placeholder');
    }

    // Styles
    this.applyStyles(irNode, node, parent);

    // Recursively convert children
    if (node.children) {
      // Sort children by y then x for better flow if absolute? 
      // Figma order is usually z-index (bottom to top). 
      // Use original order for now to respect z-index in stacking contexts.
      irNode.children = node.children.map(child => this.convert(child, node));
    }

    return irNode;
  }

  private hasImageFill(node: FigmaNode): boolean {
    return node.fills?.some(f => f.type === 'IMAGE' && f.visible !== false) || false;
  }

  private applyStyles(irNode: IRNode, node: FigmaNode, parent?: FigmaNode): void {
    const irStyle: Style = {};

    // 1. Position & Layout
    if (parent && parent.layoutMode && parent.layoutMode !== 'NONE') {
      // Parent is Flex container
      irStyle.position = 'static'; // Default
      // Handle alignment self/grow if needed
    } else {
      // Parent is Absolute or this is Root
      irStyle.position = 'absolute';
      if (node.absoluteBoundingBox) {
        if (parent && parent.absoluteBoundingBox) {
          irStyle.left = `${node.absoluteBoundingBox.x - parent.absoluteBoundingBox.x}px`;
          irStyle.top = `${node.absoluteBoundingBox.y - parent.absoluteBoundingBox.y}px`;
        } else {
          // This is the root node of the conversion
          irStyle.position = 'relative';
          irStyle.left = '0px';
          irStyle.top = '0px';
        }
        irStyle.width = `${node.absoluteBoundingBox.width}px`;
        irStyle.height = `${node.absoluteBoundingBox.height}px`;
      }
    }
    
    // Auto Layout Props (if this node is a container)
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      irStyle.display = 'flex';
      irStyle.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
      irStyle.gap = `${node.itemSpacing}px`;
      irStyle.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
      
      // Map alignments
      if (node.primaryAxisAlignItems) {
        irStyle.justifyContent = this.mapAlign(node.primaryAxisAlignItems);
      }
      if (node.counterAxisAlignItems) {
        irStyle.alignItems = this.mapAlign(node.counterAxisAlignItems);
      }
    }

    // 2. Visuals (Color, Border, etc.)
    // Fills logic is complex (multiple fills). Simplified:
    if (node.fills) {
      const solidFill = node.fills.find(f => f.type === 'SOLID' && f.visible !== false);
      if (solidFill && solidFill.color) {
        // If type is TEXT, fill converts to color, else backgroundColor
        if (node.type === 'TEXT') {
           irStyle.color = this.convertColor(solidFill.color, solidFill.opacity);
        } else {
           irStyle.backgroundColor = this.convertColor(solidFill.color, solidFill.opacity);
        }
      }
    }

    // Text specific
    if (node.type === 'TEXT' && node.style) {
      irStyle.fontSize = `${node.style.fontSize}px`;
      irStyle.fontWeight = node.style.fontWeight;
      irStyle.fontFamily = node.style.fontFamily;
      if (node.style.textAlignHorizontal) irStyle.textAlign = node.style.textAlignHorizontal.toLowerCase();
      if (node.style.lineHeightPx) irStyle.lineHeight = `${Math.round(node.style.lineHeightPx)}px`;
    }

    // Borders / Strokes
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes.find(s => s.visible !== false);
      if (stroke && stroke.color) {
        irStyle.border = `${node.strokeWeight || 1}px solid ${this.convertColor(stroke.color, stroke.opacity)}`;
      }
    }

    // Corner Radius
    if (node.cornerRadius) {
      irStyle.borderRadius = `${node.cornerRadius}px`;
    }

    irNode.style = irStyle;
  }

  private mapAlign(align: string): string {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }

  private convertColor(color: { r: number, g: number, b: number, a: number }, opacity?: number): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = (color.a !== undefined ? color.a : 1) * (opacity !== undefined ? opacity : 1);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
  }
}

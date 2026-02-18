import type { Color, Paint, Effect, TypeStyle, FigmaNode } from '../types/figma.js';
import type { Style } from '../types/ir.js';

export class StyleConverter {
  public static convertColor(color?: Color, opacity?: number): string {
    if (!color) return 'transparent';
    const alpha = (color.a || 1) * (opacity !== undefined ? opacity : 1);
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }

  public static getBackground(node: FigmaNode): { backgroundColor?: string; backgroundImage?: string; color?: string } {
    let style: { backgroundColor?: string; backgroundImage?: string; color?: string } = {};

    if (node.fills && node.fills.length > 0) {
      // Prioritize the top-most visible fill (last in array usually renders on top, but effectively we iterate)
      // Actually Figma renders bottom-up in children list, but fills are a property.
      // Let's take the first visible fill for now -> simpler
      const fill = node.fills.find(f => f.visible !== false);
      if (fill) {
        if (fill.type === 'SOLID') {
          style.backgroundColor = this.convertColor(fill.color, fill.opacity);
        } else if (fill.type === 'IMAGE') {
           // For image fills, we might return a background-image url or handle it as an img tag
           // For Phase 3, let's use a placeholder if no URL
           style.backgroundImage = `url('${fill.imageRef || 'placeholder.png'}')`;
           style.backgroundColor = 'transparent'; // Override default
        } else if (fill.type === 'GRADIENT_LINEAR') {
            // Basic gradient support
            // style.backgroundImage = ...
        }
      }
    }
    return style;
  }

  public static getTypography(style?: TypeStyle): Partial<Style> {
    if (!style) return {};
    return {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      fontWeight: style.fontWeight,
      textAlign: style.textAlignHorizontal?.toLowerCase(),
      // Line height logic is complex in Figma, simplified for now
      lineHeight: style.lineHeightUnit === 'PIXELS' ? `${style.lineHeightPx}px` : undefined,
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
    };
  }

  public static getLayout(node: FigmaNode): Partial<Style> {
    const style: Partial<Style> = {};

    // Auto Layout (Flexbox)
    if (node.layoutMode && node.layoutMode !== 'NONE') {
      style.display = 'flex';
      style.flexDirection = node.layoutMode === 'VERTICAL' ? 'column' : 'row';
      style.gap = `${node.itemSpacing}px`;
      
      // Alignment
      if (node.primaryAxisAlignItems) {
        style.justifyContent = this.mapAlign(node.primaryAxisAlignItems);
      }
      if (node.counterAxisAlignItems) {
        style.alignItems = this.mapAlign(node.counterAxisAlignItems);
      }

      // Padding
      if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
        style.padding = `${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`;
      }
    } else {
        // Absolute positioning (simplest fallback for non-auto-layout frames)
        // Note: In HTML, parent must be relative.
        style.position = 'absolute';
        if (node.absoluteBoundingBox) {
           // This requires knowing the parent's position to calculate relative top/left.
           // For root, it's absolute.
           // We might need to handle this in the converter where parent context is available.
           style.width = `${node.absoluteBoundingBox.width}px`;
           style.height = `${node.absoluteBoundingBox.height}px`;
        }
    }

    // Border Radius
    if (node.cornerRadius) {
        style.borderRadius = `${node.cornerRadius}px`;
    }
    
    // Strokes (Border)
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
        const stroke = node.strokes.find(s => s.visible !== false);
        if (stroke && stroke.type === 'SOLID') {
            style.border = `${node.strokeWeight}px solid ${this.convertColor(stroke.color, stroke.opacity)}`;
        }
    }

    // Effects (Shadows)
    if (node.effects) {
        const shadows = node.effects.filter(e => e.type === 'DROP_SHADOW' && e.visible !== false);
        if (shadows.length > 0) {
            style.boxShadow = shadows.map(s => {
                const color = this.convertColor(s.color, s.opacity); // Helper needed if color exists on effect
                return `${s.offset?.x || 0}px ${s.offset?.y || 0}px ${s.radius}px ${color}`;
            }).join(', ');
        }
    }

    return style;
  }

  private static mapAlign(align: string): string {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'CENTER': return 'center';
      case 'MAX': return 'flex-end';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Constraint {
  type: string;
  value: number;
}

export interface LayoutConstraint {
  vertical: string;
  horizontal: string;
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'IMAGE' | 'VIDEO';
  color?: Color;
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
  imageRef?: string;
  // Add other properties as needed
}

export interface Effect {
  type: string;
  visible: boolean;
  radius: number;
  color?: Color;
  opacity?: number;
  offset?: { x: number; y: number };
}

export interface TypeStyle {
  fontFamily: string;
  fontPostScriptName: string | null;
  fontWeight: number;
  fontSize: number;
  textAlignHorizontal: string;
  textAlignVertical: string;
  letterSpacing: number;
  lineHeightPx: number;
  lineHeightPercent: number;
  lineHeightUnit: string;
  [key: string]: any;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'FRAME' | 'GROUP' | 'TEXT' | 'RECTANGLE' | 'ELLIPSE' | 'VECTOR' | 'LINE' | 'STAR' | 'BOOLEAN_OPERATION' | 'COMPONENT' | 'INSTANCE' | 'SLICE';
  visible?: boolean;
  children?: FigmaNode[];
  absoluteBoundingBox?: Rect;
  absoluteRenderBounds?: Rect;
  constraints?: LayoutConstraint;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: string;
  effects?: Effect[];
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  backgroundColor?: Color;
  characters?: string; // For TEXT
  style?: TypeStyle; // For TEXT
  opacity?: number;
  blendMode?: string;
  isMask?: boolean;
  [key: string]: any;
}

export interface FigmaDocument {
  document: FigmaNode;
}

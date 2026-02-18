export interface Style {
  width?: string | undefined;
  height?: string | undefined;
  backgroundColor?: string | undefined;
  color?: string | undefined; // Text color
  fontSize?: string | undefined;
  fontFamily?: string | undefined;
  fontWeight?: string | number | undefined;
  textAlign?: string | undefined;
  borderRadius?: string | undefined;
  border?: string | undefined;
  display?: string | undefined;
  flexDirection?: string | undefined;
  alignItems?: string | undefined;
  justifyContent?: string | undefined;
  gap?: string | undefined;
  padding?: string | undefined;
  margin?: string | undefined;
  position?: string | undefined;
  left?: string | undefined;
  top?: string | undefined;
  zIndex?: number | undefined;
  opacity?: number | undefined;
  backgroundImage?: string | undefined;
  backgroundSize?: string | undefined;
  boxShadow?: string | undefined;
  overflow?: string | undefined;
  [key: string]: any;
}

export interface IRNode {
  type: 'div' | 'span' | 'img' | 'p' | 'button' | 'input' | 'a';
  name: string;
  id: string; // Figma ID or generated ID
  classes: string[];
  style: Style;
  children: IRNode[];
  textContent?: string | undefined;
  attributes?: { [key: string]: string } | undefined; // e.g. src, href
}

export interface IR {
  root: IRNode;
}

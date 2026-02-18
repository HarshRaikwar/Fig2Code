import * as fs from 'fs';
import type { FigmaDocument, FigmaNode } from '../types/figma.js';

export class FigmaParser {
  private document: FigmaDocument | null = null;
  private nodeMap: Map<string, FigmaNode> = new Map();

  constructor() {}

  public loadFile(filePath: string): void {
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      this.document = JSON.parse(rawData);
      if (this.document) {
        this.indexNodes(this.document.document);
      }
    } catch (error) {
      console.error(`Error loading Figma file: ${error}`);
      throw error;
    }
  }

  private indexNodes(node: FigmaNode): void {
    this.nodeMap.set(node.id, node);
    if (node.children) {
      node.children.forEach(child => this.indexNodes(child));
    }
  }

  public getNodeById(id: string): FigmaNode | undefined {
    return this.nodeMap.get(id);
  }

  public getRoot(): FigmaNode | undefined {
    return this.document?.document;
  }

  // Find the first Page or Frame to process if no specific ID is given
  public findFirstCanvas(): FigmaNode | undefined {
    return this.document?.document.children?.find(child => child.type === 'CANVAS');
  }
}

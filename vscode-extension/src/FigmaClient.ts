import axios from 'axios';

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  [key: string]: any;
}

export class FigmaClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getFile(fileKey: string): Promise<any> {
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': this.token,
      },
    });
    return response.data;
  }

  async getNode(fileKey: string, nodeId: string): Promise<FigmaNode> {
    const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
      headers: {
        'X-Figma-Token': this.token,
      },
    });
    
    if (!response.data.nodes || !response.data.nodes[nodeId]) {
      // Sometimes the API returns the ID with : even if we requested with - or vice versa
      // Let's try to find it by normalizing
      const keys = Object.keys(response.data.nodes || {});
      const normalizedRequested = nodeId.replace(/-/g, ':');
      const foundKey = keys.find(k => k.replace(/-/g, ':') === normalizedRequested);
      
      if (foundKey) {
        return response.data.nodes[foundKey].document;
      }
      
      throw new Error(`Node with ID ${nodeId} not found in the Figma file.`);
    }
    
    return response.data.nodes[nodeId].document;
  }

  static parseUrl(url: string): { fileKey: string; nodeId?: string } {
    // Handle both /file/ and /design/ URLs
    // Standard URL: https://www.figma.com/design/FILE_KEY/...
    const fileMatch = url.match(/figma\.com\/(?:file|design)\/([^/?#]+)/);
    const nodeMatch = url.match(/node-id=([^&#]+)/);

    if (!fileMatch) {
      throw new Error('Invalid Figma URL');
    }

    return {
      fileKey: fileMatch[1],
      nodeId: nodeMatch ? decodeURIComponent(nodeMatch[1]).replace(/-/g, ':') : undefined,
    };
  }
}

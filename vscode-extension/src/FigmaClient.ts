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

  private async requestWithRetry(url: string, retries = 2): Promise<any> {
    try {
      return await axios.get(url, {
        headers: { 'X-Figma-Token': this.token },
      });
    } catch (error: any) {
      if (error.response?.status === 429 && retries > 0) {
        // Wait 1 second and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.requestWithRetry(url, retries - 1);
      }
      if (error.response?.status === 403) {
          throw new Error("Figma Access Denied: Check if your Figma Token is valid and has access to this file.");
      }
      throw error;
    }
  }

  async getFile(fileKey: string): Promise<any> {
    const response = await this.requestWithRetry(`https://api.figma.com/v1/files/${fileKey}`);
    return response.data;
  }

  async getNode(fileKey: string, nodeId: string): Promise<FigmaNode> {
    const response = await this.requestWithRetry(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`);
    
    if (!response.data.nodes || !response.data.nodes[nodeId]) {
      const keys = Object.keys(response.data.nodes || {});
      const normalizedRequested = nodeId.replace(/-/g, ':');
      const foundKey = keys.find(k => k.replace(/-/g, ':') === normalizedRequested);
      
      if (foundKey) {
        return response.data.nodes[foundKey].document;
      }
      throw new Error(`Node with ID ${nodeId} not found in the Figma file. Ensure the layer exists.`);
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

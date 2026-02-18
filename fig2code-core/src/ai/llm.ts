import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-1.5-flash for speed or gemini-1.5-pro for better code quality
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  public async refactorToSemantic(figmaJson: string, rawHtml: string): Promise<{ html: string; css: string }> {
    const prompt = `
      You are an expert Frontend Engineer. 
      I have a raw HTML conversion from Figma that uses absolute positioning and generic div tags.
      
      TASK:
      1. Analyze the Figma JSON structure provided.
      2. Refactor the provided HTML into semantic HTML5 (header, nav, section, article, footer, etc.).
      3. Refactor the CSS to use Modern Flexbox and Grid instead of absolute positioning.
      4. Use BEM naming conventions for classes.
      5. Ensure it is responsive.

      FIGMA JSON SLICE:
      ${figmaJson.substring(0, 5000)} // Limit size for token constraints

      RAW HTML:
      ${rawHtml}

      RETURN ONLY A JSON OBJECT:
      {
        "html": "...",
        "css": "..."
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      // Basic cleaning of Markdown code blocks if any
      const cleanedJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedJson);
    } catch (error) {
      console.error("AI Refactor failed:", error);
      throw error;
    }
  }
}

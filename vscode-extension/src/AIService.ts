import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  public async refineCode(figmaData: any, rawHtml: string, framework: string): Promise<Record<string, string>> {
    const prompt = `
      You are an elite Frontend Architect participating in a high-stakes AI hackathon.
      I have a raw conversion from Figma that uses absolute positioning and generic tags.
      
      TASK:
      1. Refactor this into a professional, modular, and industry-standard project for the "${framework}" target.
      2. Extract reusable components. Don't just give one giant file.
      3. Use modern layout techniques (Flexbox/Grid). NO absolute positioning unless strictly necessary for overlays.
      4. Naming: Use descriptive, semantic names (e.g., "FeatureCard.tsx", "Hero.tsx", "globals.css").
      
      FRAMEWORK SPECIFIC RULES:
      - If "react": Use Functional Components with Tailwind CSS. Create separate files for components and a main App.tsx. Use clean props if multiple instances exist.
      - If "html": Use BEM (Block Element Modifier) methodology for CSS. Use semantic tags (<header>, <main>, <article>, etc.).

      FIGMA DATA (Context):
      ${JSON.stringify(figmaData).substring(0, 3000)}
      
      RAW HTML TO REFACTOR:
      ${rawHtml}
      
      STRICT OUTPUT FORMAT:
      Return ONLY a JSON object where keys are file paths and values are file contents.
      Example for React:
      {
        "src/components/Button.tsx": "...",
        "src/components/Header.tsx": "...",
        "src/App.tsx": "...",
        "src/index.css": "..."
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const cleanedJson = text.replace(/```json|```/g, "").trim();
      
      // Basic sanity check to ensure it's JSON
      try {
        return JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("JSON Parsing failed. Text was:", text);
        throw new Error("AI returned invalid JSON structure.");
      }
    } catch (error: any) {
      if (error.status === 429 || error.message?.includes('429')) {
        throw new Error("AI Quota Exceeded: The shared 'Master Key' is being used too much. Please add your own Gemini key in Settings ⚙️ to continue immediately.");
      }
      console.error("AI Refinement failed:", error);
      throw error;
    }
  }
}

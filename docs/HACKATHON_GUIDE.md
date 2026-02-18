# 🏆 Fig2Code AI: Hackathon Pitch & Guide

## The Problem
Existing Figma-to-Code tools are "dumb." They take Figma's absolute coordinates and create unmaintainable "div-soup" that developers have to rewrite from scratch.

## The Solution
**Fig2Code AI** is an intelligent bridge. It uses a **Hybrid Reconstruction Engine**:
1. **Geometric Layer:** Maps raw Figma geometry to CSS properties (Colors, Fonts, Sizes).
2. **Semantic Brain (AI):** Uses LLMs (Gemini/GPT) to recognize UI patterns (Navbars, Cards, Buttons) and refactors the layout into semantic HTML5 and responsive Flexbox/Grid.

## Tech Stack
- **Core Engine:** TypeScript, Node.js.
- **AI Backend:** Google Gemini 1.5 Pro API.
- **VS Code Extension:** VS Code Webview API, Webpack.

## Architecture
```text
Figma URL -> [Figma API] -> Raw JSON -> [Core Parser] -> Intermediate Repr (IR)
                                                                 |
                                                                 v
                                                        [AI Refinement Layer]
                                                                 |
                                                                 v
                                                       Clean HTML5 / Modern CSS
```

## How to Demo (The "User Flow")
1. **Activate:** Open the "Fig2Code AI" icon in the VS Code Activity Bar.
2. **Configure:** Paste your Figma Token (this is saved securely in extension settings).
3. **Capture:** Paste a Figma File URL and click **Generate AI Code**.
4. **Compare:** The extension shows a preview.
5. **Ship:** Click **Apply** to instantly create the files in your current workspace.

## Future Vision (Phase 4-5)
- **Component Recognition:** Grouping repeated designs into React/Vue components.
- **Live Preview:** Real-time editing where changing Figma updates the HTML code instantly.
- **Design Quality QA:** AI-driven analysis of accessibility and design system consistency.

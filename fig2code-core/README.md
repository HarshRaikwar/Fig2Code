# Fig2Code Core Engine

> A high-performance, modular Figma-to-Code engine designed for VS Code extensions.

## Goal
Build a scalable core engine that parses Figma JSON, extracts layout information (Auto Layout -> Flexbox, Absolute -> Positioned), and generates clean HTML/CSS.

## Project Structure
- `src/parser`: Handles Figma JSON parsing and indexing.
- `src/generator`: Core logic to convert Figma Nodes -> Intermediate Representation (IR) -> HTML/CSS.
- `src/utils`: Helper functions for style extraction, color conversion, etc.
- `src/types`: TypeScript interfaces for Figma and IR.
- `src/ai`: Documentation on AI integration strategy.

## Usage

### Prerequisites
- Node.js (v18+)
- npm

### Setup
```bash
npm install
```

### Running the Engine
```bash
# Using npm script:
npm start <path-to-figma-json> <output-directory>

# Example:
npm start ../fig2code-tools/frame.raw.json ./output
```

### Building for Production
```bash
npm run build
```

## Features (Phase 3)
- [x] Recursive Figma JSON Parser
- [x] Layout Extraction (Auto Layout & Absolute Position Support)
- [x] Semantic HTML Generation (`div`, `p`, `img`)
- [x] CSS Generation (Typography, Colors, Borders, Flexbox)
- [x] CLI Interface
- [x] Modular Architecture

## AI Integration
See `src/ai/AI_INTEGRATION.md` for details on how AI will be used for semantic naming, layout refinement, and component recognition.

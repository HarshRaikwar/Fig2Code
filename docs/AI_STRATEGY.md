# AI Integration Strategy for Fig2Code

## Overview
Fig2Code is designed with a modular architecture to seamlessly integrate AI capabilities for enhanced code generation. The core engine (Parser -> IR -> Generator) allows for AI intervention at multiple stages.

## Integration Points

### 1. Semantic Naming (Post-Parsing / Pre-Generation)
**Current State:**
- Nodes are named using Figma IDs (e.g., `.node-1:23`) or raw layer names (e.g., `Frame 4`).
- CSS classes are non-semantic.

**AI Strategy:**
- **Input:** JSON slice of a node (name, type, children text content).
- **Process:** Pass the node context to an LLM (e.g., Gemini/GPT).
- **Prompt:** "Given a UI frame named 'Group 83' containing text '01 435 0890', suggest a semantic class name."
- **Output:** `phone-number-container`.
- **Implementation:**
    - Hook into `FigmaToIRConverter.convert`.
    - Before assigning `irNode.classes`, call an AI service.
    - Fallback to ID-based naming if AI fails or for performance.

### 2. Intelligent Layout Reconstruction (Layout Extraction Phase)
**Current State:**
- Relies on Figma's `layoutMode` (Auto Layout) for Flexbox.
- Fallback to `position: absolute` for non-Auto-Layout frames.

**AI Strategy:**
- **Input:** List of sibling nodes with Absolute Bounding Boxes.
- **Process:**
    - A Vision-Language Model (VLM) or geometric heuristic algorithm analyzes spatial relationships.
    - Detects alignments (rows, columns, grids) that aren't explicitly defined in Figma.
- **Output:** structured `Flex` or `Grid` layouts.
- **Action:**
    - Transform `absolute` positioned children into a nested Flexbox structure in the Intermediate Representation (IR).

### 3. Component Recognition
**Current State:**
- Every node is treated as a unique DOM element.

**AI Strategy:**
- **Input:** The entire node tree or visual screenshots of rendered components.
- **Process:**
    - Identify repetitive patterns (cards, buttons, headers).
- **Output:** Suggest React/Vue component abstractions.
- **implementation:**
    - A post-processing step on the IR before HTML generation.
    - Group similar subtrees and output a single shared component definition.

### 4. Visual Quality Assurance (Post-Generation)
**Current State:**
- No visual verification.

**AI Strategy:**
- **Input:** Screenshot of original Figma interpretation vs. Screenshot of rendered HTML.
- **Process:**
    - VLM compares pixel differences.
- **Output:** Report on visual discrepancies (e.g., "Padding on button is 5px less than design").

## Architecture for AI
- **`src/ai/`**: Dedicated module for AI interactions.
- **`AIAdapter` Interface**: Generic interface for different LLM providers.
- **Pipeline Hooks**: The Generator pipeline supports middleware hooks where AI transformations can be injected non-destructively.

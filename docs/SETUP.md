# 🛠️ Fig2Code AI - Portability & Setup Guide

To run this project on another system (e.g., for a presentation or another developer's machine), follow these steps.

## 1. Prerequisites
Ensure the target system has the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Visual Studio Code](https://code.visualstudio.com/)
*   [Git](https://git-scm.com/) (if cloning from a repo)

## 2. Setting Up the Core Engine
The core engine handles the Figma parsing logic.
```bash
cd fig2code-core
npm install
```

## 3. Setting Up the VS Code Extension
This handles the UI sidebar you see in VS Code.
```bash
cd vscode-extension
npm install
npm run compile
```

## 4. Running the Extension
1.  Open the **entire root folder** (`Fig2Code VS Code Extension`) in VS Code.
2.  Go to the **Run and Debug** view (Ctrl+Shift+D).
3.  Ensure **"Run Extension"** is selected in the dropdown.
4.  Press **F5**.
5.  A new window will open with the extension loaded in the sidebar!

## 5. Configure AI (Optional but Recommended)
For the "AI Refinement" features to work:
1.  Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
2.  Create a `.env` file in the `fig2code-core/` directory:
    ```env
    GOOGLE_API_KEY=your_actual_key_here
    ```

## 6. How to Package (To show it without source code)
If you want to create a `.vsix` file to install it directly:
```bash
cd vscode-extension
npx vsce package
```
*Note: This will generate a `fig2code-1.0.0.vsix` file which can be dragged and dropped into any VS Code window to install it.*

---

### **Troubleshooting**
*   **Module not found:** Ensure you ran `npm install` in **both** the `fig2code-core` and `vscode-extension` folders.
*   **Sidebar not showing:** Verify `npm run compile` finished without errors in the `vscode-extension` folder before pressing F5.

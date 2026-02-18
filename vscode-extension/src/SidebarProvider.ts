import * as vscode from 'vscode';
import { FigmaClient } from './FigmaClient';
import { Generator } from './Generator';
import { AIService } from './AIService';
import { Scaffolder } from './Scaffolder';
import { CONFIG } from './Constants';
import { Logger } from './Logger';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'fig2code.sidebar';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this._updateWebview();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'onGenerate': {
          const config = vscode.workspace.getConfiguration('fig2code');
          const token = config.get('figmaToken') as string;

          if (!token) {
            vscode.window.showErrorMessage("Figma Token is missing. Please link your account in the setup screen.");
            this._view?.webview.postMessage({ type: 'generationFinished' });
            return;
          }

          try {
            Logger.log(`Starting generation for URL: ${data.url}`);
            const { fileKey, nodeId } = FigmaClient.parseUrl(data.url);
            const client = new FigmaClient(token);
            const generator = new Generator();

            Logger.log(`Fetching node ${nodeId || 'root'} from file ${fileKey}...`);

            let figmaNode;
            if (nodeId) {
              figmaNode = await client.getNode(fileKey, nodeId);
            } else {
              const fileData = await client.getFile(fileKey);
              figmaNode = fileData.document.children[0]; 
            }

            if (!figmaNode) {
              throw new Error("Could not find a valid design node to convert.");
            }

            Logger.log(`Converting node "${figmaNode.name}" to IR...`);
            const ir = generator.convertToIR(figmaNode);
            const htmlFragment = generator.generateHTML(ir);
            const css = generator.generateCSS(ir);

            let projectFiles: Record<string, string> = {
              'index.html': `<!DOCTYPE html><html><head><link rel="stylesheet" href="assets/css/style.css"></head><body>${htmlFragment}</body></html>`,
              'assets/css/style.css': css
            };

            const userAiKey = config.get('aiApiKey') as string;
            const activeAiKey = userAiKey || CONFIG.DEFAULT_AI_KEY;

            if (activeAiKey && activeAiKey !== "AIzaSy...") { 
              Logger.log(`Sending to Gemini AI for refinement (Model: gemini-1.5-flash)...`);
              try {
                const aiService = new AIService(activeAiKey);
                projectFiles = await aiService.refineCode(ir, htmlFragment, data.framework);
                Logger.log(`AI Refinement successful! Generated ${Object.keys(projectFiles).length} files.`);
              } catch (e) {
                Logger.error(`AI Refinement failed, falling back to raw:`, e);
                vscode.window.showWarningMessage("AI Refinement failed, using raw conversion.");
              }
            }

            this._view?.webview.postMessage({ 
              type: 'generationFinished', 
              code: { 
                files: projectFiles,
                nodeName: figmaNode.name,
                framework: data.framework
              } 
            });
            
          } catch (error: any) {
            Logger.error(`Generation failed:`, error);
            vscode.window.showErrorMessage(`Generation failed: ${error.message}`);
            this._view?.webview.postMessage({ type: 'error', message: error.message });
          }
          break;
        }
        case 'onApplyCode': {
          const { code } = data;
          try {
            let projectRoot: vscode.Uri | undefined;
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (workspaceFolders && workspaceFolders.length > 0) {
              projectRoot = workspaceFolders[0].uri;
            } else {
              const selectedFolder = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Folder to Save Project'
              });

              if (selectedFolder && selectedFolder.length > 0) {
                projectRoot = selectedFolder[0];
              }
            }

            if (!projectRoot) {
              throw new Error("No destination folder selected.");
            }

            const projectFolderName = `fig2code-${code.framework}-${new Date().getTime()}`;
            const projectFolderUri = vscode.Uri.joinPath(projectRoot, projectFolderName);

            await vscode.workspace.fs.createDirectory(projectFolderUri);

            Logger.log(`Applying project "${code.nodeName}" to folder: ${projectFolderUri.fsPath}`);

            if (code.framework === 'react') {
              await Scaffolder.createReactTailwind(projectFolderUri, code.files, code.nodeName);
            } else {
              await Scaffolder.createHtmlCss(projectFolderUri, code.files, code.nodeName);
            }

            Logger.log(`Project scaffolding complete.`);
            vscode.window.showInformationMessage(`Project created: ${projectFolderName}`);
            
            if (!workspaceFolders) {
               vscode.workspace.updateWorkspaceFolders(0, 0, { uri: projectFolderUri, name: projectFolderName });
            }

            let mainFile = code.framework === 'react' ? 'src/App.tsx' : 'index.html';
            const possibleFiles = Object.keys(code.files);
            if (!possibleFiles.includes(mainFile)) {
                mainFile = possibleFiles.find(f => f.endsWith('.tsx') || f.endsWith('.html')) || possibleFiles[0];
            }

            const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(projectFolderUri, mainFile));
            await vscode.window.showTextDocument(doc);

          } catch (error: any) {
            vscode.window.showErrorMessage(`Apply failed: ${error.message}`);
          }
          break;
        }
        case 'onSaveToken': {
          const config = vscode.workspace.getConfiguration('fig2code');
          if (data.token) await config.update('figmaToken', data.token, true);
          if (data.aiKey) await config.update('aiApiKey', data.aiKey, true);
          await this._view?.webview.postMessage({ type: 'tokenSaved' });
          break;
        }
        case 'getInitialState': {
          const config = vscode.workspace.getConfiguration('fig2code');
          this._view?.webview.postMessage({ 
            type: 'state', 
            hasToken: !!config.get('figmaToken'),
            hasAiKey: !!config.get('aiApiKey')
          });
          break;
        }
      }
    });
  }

  private _updateWebview() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
				<style>
					:root {
						--bg-dark: #0f172a;
						--card-bg: rgba(30, 41, 59, 0.7);
						--accent-primary: #6366f1;
						--accent-secondary: #a855f7;
						--text-main: #f8fafc;
						--text-dim: #94a3b8;
						--glass-border: rgba(255, 255, 255, 0.1);
						--gradient-main: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
					}

					* { box-sizing: border-box; margin: 0; padding: 0; }

					body {
						font-family: 'Inter', sans-serif;
						background-color: transparent;
						color: var(--text-main);
						height: 100vh;
						display: flex;
						flex-direction: column;
						overflow: hidden;
					}

					.app-container { flex: 1; display: flex; flex-direction: column; position: relative; height: 100%; }

					.main-content {
						flex: 1;
						overflow-y: auto;
						padding: 20px;
						padding-bottom: 120px;
						scrollbar-width: thin;
						scrollbar-color: var(--accent-primary) transparent;
					}

					.screen { display: none; animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
					.screen.active { display: block; }

					@keyframes slideUp {
						from { opacity: 0; transform: translateY(20px); }
						to { opacity: 1; transform: translateY(0); }
					}

					h1 { 
						font-family: 'Outfit', sans-serif; 
						font-size: 2.2rem; 
						line-height: 1.1;
						margin-bottom: 12px;
						background: var(--gradient-main);
						-webkit-background-clip: text;
						-webkit-text-fill-color: transparent;
					}

					.welcome-text { font-size: 1.1rem; color: var(--text-dim); margin-bottom: 30px; }

					.glass-card {
						background: var(--card-bg);
						backdrop-filter: blur(12px);
						border: 1px solid var(--glass-border);
						border-radius: 16px;
						padding: 20px;
						margin-bottom: 20px;
					}

					/* --- Review Layout --- */
					.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
					.review-layout { display: flex; gap: 12px; height: 400px; }
					.file-list { width: 100px; display: flex; flex-direction: column; gap: 5px; overflow-y: auto; }
					.file-item {
						font-size: 0.6rem;
						padding: 6px;
						background: rgba(255,255,255,0.05);
						border-radius: 4px;
						cursor: pointer;
						color: var(--text-dim);
						white-space: nowrap;
						overflow: hidden;
						text-overflow: ellipsis;
					}
					.file-item.active { background: var(--accent-primary); color: white; }

					.code-preview {
						flex: 1;
						background: #011627;
						color: #d6deeb;
						padding: 12px;
						border-radius: 8px;
						font-family: 'Fira Code', monospace;
						font-size: 0.7rem;
						white-space: pre-wrap;
						overflow-y: auto;
					}

					.bottom-panel {
						position: absolute; bottom: 0; left: 0; right: 0;
						background: rgba(15, 23, 42, 0.95);
						border-top: 1px solid var(--glass-border);
						padding: 16px;
						z-index: 100;
					}

					.input-wrapper {
						background: rgba(255,255,255,0.05);
						border: 1px solid var(--glass-border);
						border-radius: 10px;
						display: flex;
						padding: 2px;
						margin-bottom: 10px;
					}

					input { background: transparent; border: none; color: white; padding: 10px; flex: 1; outline: none; }

					.send-btn {
						background: var(--gradient-main);
						border: none; color: white; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;
					}

					.btn-sm { padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; cursor: pointer; border: none; }
					.btn-apply { background: var(--accent-primary); color: white; }
					.btn-discard { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

                    .loader-overlay {
						position: absolute; inset: 0; background: rgba(15, 23, 42, 0.8);
						display: none; flex-direction: column; align-items: center; justify-content: center; z-index: 1000;
					}
					.spinner { width: 40px; height: 40px; border: 3px solid rgba(99, 102, 241, 0.1); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
					@keyframes spin { to { transform: rotate(360deg); } }
				</style>
			</head>
			<body>
				<div class="app-container">
					<div class="main-content">
						<div id="homeScreen" class="screen active">
							<h1>Fig2Code AI</h1>
							<p class="welcome-text">Industry standard Figma-to-Code conversion.</p>
							<div class="glass-card">
								<ul style="list-style: none; font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px;">
									<li>✨ AI-powered semantics</li>
									<li>🏗️ Multi-file scaffolding</li>
									<li>🚀 Ready for production</li>
								</ul>
							</div>
						</div>

						<div id="reviewScreen" class="screen">
							<div class="review-header">
								<div style="font-weight: 700;">Project Preview</div>
								<div style="display: flex; gap: 8px;">
									<button class="btn-sm btn-discard" onclick="discardCode()">Discard</button>
									<button class="btn-sm btn-apply" onclick="applyCode()">Apply Project</button>
								</div>
							</div>
							<div class="review-layout">
								<div class="file-list" id="fileList"></div>
								<div class="code-preview" id="codeDisplay"></div>
							</div>
						</div>

						<div id="setupScreen" class="screen">
							<h1>Settings</h1>
							<div class="glass-card">
								<label style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 700; display: block; margin-bottom: 5px;">FIGMA TOKEN (REQ)</label>
								<div class="input-wrapper"><input type="password" id="figmaTokenInput" /></div>
								<label style="font-size: 0.7rem; color: var(--text-dim); display: block; margin-top: 15px;">CUSTOM AI KEY (OPTIONAL)</label>
								<div class="input-wrapper"><input type="password" id="aiKeyInput" /></div>
								<button class="send-btn" style="width: 100%; margin-top: 10px;" id="saveSetupBtn">Save</button>
								<button class="btn-sm" style="width: 100%; margin-top: 10px; background: transparent; color: var(--text-dim);" onclick="showScreen('home')">Back</button>
							</div>
						</div>
					</div>

					<div id="loader" class="loader-overlay"><div class="spinner"></div></div>

					<div class="bottom-panel">
						<div class="input-wrapper">
							<input type="text" id="figmaUrl" placeholder="Figma URL..." />
							<button class="send-btn" id="generateBtn">Send</button>
						</div>
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<select id="frameworkSelect" style="background: rgba(255,255,255,0.05); color: var(--text-dim); border: none; border-radius: 4px; padding: 4px;">
								<option value="html" selected>CSS & HTML (Standard)</option>
								<option value="react">React & Tailwind (Beta)</option>
							</select>
							<button id="settingsBtn" style="background: none; border: none; color: var(--text-dim); cursor: pointer;">⚙️</button>
						</div>
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					let lastGeneratedCode = null;

					const homeScreen = document.getElementById('homeScreen');
					const reviewScreen = document.getElementById('reviewScreen');
					const setupScreen = document.getElementById('setupScreen');
					const loader = document.getElementById('loader');
					const codeDisplay = document.getElementById('codeDisplay');
					const fileList = document.getElementById('fileList');

					function showScreen(id) {
						[homeScreen, reviewScreen, setupScreen].forEach(s => s.classList.remove('active'));
						document.getElementById(id + 'Screen').classList.add('active');
					}

					window.addEventListener('message', event => {
						const msg = event.data;
						if (msg.type === 'generationFinished') {
							loader.style.display = 'none';
							if (msg.code) {
								lastGeneratedCode = msg.code;
								renderFiles();
								showScreen('review');
							}
						} else if (msg.type === 'tokenSaved') {
							alert('Settings saved!');
							showScreen('home');
						} else if (msg.type === 'error') {
							loader.style.display = 'none';
							alert(msg.message);
						}
					});

					function renderFiles() {
						fileList.innerHTML = '';
						const keys = Object.keys(lastGeneratedCode.files);
						keys.forEach((path, i) => {
							const div = document.createElement('div');
							div.className = 'file-item' + (i === 0 ? ' active' : '');
							div.textContent = path.split('/').pop();
							div.onclick = () => {
								document.querySelectorAll('.file-item').forEach(e => e.classList.remove('active'));
								div.classList.add('active');
								codeDisplay.textContent = lastGeneratedCode.files[path];
							};
							fileList.appendChild(div);
							if (i === 0) codeDisplay.textContent = lastGeneratedCode.files[path];
						});
					}

					document.getElementById('generateBtn').onclick = () => {
						const url = document.getElementById('figmaUrl').value;
						const framework = document.getElementById('frameworkSelect').value;
						if (url) {
							loader.style.display = 'flex';
							vscode.postMessage({ type: 'onGenerate', url, framework });
						}
					};

					document.getElementById('settingsBtn').onclick = () => showScreen('setup');
					document.getElementById('saveSetupBtn').onclick = () => {
						vscode.postMessage({ 
							type: 'onSaveToken', 
							token: document.getElementById('figmaTokenInput').value,
							aiKey: document.getElementById('aiKeyInput').value 
						});
					};

					function applyCode() { vscode.postMessage({ type: 'onApplyCode', code: lastGeneratedCode }); }
					function discardCode() { showScreen('home'); }
				</script>
			</body>
			</html>`;
  }
}

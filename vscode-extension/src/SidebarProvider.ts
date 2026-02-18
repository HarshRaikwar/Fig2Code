import * as vscode from 'vscode';
import { FigmaClient } from './FigmaClient';
import { Generator } from './Generator';


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
            const { fileKey, nodeId } = FigmaClient.parseUrl(data.url);
            const client = new FigmaClient(token);
            const generator = new Generator();

            vscode.window.showInformationMessage(`Fetching design from Figma...`);

            let figmaNode;
            if (nodeId) {
              figmaNode = await client.getNode(fileKey, nodeId);
            } else {
              const fileData = await client.getFile(fileKey);
              // Find the first frame or page
              figmaNode = fileData.document.children[0]; 
            }

            if (!figmaNode) {
              throw new Error("Could not find a valid design node to convert.");
            }

            const ir = generator.convertToIR(figmaNode);
            const htmlFragment = generator.generateHTML(ir);
            const css = generator.generateCSS(ir);

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
              throw new Error("Please open a workspace folder first to save the generated project.");
            }

            const projectRoot = workspaceFolders[0].uri;
            const timestamp = new Date().getTime();
            const projectFolderName = `fig2code-export-${timestamp}`;
            const projectFolderUri = vscode.Uri.joinPath(projectRoot, projectFolderName);

            // Create project directory
            await vscode.workspace.fs.createDirectory(projectFolderUri);

            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${figmaNode.name || 'Generated Design'}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
${htmlFragment}
</body>
</html>`;

            const htmlUri = vscode.Uri.joinPath(projectFolderUri, 'index.html');
            const cssUri = vscode.Uri.joinPath(projectFolderUri, 'style.css');

            await vscode.workspace.fs.writeFile(htmlUri, Buffer.from(htmlContent, 'utf8'));
            await vscode.workspace.fs.writeFile(cssUri, Buffer.from(css, 'utf8'));

            const doc = await vscode.workspace.openTextDocument(htmlUri);
            await vscode.window.showTextDocument(doc);
            
            vscode.window.showInformationMessage(`Successfully generated project in folder: ${projectFolderName}`);
          } catch (error: any) {
            vscode.window.showErrorMessage(`Generation failed: ${error.message}`);
          } finally {
            this._view?.webview.postMessage({ type: 'generationFinished' });
          }
          break;
        }
        case 'onSaveToken': {
          await vscode.workspace.getConfiguration('fig2code').update('figmaToken', data.token, true);
          await this._view?.webview.postMessage({ type: 'tokenSaved' });
          vscode.window.showInformationMessage("Figma Token linked successfully!");
          break;
        }
        case 'getInitialState': {
          const config = vscode.workspace.getConfiguration('fig2code');
          const token = config.get('figmaToken');
          this._view?.webview.postMessage({ 
            type: 'state', 
            hasToken: !!token 
          });
          break;
        }
        case 'onLogout': {
          await vscode.workspace.getConfiguration('fig2code').update('figmaToken', '', true);
          this._view?.webview.postMessage({ type: 'state', hasToken: false });
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
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
				<style>
					:root {
						--primary-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
						--card-bg: rgba(30, 30, 45, 0.7);
						--glass-border: rgba(255, 255, 255, 0.1);
						--accent-color: #a855f7;
					}
					body { 
						font-family: 'Inter', sans-serif; 
						padding: 16px; 
						color: #e2e8f0;
						background-color: transparent;
						overflow-x: hidden;
					}
					.screen { display: none; animation: fadeIn 0.4s ease-out; }
					.screen.active { display: flex; flex-direction: column; }
					
					@keyframes fadeIn {
						from { opacity: 0; transform: translateY(10px); }
						to { opacity: 1; transform: translateY(0); }
					}

					h1 { font-family: 'Outfit', sans-serif; font-size: 1.8rem; margin-bottom: 8px; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
					p { font-size: 0.9rem; opacity: 0.8; line-height: 1.5; margin-bottom: 20px; }

					.card { 
						background: var(--card-bg); 
						backdrop-filter: blur(10px);
						border: 1px solid var(--glass-border); 
						padding: 20px; 
						border-radius: 12px;
						box-shadow: 0 8px 32px rgba(0,0,0,0.2);
						margin-bottom: 16px;
					}

					.input-group { margin-bottom: 16px; }
					label { display: block; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; color: var(--accent-color); letter-spacing: 0.05em; }
					
					input, select { 
						width: 100%; 
						padding: 10px 12px; 
						background: rgba(255,255,255,0.05); 
						border: 1px solid var(--glass-border); 
						color: #fff; 
						border-radius: 6px; 
						font-size: 0.9rem;
						transition: all 0.2s;
					}
					input:focus { border-color: var(--accent-color); outline: none; background: rgba(255,255,255,0.1); }

					button { 
						cursor: pointer; 
						padding: 12px; 
						background: var(--primary-gradient); 
						color: #fff; 
						border: none; 
						border-radius: 8px; 
						width: 100%; 
						font-weight: 600; 
						font-size: 0.95rem;
						transition: transform 0.2s, box-shadow 0.2s;
						display: flex; align-items: center; justify-content: center; gap: 8px;
					}
					button:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
					button:active { transform: translateY(0); }
					
					.btn-secondary { background: rgba(255,255,255,0.1); color: #fff; margin-top: 8px; }
					.btn-secondary:hover { background: rgba(255,255,255,0.15); }

					.feature-list { list-style: none; padding: 0; margin-bottom: 24px; }
					.feature-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.85rem; }
					.check { color: #10b981; font-weight: bold; }

					.loader {
						border: 2px solid rgba(255,255,255,0.1);
						border-top: 2px solid #fff;
						border-radius: 50%; width: 16px; height: 16px; animation: spin 1s linear infinite;
						display: none;
					}
					@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
				</style>
			</head>
			<body>
				<!-- WELCOME SCREEN -->
				<div id="welcomeScreen" class="screen">
					<h1>Fig2Code AI</h1>
					<p>Transform your high-fidelity Figma designs into clean, production-ready code in seconds.</p>
					
					<ul class="feature-list">
						<li class="feature-item"><span class="check">✓</span> Semantic HTML5 & CSS</li>
						<li class="feature-item"><span class="check">✓</span> Modern Framework Support</li>
						<li class="feature-item"><span class="check">✓</span> AI-Powered Layout Refinement</li>
					</ul>

					<button id="startSetup">Get Started</button>
				</div>

				<!-- TOKEN SCREEN -->
				<div id="tokenScreen" class="screen">
					<h1>Link Figma</h1>
					<p>To access your designs, we need a Personal Access Token.</p>
					
					<div class="card">
						<div class="input-group">
							<label>Personal Access Token</label>
							<input type="password" id="figmaToken" placeholder="figp_xxxxxxxxxxxxxxx">
							<p style="font-size: 0.7rem; margin-top: 8px; opacity: 0.6;">You can generate this in Figma > Settings > Personal Access Tokens.</p>
						</div>
						<button id="saveTokenBtn">Link Account</button>
						<button id="backToWelcome" class="btn-secondary">Go Back</button>
					</div>
				</div>

				<!-- GENERATOR SCREEN -->
				<div id="generatorScreen" class="screen">
					<h1>Generator</h1>
					<p>Paste your design link and choose your destination framework.</p>

					<div class="card">
						<div class="input-group">
							<label>Figma Design URL</label>
							<input type="text" id="figmaUrl" placeholder="https://www.figma.com/file/...">
						</div>

						<div class="input-group">
							<label>Framework / Template</label>
							<select id="frameworkSelect">
								<option value="html">Semantic HTML5 + CSS</option>
								<option value="react">React + Tailwind</option>
								<option value="nextjs">Next.js + CSS Modules</option>
								<option value="laravel">Laravel Blade Templates</option>
							</select>
						</div>

						<button id="generateBtn">
							<span class="loader" id="mainLoader"></span>
							<span id="btnText">Convert to Code</span>
						</button>
					</div>

					<button id="logoutBtn" class="btn-secondary" style="font-size: 0.7rem; padding: 6px;">Unlink Figma Account</button>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					
					// DOM Elements
					const screens = {
						welcome: document.getElementById('welcomeScreen'),
						token: document.getElementById('tokenScreen'),
						generator: document.getElementById('generatorScreen')
					};

					function showScreen(screenId) {
						Object.values(screens).forEach(s => s.classList.remove('active'));
						screens[screenId].classList.add('active');
					}

					// Initial State Request
					vscode.postMessage({ type: 'getInitialState' });

					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.type) {
							case 'state':
								if (message.hasToken) {
									showScreen('generator');
								} else {
									showScreen('welcome');
								}
								break;
							case 'tokenSaved':
								showScreen('generator');
								break;
							case 'generationFinished':
								document.getElementById('mainLoader').style.display = 'none';
								document.getElementById('btnText').innerText = 'Convert to Code';
								break;
						}
					});

					// Button Listeners
					document.getElementById('startSetup').onclick = () => showScreen('token');
					document.getElementById('backToWelcome').onclick = () => showScreen('welcome');
					
					document.getElementById('saveTokenBtn').onclick = () => {
						const token = document.getElementById('figmaToken').value;
						if (token) {
							vscode.postMessage({ type: 'onSaveToken', token });
						}
					};

					document.getElementById('generateBtn').onclick = () => {
						const url = document.getElementById('figmaUrl').value;
						const framework = document.getElementById('frameworkSelect').value;
						if (url) {
							document.getElementById('mainLoader').style.display = 'inline-block';
							document.getElementById('btnText').innerText = 'Processing...';
							vscode.postMessage({ type: 'onGenerate', url, framework });
						}
					};

					document.getElementById('logoutBtn').onclick = () => {
						vscode.postMessage({ type: 'onLogout' });
					};
				</script>
			</body>
			</html>`;
  }
}

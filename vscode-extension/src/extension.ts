import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { Logger } from './Logger';

export function activate(context: vscode.ExtensionContext) {
	Logger.init();
	Logger.log('Fig2Code AI is now active');

	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SidebarProvider.viewType,
			sidebarProvider
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('fig2code.generate', () => {
			vscode.window.showInformationMessage('Opening Fig2Code Generator...');
		})
	);
}

export function deactivate() {}

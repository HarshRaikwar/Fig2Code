import * as vscode from 'vscode';

export class Logger {
    private static channel: vscode.OutputChannel;

    public static init() {
        this.channel = vscode.window.createOutputChannel("Fig2Code AI");
    }

    public static log(message: string) {
        if (!this.channel) this.init();
        const timestamp = new Date().toLocaleTimeString();
        const formatted = `[${timestamp}] INFO: ${message}`;
        this.channel.appendLine(formatted);
        console.log(formatted); // Also print to system terminal/debug console
    }

    public static error(message: string, error?: any) {
        if (!this.channel) this.init();
        const timestamp = new Date().toLocaleTimeString();
        const formatted = `[${timestamp}] ERROR: ${message}`;
        this.channel.appendLine(formatted);
        console.error(formatted, error); // Also print to system terminal/debug console
        
        if (error) {
            this.channel.appendLine(`Details: ${error.stack || error.message || JSON.stringify(error)}`);
        }
        this.channel.show(); // Auto-show on error
    }
}

import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
	console.log('Retro is now active')

	// check if enabled
	const config = vscode.workspace.getConfiguration('retroAI')
	if (!config.get('enabled')) {
		return
	}

	const analyzeCommand = vscode.commands.registerCommand('retroAI.analyzeCurrentFunction', () => {
		vscode.window.showInformationMessage('Analyzing current function...')
		// TODO: implement analysis
	})

	const clearCommand = vscode.commands.registerCommand('retroAI.clearSuggestions', () => {
		vscode.window.showInformationMessage('Suggestions cleared')
	})

	const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId == 'typescript' || event.document.languageId == 'typescriptreact') {
			// TODO: deboubnce and detect completed scopes
			console.log('Document changed:', event.document.fileName)
		}
	})

	context.subscriptions.push(analyzeCommand, clearCommand, changeListener)
}

export function deactivate() {
	console.log('Retro deactivated')
}

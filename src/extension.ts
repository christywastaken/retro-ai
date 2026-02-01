import * as vscode from 'vscode'
import { TypescriptAnalyzer } from './analyzers/typescriptAnalyzer'
import { debounce } from './utils/debounce'

const tsAnalyzer = new TypescriptAnalyzer()

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

	const analyzeTsDocument = debounce(async (document: vscode.TextDocument) => {
		console.log('retro analyzing document:', document.fileName)
		const scopes = await tsAnalyzer.detectCompletedScopes(document)

		for (const scope of scopes) {
			console.log(`found ${scope.type}: ${scope.name}`)
		}
	}, 5000)

	const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId == 'typescript' || event.document.languageId == 'typescriptreact') {
			// TODO: debounce and detect completed scopes
			analyzeTsDocument(event.document)
		}
	})

	context.subscriptions.push(analyzeCommand, clearCommand, changeListener)
}

export function deactivate() {
	console.log('Retro deactivated')
}

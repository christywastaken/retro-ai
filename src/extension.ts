import * as vscode from 'vscode'
import { SuggestionStore } from './storage/suggestions'
import { GutterDecorationProvider, RetroHoverProvider } from './ui/gutterDecoration'
import { registerCommands } from './core/commandRegistry'
import { DocumentAnalyzerManager } from './core/documentAnalyzer'
import { registerTestCommands } from './test/uiTestHelpers'

export function activate(context: vscode.ExtensionContext) {
	console.log('Retro is now active')

	const config = vscode.workspace.getConfiguration('retroAI')
	if (!config.get('enabled')) {
		return
	}

	const store = SuggestionStore.getInstance()
	store.initialize(context) 
	const gutterProvider = new GutterDecorationProvider(store)
	const hoverProvider = new RetroHoverProvider(store)

	const updateDecorations = (): void => {
		const editor = vscode.window.activeTextEditor
		if (editor) {
			gutterProvider.update(editor)
		}
	}

	const analyzerManager = new DocumentAnalyzerManager(context, store, updateDecorations)

	registerCommands(context, store, updateDecorations)
	registerTestCommands(context, store, updateDecorations)

	const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		analyzerManager.handleDocumentChange(event)
	})

	const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
		updateDecorations()
	})

	const hoverRegistration = vscode.languages.registerHoverProvider(
		[{ language: 'typescript' }, { language: 'typescriptreact' }, { language: 'python' }],
		hoverProvider
	)

	context.subscriptions.push(changeListener, editorChangeListener, hoverRegistration, {
		dispose: () => gutterProvider.dispose()
	})
}

export function deactivate() {
	console.log('Retro deactivated')
}

import * as vscode from 'vscode'
import { TypescriptAnalyzer } from './analyzers/typescriptAnalyzer'
import { debounce } from './utils/debounce'
import { AnthropicProvider } from './ai/anthropic'
import { SuggestionStore } from './storage/suggestions'
import { GutterDecorationProvider } from './ui/gutterDecoration'
import { RetroHoverProvider } from './ui/hover'

export function activate(context: vscode.ExtensionContext) {
	console.log('Retro is now active')

	// check if enabled
	const config = vscode.workspace.getConfiguration('retroAI')
	if (!config.get('enabled')) {
		return
	}

	const store = SuggestionStore.getInstance()
	const tsAnalyzer = new TypescriptAnalyzer()
	const aiProvider = new AnthropicProvider(context)
	const hoverProvider = new RetroHoverProvider(store)
	const gutterProvider = new GutterDecorationProvider(store)

	// update decorations when editor changes
	function updateDecorations(): void {
		const editor = vscode.window.activeTextEditor
		if (editor) {
			gutterProvider.update(editor)
		}
	}

	// register hover 
	const hoverRegistration = vscode.languages.registerHoverProvider(
		[{ language: 'typescript' }, { language: 'typescriptreact' }],
		hoverProvider
	)

	// command for setting apiKey
	const setApiKeyCommand = vscode.commands.registerCommand('retroAI.setApiKey', async () => {
		const apiKey = await vscode.window.showInputBox({
			prompt: 'Enter your Anthropic API key',
			password: true,
			ignoreFocusOut: true
		})
		if (apiKey) {
			await context.secrets.store('retroAI.anthropicApiKey', apiKey)
			vscode.window.showInformationMessage('API key saved securely')
		}
	})

	// command for selecting model
	const selectModel = vscode.commands.registerCommand('retroAI.selectModel', async () => {
		// TODO: for now we can just pick from the Anthropic models
		const models = [
			{ label: 'Claude Haiku 4.5', description: 'Fast, good for code review', value: 'claude-haiku-4-5' },
			{ label: 'Claude Sonnet 4.5', description: 'Balanced speed and quality', value: 'claude-sonnet-4-5' },
			{ label: 'Claude Opus 4.5', description: 'Highest quality, slower', value: 'claude-opus-4-5' }
		]

		const selected = await vscode.window.showQuickPick(models, {
			placeHolder: 'Select model',
			title: 'Retro AI: Select Model'
		})

		if (selected) {
			const config = vscode.workspace.getConfiguration('retroAI')
			await config.update('model', selected.value, vscode.ConfigurationTarget.Global)
			vscode.window.showInformationMessage(`Model set to ${selected.label}`)
		}
	})

	// command to analyze current window
	// TODO: reconsider this
	const analyzeCommand = vscode.commands.registerCommand('retroAI.analyzeCurrentFunction', async () => {
		const editor = vscode.window.activeTextEditor
		if (editor) {
			vscode.window.showInformationMessage('Analyzing...')
			await analyzeTsDocument(editor.document)
		}
	})

	// command to clear all suggestions
	const clearCommand = vscode.commands.registerCommand('retroAI.clearSuggestions', () => {
		store.clearAll()
		updateDecorations()
		vscode.window.showInformationMessage('Suggestions cleared')
	})

	const showSuggestionsCommand = vscode.commands.registerCommand(
		'retroAI.showSuggestions',
		(args?: { documentUri: string; line: number }) => {
			// If called from command palette without args, use current editor
			if (!args) {
				const editor = vscode.window.activeTextEditor
				if (!editor) {
					vscode.window.showInformationMessage('No active editor')
					return
				}
				const documentUri = editor.document.uri.toString()
				const line = editor.selection.active.line
				const suggestions = store.getForLine(documentUri, line)
				console.log('Suggestions for current line:', suggestions)
				vscode.window.showInformationMessage(
					suggestions.length > 0 ? `${suggestions.length} suggestions - check Debug Console` : 'No suggestions for this line'
				)
				return
			}

			const suggestions = store.getForLine(args.documentUri, args.line)
			console.log('Suggestions for line:', suggestions)
			vscode.window.showInformationMessage(`${suggestions.length} suggestions - check Debug Console`)
		}
	)
	
	const analyzeTsDocument = debounce(async (document: vscode.TextDocument) => {
		console.log('retro analyzing document:', document.fileName)
		const scopes = await tsAnalyzer.detectCompletedScopes(document)
		const documentUri = document.uri.toString()

		// remove scopes that no longer exist (deleted/renamed functions)
		store.pruneStale(documentUri, scopes.map((s) => s.name))

		for (const scope of scopes) {
			const { exists, changed } = store.check(documentUri, scope)

			if (exists && !changed) {
				// if content has not changed, update the range just in case it has moved
				store.updateRange(documentUri, scope.name, scope.range)
				console.log(`Skipping ${scope.name} - unchanged, updated range`)
				continue
			}

			// analyze new scope if it has changed
			try {
				const context = tsAnalyzer.getContext(document, scope)
				const suggestions = await aiProvider.analyze(scope.content, context, 'typescript')
				store.set(documentUri, scope, suggestions)
				console.log(`Analyzed ${scope.name}: ${suggestions.length} suggestions`)
			} catch (error) {
				console.error('Analysis failed:', error)
			}
		}
		updateDecorations()
	}, 5000)

	const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId == 'typescript' || event.document.languageId == 'typescriptreact') {
			analyzeTsDocument(event.document)
		}
	})

	const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((event) => {
		updateDecorations()
	})

	context.subscriptions.push(
		analyzeCommand,
		clearCommand,
		changeListener,
		setApiKeyCommand,
		showSuggestionsCommand,
		editorChangeListener,
		hoverRegistration,
		selectModel,
		{
			dispose: () => gutterProvider.dispose()
		}
	)
}

export function deactivate() {
	console.log('Retro deactivated')
}
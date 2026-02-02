import * as vscode from 'vscode'
import { SuggestionStore } from '../storage/suggestions'
import { SuggestionsPanel } from '../ui/suggestionsPanel'

export function registerCommands(
	context: vscode.ExtensionContext,
	store: SuggestionStore,
	updateDecorations: () => void
): void {
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

	const selectModel = vscode.commands.registerCommand('retroAI.selectModel', async () => {
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

	const clearCommand = vscode.commands.registerCommand('retroAI.clearSuggestions', () => {
		store.clearAll()
		updateDecorations()
		vscode.window.showInformationMessage('Suggestions cleared')
	})

	const showSuggestionsCommand = vscode.commands.registerCommand(
		'retroAI.showSuggestions',
		(args?: { documentUri: string; line: number }) => {
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

	const showSuggestionsPanelCommand = vscode.commands.registerCommand(
		'retroAI.showSuggestionsPanel',
		(args: { documentUri: string; line: number }) => {
			const suggestions = store.getForLine(args.documentUri, args.line)
			SuggestionsPanel.show(suggestions, args.line)
		}
	)

	context.subscriptions.push(setApiKeyCommand, selectModel, clearCommand, showSuggestionsCommand, showSuggestionsPanelCommand)
}

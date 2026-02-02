import * as vscode from 'vscode'
import { SuggestionStore } from '../storage/suggestions'

export class RetroCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>()
	readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event

	constructor(private store: SuggestionStore) {}

	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		const suggestions = this.store.get(document.uri.toString())
		const lines = new Set<number>()

		for (const suggestion of suggestions) {
			lines.add(suggestion.range.start.line)
		}

		return Array.from(lines).map((line) => {
			const count = this.store.getForLine(document.uri.toString(), line).length
			const range = new vscode.Range(line, 0, line, 0)
			return new vscode.CodeLens(range, {
				title: `Retro AI: ${count} suggestion(s)`,
				command: 'retroAI.showSuggestionsPanel',
				arguments: [{ documentUri: document.uri.toString(), line }]
			})
		})
	}

	refresh(): void {
		this._onDidChangeCodeLenses.fire()
	}

	dispose(): void {
		this._onDidChangeCodeLenses.dispose()
	}
}

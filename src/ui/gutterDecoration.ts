import { SuggestionStore } from '../storage/suggestions'
import * as vscode from 'vscode'

export class GutterDecorationProvider {
	private decorationType: vscode.TextEditorDecorationType

	constructor(private store: SuggestionStore) {
		this.decorationType = vscode.window.createTextEditorDecorationType({
			overviewRulerColor: '#f59e0b',
			overviewRulerLane: vscode.OverviewRulerLane.Right,
			before: {
				contentText: '\u25CF',
				color: '#f59e0b',
				margin: '0 4px 0 0',
				width: '12px'
			}
		})
	}

	update(editor: vscode.TextEditor): void {
		const documentUri = editor.document.uri.toString()
		const suggestions = this.store.get(documentUri)

		if (suggestions.length === 0) {
			editor.setDecorations(this.decorationType, [])
			return
		}

		const lines = new Set<number>()
		for (const suggestion of suggestions) {
			lines.add(suggestion.range.start.line)
		}

		const decorations: vscode.DecorationOptions[] = Array.from(lines).map((line) => ({
			range: new vscode.Range(line, 0, line, 0),
			hoverMessage: this.buildHoverMessage(documentUri, line)
		}))

		editor.setDecorations(this.decorationType, decorations)
	}

	private buildHoverMessage(documentUri: string, line: number): vscode.MarkdownString {
		const suggestions = this.store.getForLine(documentUri, line)
		const md = new vscode.MarkdownString()
		md.isTrusted = true

		md.appendMarkdown(`****Retro: ${suggestions.length} suggestion(s)**\n\n`)

		for (const suggestion of suggestions) {
			md.appendMarkdown(`- **${suggestion.title}** _(${suggestion.type})_ \n`)
		}

		md.appendMarkdown(`\n[View Details](command:retroAI.showSuggestions?${encodeURIComponent(JSON.stringify({ documentUri, line }))})`)

		return md
	}

	clear(editor: vscode.TextEditor): void {
		editor.setDecorations(this.decorationType, [])
	}

	dispose(): void {
		this.decorationType.dispose()
	}
}

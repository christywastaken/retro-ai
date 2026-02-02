import { SuggestionStore } from '../storage/suggestions'
import * as vscode from 'vscode'

export class GutterDecorationProvider {
	private gutterDecorationType: vscode.TextEditorDecorationType
	private lineHighlightDecorationType: vscode.TextEditorDecorationType

	constructor(private store: SuggestionStore) {
		const svgCircle = `data:image/svg+xml,${encodeURIComponent(`
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
				<circle cx="8" cy="8" r="6" fill="#a855f7"/>
			</svg>
		`)}`

		this.gutterDecorationType = vscode.window.createTextEditorDecorationType({
			overviewRulerColor: '#a855f7',
			overviewRulerLane: vscode.OverviewRulerLane.Right,
			gutterIconPath: vscode.Uri.parse(svgCircle),
			gutterIconSize: 'contain'
		})

		this.lineHighlightDecorationType = vscode.window.createTextEditorDecorationType({
			backgroundColor: 'rgba(168, 85, 247, 0.1)',
			isWholeLine: true,
			borderWidth: '0 0 0 3px',
			borderStyle: 'solid',
			borderColor: '#a855f7'
		})
	}

	update(editor: vscode.TextEditor): void {
		const documentUri = editor.document.uri.toString()
		const suggestions = this.store.get(documentUri)

		if (suggestions.length === 0) {
			editor.setDecorations(this.gutterDecorationType, [])
			editor.setDecorations(this.lineHighlightDecorationType, [])
			return
		}

		const lines = new Set<number>()
		for (const suggestion of suggestions) {
			lines.add(suggestion.range.start.line)
		}

		const decorations: vscode.DecorationOptions[] = Array.from(lines).map((line) => ({
			range: new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER)
		}))

		editor.setDecorations(this.gutterDecorationType, decorations)
		editor.setDecorations(this.lineHighlightDecorationType, decorations)
	}

	getLinesWithSuggestions(documentUri: string): Set<number> {
		const suggestions = this.store.get(documentUri)
		const lines = new Set<number>()
		for (const suggestion of suggestions) {
			lines.add(suggestion.range.start.line)
		}
		return lines
	}

	clear(editor: vscode.TextEditor): void {
		editor.setDecorations(this.gutterDecorationType, [])
		editor.setDecorations(this.lineHighlightDecorationType, [])
	}

	dispose(): void {
		this.gutterDecorationType.dispose()
		this.lineHighlightDecorationType.dispose()
	}
}

export class RetroHoverProvider implements vscode.HoverProvider {
	constructor(private store: SuggestionStore) {}

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {
		const documentUri = document.uri.toString()
		
		// Only show hover on the first line of functions with suggestions
		const allSuggestions = this.store.get(documentUri)
		const suggestions = allSuggestions.filter((s) => s.range.start.line === position.line)

		if (suggestions.length === 0) {
			return null
		}

		const md = new vscode.MarkdownString()
		md.isTrusted = true
		md.supportHtml = true

		const commandUri = vscode.Uri.parse(
			`command:retroAI.showSuggestionsPanel?${encodeURIComponent(JSON.stringify({ documentUri, line: position.line }))}`
		)

		md.appendMarkdown(`**Retro AI: ${suggestions.length} suggestion(s)** [Open Panel](${commandUri})\n\n`)

		for (const suggestion of suggestions) {
			md.appendMarkdown(`### ${suggestion.title}\n`)
			md.appendMarkdown(`_${suggestion.type}_\n\n`)
			md.appendMarkdown(`${suggestion.description}\n\n`)

			if (suggestion.suggestedCode) {
				md.appendMarkdown(`**Suggested:**\n`)
				md.appendCodeblock(suggestion.suggestedCode, 'typescript')
			}

			md.appendMarkdown(`---\n`)
		}

		return new vscode.Hover(md)
	}
}

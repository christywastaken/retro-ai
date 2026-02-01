import { SuggestionStore } from '../storage/suggestions'
import * as vscode from 'vscode'

export class RetroHoverProvider implements vscode.HoverProvider {
	constructor(private store: SuggestionStore) {}

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		_token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {
    const suggestions = this.store.getForLine(document.uri.toString(), position.line)

    if (suggestions.length === 0) {
      return null
    }

    const md = new vscode.MarkdownString()
    md.isTrusted = true
    md.supportHtml = true

    md.appendMarkdown(`**Retro: ${suggestions.length} suggestion(s)**\n\n`)

    for (const suggestion of suggestions) {
      md.appendMarkdown(`### ${suggestion.title}\n`)
      md.appendMarkdown(`_${suggestion.type}_\n\n`)
      md.appendMarkdown(`${suggestion.description}\n\n`)

      if(suggestion.suggestedCode) {
        md.appendMarkdown(`**Suggested:**\n`)
        md.appendCodeblock(suggestion.suggestedCode, 'typescript')
      }

      md.appendMarkdown(`---\n`)
    }
    return new vscode.Hover(md)
  }
}

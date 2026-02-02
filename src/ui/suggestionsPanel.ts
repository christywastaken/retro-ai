import * as vscode from 'vscode'
import { Suggestion } from '../types'

export class SuggestionsPanel {
	private static currentPanel: SuggestionsPanel | undefined
	private readonly panel: vscode.WebviewPanel
	private disposables: vscode.Disposable[] = []

	private constructor(panel: vscode.WebviewPanel) {
		this.panel = panel

		this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
	}

	public static show(suggestions: Suggestion[], line: number): void {
		const column = vscode.ViewColumn.Beside

		if (SuggestionsPanel.currentPanel) {
			SuggestionsPanel.currentPanel.panel.reveal(column)
			SuggestionsPanel.currentPanel.update(suggestions, line)
			return
		}

		const panel = vscode.window.createWebviewPanel(
			'retroAISuggestions',
			'Retro AI Suggestions',
			column,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		)

		SuggestionsPanel.currentPanel = new SuggestionsPanel(panel)
		SuggestionsPanel.currentPanel.update(suggestions, line)
	}

	private update(suggestions: Suggestion[], line: number): void {
		this.panel.title = `Retro AI - Line ${line + 1}`
		this.panel.webview.html = this.getHtml(suggestions, line)
	}

	private getHtml(suggestions: Suggestion[], line: number): string {
		const suggestionsHtml = suggestions
			.map(
				(s) => `
			<div class="suggestion">
				<div class="header">
					<h2>${this.escapeHtml(s.title)}</h2>
					<span class="type">${this.escapeHtml(s.type)}</span>
				</div>
				<p class="description">${this.escapeHtml(s.description)}</p>
				${
					s.suggestedCode
						? `
					<div class="code-section">
						<h3>Suggested Code</h3>
						<pre><code class="language-typescript">${this.escapeHtml(s.suggestedCode)}</code></pre>
					</div>
				`
						: ''
				}
			</div>
		`
			)
			.join('')

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Retro AI Suggestions</title>
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/typescript.min.js"></script>
	<style>
		:root {
			--bg-color: #1e1e1e;
			--card-bg: #252526;
			--border-color: #3c3c3c;
			--text-color: #cccccc;
			--text-muted: #9d9d9d;
			--accent-color: #a855f7;
			--code-bg: #1e1e1e;
		}

		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background-color: var(--bg-color);
			color: var(--text-color);
			padding: 16px;
			margin: 0;
			line-height: 1.5;
		}

		.header-bar {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 16px;
			padding-bottom: 12px;
			border-bottom: 1px solid var(--border-color);
		}

		.header-bar h1 {
			margin: 0;
			font-size: 16px;
			font-weight: 600;
		}

		.badge {
			background-color: var(--accent-color);
			color: #000;
			padding: 2px 8px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 600;
		}

		.suggestion {
			background-color: var(--card-bg);
			border: 1px solid var(--border-color);
			border-radius: 8px;
			padding: 16px;
			margin-bottom: 12px;
		}

		.suggestion:hover {
			border-color: var(--accent-color);
		}

		.suggestion .header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 8px;
		}

		.suggestion h2 {
			margin: 0;
			font-size: 14px;
			font-weight: 600;
			color: var(--text-color);
		}

		.type {
			background-color: var(--accent-color);
			color: #000;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 11px;
			font-weight: 500;
			text-transform: uppercase;
		}

		.description {
			margin: 0 0 12px 0;
			color: var(--text-muted);
			font-size: 13px;
		}

		.code-section h3 {
			margin: 0 0 8px 0;
			font-size: 12px;
			font-weight: 600;
			color: var(--text-muted);
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		pre {
			background-color: var(--code-bg);
			border: 1px solid var(--border-color);
			border-radius: 6px;
			margin: 0;
			overflow-x: auto;
		}

		pre code {
			font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
			font-size: 13px;
			line-height: 1.5;
			display: block;
			padding: 12px;
		}

		/* Override highlight.js background */
		pre code.hljs {
			background: transparent;
			padding: 12px;
		}

		.empty {
			text-align: center;
			padding: 32px;
			color: var(--text-muted);
		}
	</style>
</head>
<body>
	<div class="header-bar">
		<h1>Retro AI Suggestions</h1>
		<span class="badge">Line ${line + 1}</span>
		<span class="badge">${suggestions.length} suggestion${suggestions.length !== 1 ? 's' : ''}</span>
	</div>
	${suggestions.length > 0 ? suggestionsHtml : '<div class="empty">No suggestions for this line</div>'}
	<script>hljs.highlightAll();</script>
</body>
</html>`
	}

	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;')
	}

	private dispose(): void {
		SuggestionsPanel.currentPanel = undefined
		this.panel.dispose()
		while (this.disposables.length) {
			const d = this.disposables.pop()
			if (d) {
				d.dispose()
			}
		}
	}
}

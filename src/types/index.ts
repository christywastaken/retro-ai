import * as vscode from 'vscode'

export interface CodeScope {
	type: 'function' | 'efficiency' | 'class' | 'block'
	name: string
	range: vscode.Range
	content: string
}

export interface Suggestion {
	id: string
	scopeName: string
	type: 'refactor' | 'efficiency' | 'idiom' | 'style'
	title: string
	description: string
	suggestedCode?: string
	range: vscode.Range
	createdAt: number
}

export interface ICodeAnalyzer {
	languageId: string
	detectCompletedScopes(document: vscode.TextDocument, changeEvent: vscode.TextDocumentChangeEvent): Promise<CodeScope[]>
	getContext(document: vscode.TextDocument, scope: CodeScope): string
}

export interface IAIProvider {
	name: string
	analyze(code: string, context: string, language: string): Promise<Suggestion[]>
}

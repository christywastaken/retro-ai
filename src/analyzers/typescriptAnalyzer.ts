import { ICodeAnalyzer, CodeScope } from '../types'
import * as vscode from 'vscode'

export class TypescriptAnalyzer implements ICodeAnalyzer {
	languageId = 'typescript'

	async detectCompletedScopes(document: vscode.TextDocument): Promise<CodeScope[]> {
		// get symbols from VSC built in ts support
		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', document.uri)
		console.log('retro symbols:', symbols)
		if (!symbols) return []

		const scopes: CodeScope[] = []
		this.collectScopes(symbols, document, scopes)
		return scopes
	}

	// get all of the scopes within the document
	// TODO: in the future, we may want to extend this beyond just the current document
	private collectScopes(symbols: vscode.DocumentSymbol[], document: vscode.TextDocument, scopes: CodeScope[]): void {
		for (const symbol of symbols) {
			const content = document.getText(symbol.range)
			if (
				symbol.kind === vscode.SymbolKind.Function ||
				symbol.kind === vscode.SymbolKind.Method ||
				symbol.kind === vscode.SymbolKind.Class
			) {
				scopes.push({
					type: this.symbolKindToScopeType(symbol.kind),
					name: symbol.name,
					range: symbol.range,
					content
				})
			} else if (symbol.kind === vscode.SymbolKind.Variable || symbol.kind === vscode.SymbolKind.Field) {
				// test for arrow functions
				if (this.isArrowFunction(content)) {
					scopes.push({
						type: 'function',
						name: symbol.name,
						range: symbol.range,
						content
					})
				}
			}
			if (symbol.children.length > 0) {
				// recursively check the children
				this.collectScopes(symbol.children, document, scopes)
			}
		}
	}

	private isArrowFunction(content: string): boolean {
		// we need to match patterns for arrow functions as they fall under fields/ variables in the vscode symbols.
		// const foo = () => {}
		// const foo = (x: string) => {}
		// const foo = async () => {}
		// const foo: SomeType = () => {}
		const arrowFunctionPattern = /=\s*(async\s*)?\([^)]*\)\s*(:\s*\w+)?\s*=>/
		return arrowFunctionPattern.test(content)
	}

	private symbolKindToScopeType(kind: vscode.SymbolKind): CodeScope['type'] {
		switch (kind) {
			case vscode.SymbolKind.Function:
				return 'function'
			case vscode.SymbolKind.Method:
				return 'method'
			case vscode.SymbolKind.Class:
				return 'class'
			default:
				return 'block'
		}
	}

	getContext(document: vscode.TextDocument, scope: CodeScope): string {
		// get some lines before the function for context (e.g. imports etc)
		// TODO: want to think about how far we want to extend context?
		// ... this is defo something that will need refining...
		const startLine = Math.max(0, scope.range.start.line - 10)
		const contextRange = new vscode.Range(startLine, 0, scope.range.start.line, 0)
		return document.getText(contextRange)
	}
}

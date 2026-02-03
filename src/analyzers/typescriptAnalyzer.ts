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
	// Only collects top-level declarations, not nested callbacks
	private collectScopes(
		symbols: vscode.DocumentSymbol[],
		document: vscode.TextDocument,
		scopes: CodeScope[],
		isTopLevel: boolean = true
	): void {
		for (const symbol of symbols) {
			const content = document.getText(symbol.range)

			if (symbol.kind === vscode.SymbolKind.Class) {
				// Classes: add the class and recurse to get methods
				scopes.push({
					type: 'class',
					name: symbol.name,
					range: symbol.range,
					content
				})
				// Recurse into class to get methods, but mark as not top-level
				if (symbol.children.length > 0) {
					this.collectScopes(symbol.children, document, scopes, false)
				}
			} else if (symbol.kind === vscode.SymbolKind.Method) {
				// Methods inside classes - always include
				scopes.push({
					type: 'method',
					name: symbol.name,
					range: symbol.range,
					content
				})
				// Don't recurse into method bodies
			} else if (symbol.kind === vscode.SymbolKind.Function) {
				// Named function declarations
				scopes.push({
					type: 'function',
					name: symbol.name,
					range: symbol.range,
					content
				})
				// Don't recurse into function bodies
			} else if (symbol.kind === vscode.SymbolKind.Variable || symbol.kind === vscode.SymbolKind.Field) {
				// Only check top-level variables for arrow function declarations
				if (isTopLevel && this.isArrowFunctionDeclaration(content, symbol.name)) {
					scopes.push({
						type: 'function',
						name: symbol.name,
						range: symbol.range,
						content
					})
				}
				// Don't recurse into variable assignments
			} else if (isTopLevel && symbol.children.length > 0) {
				// For other top-level symbols (namespaces, modules), recurse
				this.collectScopes(symbol.children, document, scopes, true)
			}
		}
	}

	private isArrowFunctionDeclaration(content: string, symbolName: string): boolean {
		// Check if this is an arrow function assignment
		// The content might start with the variable name (VSCode symbol range)
		// or with const/let/var/export (full line)
		const escapedName = symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		
		// Pattern 1: Content starts with const/let/var (full declaration)
		const fullDeclPattern = new RegExp(
			`^(export\\s+)?(const|let|var)\\s+${escapedName}\\s*(:\\s*[^=]+)?\\s*=\\s*(async\\s*)?\\(`,
			'm'
		)
		
		// Pattern 2: Content starts with the symbol name (VSCode trimmed range)
		const trimmedPattern = new RegExp(
			`^${escapedName}\\s*(:\\s*[^=]+)?\\s*=\\s*(async\\s*)?\\([^)]*\\)\\s*(:\\s*[^=]+)?\\s*=>`,
			'm'
		)
		
		// Pattern 3: Simple check - contains arrow after assignment
		const simpleArrowPattern = /=\s*(async\s*)?\([^)]*\)\s*(:\s*[^=]+)?\s*=>/
		
		const isArrow = fullDeclPattern.test(content) || trimmedPattern.test(content) || simpleArrowPattern.test(content)
		
		// Debug logging
		if (content.includes('=>')) {
			console.log(`Arrow check for ${symbolName}: ${isArrow}`)
		}
		
		return isArrow
	}

	getContext(document: vscode.TextDocument, scope: CodeScope): string {
		// NOTE: for now we're adding no context around the function.
		const startLine = Math.max(0, scope.range.start.line - 0)
		const contextRange = new vscode.Range(startLine, 0, scope.range.start.line, 0)
		return document.getText(contextRange)
	}
}

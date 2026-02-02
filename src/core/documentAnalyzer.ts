import { TypescriptAnalyzer } from '../analyzers/typescriptAnalyzer'
import { PythonAnalyzer } from '../analyzers/pythonAnalyzer'
import { SuggestionStore } from '../storage/suggestions'
import { AnthropicProvider } from '../ai/anthropic'
import { debounce } from '../utils/debounce'
import { CodeScope, ICodeAnalyzer } from '../types'
import * as vscode from 'vscode'

export class DocumentAnalyzerManager {
	private tsAnalyzer: TypescriptAnalyzer
	private pythonAnalyzer: PythonAnalyzer
	private aiProvider: AnthropicProvider
	private store: SuggestionStore
	private debouncedAnalyze: (document: vscode.TextDocument) => void

	constructor(
		context: vscode.ExtensionContext,
		store: SuggestionStore,
		private updateDecorations: () => void
	) {
		this.store = store
		this.tsAnalyzer = new TypescriptAnalyzer()
		this.pythonAnalyzer = new PythonAnalyzer()
		this.aiProvider = new AnthropicProvider(context)
		this.debouncedAnalyze = debounce(this.analyzeDocument.bind(this), 5000)
	}

	private async analyzeDocument(document: vscode.TextDocument): Promise<void> {
		console.log('retro analyzing document:', document.fileName)
		let scopes: CodeScope[]
		let language: string
		let analyzer: ICodeAnalyzer

		switch (document.languageId) {
			case 'typescript':
			case 'typescriptreact':
				language = 'typescript'
				analyzer = this.tsAnalyzer
				scopes = await this.tsAnalyzer.detectCompletedScopes(document)
				break
			case 'python':
				language = 'python'
				analyzer = this.pythonAnalyzer
				scopes = await this.pythonAnalyzer.detectCompletedScopes(document)
				break
			default:
				scopes = []
				console.log(`No analyzer for language: ${document.languageId}`)
				break
		}

		// filter out scopes with error s
		scopes = this.filterErrorScopes(scopes, document)

		const documentUri = document.uri.toString()

		// remove scopes that no longer exist (deleted/renamed functions)
		this.store.pruneStale(
			documentUri,
			scopes.map((s) => s.name)
		)

		await Promise.all(
			scopes.map(async (scope) => {
				const { exists, changed } = this.store.check(documentUri, scope)

				if (exists && !changed) {
					// if content has not changed, update the range just in case it has moved
					this.store.updateRange(documentUri, scope.name, scope.range)
					console.log(`Skipping ${scope.name} - unchanged, updated range`)
					return
				}

				// analyze new scope if it has changed
				try {
					const context = analyzer.getContext(document, scope)
					const suggestions = await this.aiProvider.analyze(scope.content, context, language)
					this.store.set(documentUri, scope, suggestions)
					console.log(`Analyzed ${scope.name}: ${suggestions.length} suggestions`)
				} catch (error) {
					console.error('Analysis failed:', error)
				}
			})
		)
		this.updateDecorations()
	}

	/**
	 * filter for scopes that are error free (we don't want to analyze broken code as it wastes tokens)
	 */
	private filterErrorScopes(scopes: CodeScope[], document: vscode.TextDocument): CodeScope[] {
		const diagnostics = vscode.languages.getDiagnostics(document.uri)
		const errors = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
		const errorFreeScopes = scopes.filter((scope) => {
			const hasError = errors.some((error) => scope.range.intersection(error.range) !== undefined)
			return !hasError
		})
		return errorFreeScopes
	}

	handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
		this.debouncedAnalyze(event.document)
	}
}

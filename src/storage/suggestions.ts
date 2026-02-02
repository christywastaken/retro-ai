import { Suggestion, CodeScope, StoredScope } from '../types'
import * as vscode from 'vscode'

export class SuggestionStore {
	private documents: Map<string, Map<string, StoredScope>> = new Map()
	private static instance: SuggestionStore
	private context: vscode.ExtensionContext | null = null
	private readonly STORAGE_KEY = 'retroAI.suggestions'

	private constructor() {}

	static getInstance(): SuggestionStore {
		if (!SuggestionStore.instance) {
			SuggestionStore.instance = new SuggestionStore()
		}
		return SuggestionStore.instance
	}

	initialize(context: vscode.ExtensionContext): void {
		this.context = context
		this.loadFromWorkspace()
	}

	private loadFromWorkspace(): void {
		if (!this.context) return

		const stored = this.context.workspaceState.get<Record<string, any>>(this.STORAGE_KEY)
		if (!stored) return

		// reconstruct the map structure from the store data
		for (const [docUri, scopes] of Object.entries(stored)) {
			const scopeMap = new Map<string, StoredScope>()
			for (const [scopeName, scopeData] of Object.entries(scopes as Record<string, any>))
				scopeMap.set(scopeName, {
					hash: scopeData.hash,
					range: new vscode.Range(
						new vscode.Position(scopeData.range.start.line, scopeData.range.start.character),
						new vscode.Position(scopeData.range.end.line, scopeData.range.end.character)
					),
					suggestions: scopeData.suggestions.map((s: any) => ({
						...s,
						range: new vscode.Range(
							new vscode.Position(s.range.start.line, s.range.start.character),
							new vscode.Position(s.range.end.line, s.range.end.character)
						)
					}))
				})
			this.documents.set(docUri, scopeMap)
		}
		console.log('-- Loaded suggestions from workspace storage')
	}

	private async saveToWorkspace(): Promise<void> {
		if (!this.context) return

		// convert map to plain object for json serial
		const toStore: Record<string, any> = {}
		for (const [docUri, scopes] of this.documents.entries()) {
			toStore[docUri] = {}
			for (const [scopeName, scopeData] of scopes.entries()) {
				toStore[docUri][scopeName] = {
					hash: scopeData.hash,
					range: {
						start: { line: scopeData.range.start.line, character: scopeData.range.start.character },
						end: { line: scopeData.range.end.line, character: scopeData.range.end.character }
					},
					suggestions: scopeData.suggestions.map((s) => ({
						...s,
						range: {
							start: { line: s.range.start.line, character: s.range.start.character },
							end: { line: s.range.end.line, character: s.range.end.character }
						}
					}))
				}
			}
		}
		await this.context.workspaceState.update(this.STORAGE_KEY, toStore)
	}

	/**
	 * Check if scope exists and whether its content has changed
	 */
	check(documentUri: string, scope: CodeScope): { exists: boolean; changed: boolean } {
		const docScopes = this.documents.get(documentUri)
		if (!docScopes) {
			return { exists: false, changed: false }
		}

		const stored = docScopes.get(scope.name)
		if (!stored) {
			return { exists: false, changed: false }
		}

		const currentHash = this.hash(scope)
		return { exists: true, changed: stored.hash !== currentHash }
	}

	/**
	 * Add or update a scope's suggestions
	 */
	set(documentUri: string, scope: CodeScope, suggestions: Suggestion[]): void {
		const docScopes = this.documents.get(documentUri) || new Map()

		const scopedSuggestions = suggestions.map((s) => ({
			...s,
			scopeName: scope.name,
			range: scope.range
		}))

		docScopes.set(scope.name, {
			hash: this.hash(scope),
			range: scope.range,
			suggestions: scopedSuggestions
		})

		this.documents.set(documentUri, docScopes)
		console.log(`Stored ${scope.name} with ${suggestions.length} suggestions`)

		this.saveToWorkspace()
	}

	/**
	 * Update just the range for a scope (when code moves but content is unchanged)
	 */
	updateRange(documentUri: string, scopeName: string, range: vscode.Range): void {
		const docScopes = this.documents.get(documentUri)
		if (!docScopes) return

		const stored = docScopes.get(scopeName)
		if (stored) {
			stored.range = range
			stored.suggestions.forEach((s) => (s.range = range))
		}
	}

	/**
	 * Remove scopes that no longer exist in the document
	 */
	pruneStale(documentUri: string, currentScopeNames: string[]): void {
		const docScopes = this.documents.get(documentUri)
		if (!docScopes) return

		const nameSet = new Set(currentScopeNames)
		const toDelete: string[] = []

		for (const scopeName of docScopes.keys()) {
			if (!nameSet.has(scopeName)) {
				toDelete.push(scopeName)
			}
		}

		for (const name of toDelete) {
			docScopes.delete(name)
			console.log(`Pruned stale scope: ${name}`)
		}
	}

	get(documentUri: string): Suggestion[] {
		const docScopes = this.documents.get(documentUri)
		if (!docScopes) return []
		return Array.from(docScopes.values()).flatMap((s) => s.suggestions)
	}

	getForLine(documentUri: string, line: number): Suggestion[] {
		const all = this.get(documentUri)
		return all.filter((s) => s.range.start.line <= line && s.range.end.line >= line)
	}

	clearDoc(documentUri: string): void {
		this.documents.delete(documentUri)
		this.saveToWorkspace()
	}

	clearAll(): void {
		this.documents.clear()
		this.saveToWorkspace()
	}

	private hash(scope: CodeScope): string {
		// hash on the function name (name) and content with whitespace removed
		// TODO: how do we handle comments?
		// TODO: if djb2 is too weak, consider using a proper hash function
		const content = scope.name + scope.content.replace(/\s+/g, '')
		let hash = 5381
		for (let i = 0; i < content.length; i++) {
			hash = ((hash << 5) + hash) ^ content.charCodeAt(i)
		}
		return (hash >>> 0).toString(36)
	}
}

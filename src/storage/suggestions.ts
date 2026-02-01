import { Suggestion, CodeScope, StoredScope } from '../types'
import * as vscode from 'vscode'

export class SuggestionStore {
	private documents: Map<string, Map<string, StoredScope>> = new Map()
	private static instance: SuggestionStore

	private constructor() {}

	static getInstance(): SuggestionStore {
		if (!SuggestionStore.instance) {
			SuggestionStore.instance = new SuggestionStore()
		}
		return SuggestionStore.instance
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
	}

	clearAll(): void {
		this.documents.clear()
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

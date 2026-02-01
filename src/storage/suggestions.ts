import { Suggestion, CodeScope } from '../types'

export class SuggestionStore {
	private suggestions: Map<string, Suggestion[]> = new Map()

	add(documentUri: string, scope: CodeScope, suggestions: Suggestion[]): void {
		const existing = this.suggestions.get(documentUri) || []

		const scopedSuggestions = suggestions.map((s) => ({
			...s,
			scopeName: scope.name,
			range: scope.range
		}))

    this.suggestions.set(documentUri, [...existing, ...scopedSuggestions])
	}

  get(documentUri: string): Suggestion[] {
    return this.suggestions.get(documentUri) || []
  }

  getForLine(documentUri: string, line: number): Suggestion[] {
    const all = this.get(documentUri)
    return all.filter((s) => s.range.start.line <= line && s.range.end.line >= line)
  }

  clear(documentUri: string): void {
    this.suggestions.delete(documentUri)
  }

  clearAll(): void {
    this.suggestions.clear()
  }

  has(documentUri: string): boolean {
    const suggestions = this.suggestions.get(documentUri)
    return !!suggestions && suggestions.length > 0
  }
}



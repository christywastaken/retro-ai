import * as vscode from 'vscode'
import { SuggestionStore } from '../storage/suggestions'
import { Suggestion, CodeScope } from '../types'

/**
 * Mock suggestions for testing UI components
 */
export function createMockSuggestions(line: number): Suggestion[] {
	return [
		{
			id: `mock-1-${Date.now()}`,
			scopeName: 'testFunction',
			type: 'refactor',
			title: 'Extract repeated logic',
			description: 'The validation logic appears multiple times. Consider extracting it into a separate helper function to improve maintainability.',
			suggestedCode: `function validateInput(value: string): boolean {
  if (!value || value.trim().length === 0) {
    return false
  }
  return value.length >= 3 && value.length <= 100
}`,
			range: new vscode.Range(line, 0, line + 10, 0),
			createdAt: Date.now()
		},
		{
			id: `mock-2-${Date.now()}`,
			scopeName: 'testFunction',
			type: 'efficiency',
			title: 'Use early return pattern',
			description: 'Nested conditionals can be flattened using early returns, making the code easier to read and reducing indentation levels.',
			suggestedCode: `function processData(data: Data): Result {
  if (!data) {
    return { error: 'No data provided' }
  }
  
  if (!data.isValid) {
    return { error: 'Invalid data' }
  }
  
  // Main logic here
  return { success: true, value: data.value }
}`,
			range: new vscode.Range(line, 0, line + 10, 0),
			createdAt: Date.now()
		},
		{
			id: `mock-3-${Date.now()}`,
			scopeName: 'testFunction',
			type: 'idiom',
			title: 'Use optional chaining',
			description: 'Replace nested null checks with optional chaining (?.) for cleaner, more readable code.',
			suggestedCode: `// Before
const name = user && user.profile && user.profile.name

// After
const name = user?.profile?.name`,
			range: new vscode.Range(line, 0, line + 10, 0),
			createdAt: Date.now()
		},
		{
			id: `mock-4-${Date.now()}`,
			scopeName: 'testFunction',
			type: 'style',
			title: 'Add JSDoc documentation',
			description: 'This function lacks documentation. Adding JSDoc comments will improve code maintainability and IDE support.',
			range: new vscode.Range(line, 0, line + 10, 0),
			createdAt: Date.now()
		}
	]
}

/**
 * Register test/debug commands for UI development
 */
export function registerTestCommands(
	context: vscode.ExtensionContext,
	store: SuggestionStore,
	updateDecorations: () => void
): void {
	// Add mock suggestions to current line
	const addMockSuggestionsCommand = vscode.commands.registerCommand('retroAI.test.addMockSuggestions', () => {
		const editor = vscode.window.activeTextEditor
		if (!editor) {
			vscode.window.showWarningMessage('No active editor')
			return
		}

		const line = editor.selection.active.line
		const documentUri = editor.document.uri.toString()

		const mockScope: CodeScope = {
			type: 'function',
			name: `testScope_${line}`,
			range: new vscode.Range(line, 0, line + 10, 0),
			content: editor.document.lineAt(line).text
		}

		const mockSuggestions = createMockSuggestions(line)
		store.set(documentUri, mockScope, mockSuggestions)
		updateDecorations()

		vscode.window.showInformationMessage(`Added ${mockSuggestions.length} mock suggestions at line ${line + 1}`)
	})

	// Add mock suggestions to multiple lines for testing
	const addMultipleMockCommand = vscode.commands.registerCommand('retroAI.test.addMultipleMocks', async () => {
		const editor = vscode.window.activeTextEditor
		if (!editor) {
			vscode.window.showWarningMessage('No active editor')
			return
		}

		const documentUri = editor.document.uri.toString()
		const linesToMock = [5, 15, 25, 35, 45].filter(l => l < editor.document.lineCount)

		for (const line of linesToMock) {
			const mockScope: CodeScope = {
				type: 'function',
				name: `testScope_${line}`,
				range: new vscode.Range(line, 0, line + 10, 0),
				content: editor.document.lineAt(line).text
			}
			store.set(documentUri, mockScope, createMockSuggestions(line))
		}

		updateDecorations()
		vscode.window.showInformationMessage(`Added mock suggestions to ${linesToMock.length} lines`)
	})

	// Open the suggestions panel with mock data
	const testPanelCommand = vscode.commands.registerCommand('retroAI.test.openPanel', () => {
		const { SuggestionsPanel } = require('../ui/suggestionsPanel')
		const mockSuggestions = createMockSuggestions(0)
		SuggestionsPanel.show(mockSuggestions, 10)
	})

	context.subscriptions.push(addMockSuggestionsCommand, addMultipleMockCommand, testPanelCommand)
}

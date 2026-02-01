import { IAIProvider, Suggestion } from '../types'
import Anthropic from '@anthropic-ai/sdk'
import * as vscode from 'vscode'

export class AnthropicProvider implements IAIProvider {
	name = 'anthropic'
	private client: Anthropic | null = null

	constructor(private context: vscode.ExtensionContext) {}

	private async getClient(): Promise<Anthropic> {
		if (this.client) return this.client

		const config = vscode.workspace.getConfiguration('retroAI')
		let apiKey = await this.context.secrets.get('retroAI.anthropicApiKey') // TODO: think about where we want this to live...

		if (!apiKey) {
			throw new Error('Anthropic API key not configured. Use "Retro AI: Set API Key" command.')
		}
		this.client = new Anthropic({ apiKey })
		return this.client
	}

	async analyze(code: string, context: string, language: string): Promise<Suggestion[]> {
		console.time('ai analysis time:')
		const client = await this.getClient()
		const config = vscode.workspace.getConfiguration('retroAI')
		const model = config.get<string>('model') || 'claude-haiku-4-5'
		// TODO: how are we going to stop it from rePrompting for the same function?
		// .... maybe we have a hash key of the function name + file name, and we only send the prompt if we haven't got an already completed
		try {
			const response = await client.messages.create({
				model: model,
				max_tokens: 1024,
				messages: [
					{
						role: 'user',
						content: `Analyze this ${language} code and provide actionable suggestions for improvement.
          
Context (imports and surrounding code):
${context}

Code to analyze:
${code}

Provide 1-3 suggestions focusing on:
- More idiomatic ${language} patterns
- Efficiency improvements
- Cleaner/more readable code
- Potential bugs or edge cases

Always provide at least one suggestion, even if minor (e.g., adding type annotations, improving variable names, or adding error handling).`
					}
				],
				tools: [
					{
						name: 'provide_suggestions',
						description: 'Provide code improvement suggestions',
						input_schema: {
							type: 'object',
							properties: {
								suggestions: {
									type: 'array',
									items: {
										type: 'object',
										properties: {
											type: {
												type: 'string',
												enum: ['refactor', 'efficiency', 'idiom', 'style']
											},
											title: {
												type: 'string',
												description: 'Brief summary under 60 chars'
											},
											description: {
												type: 'string',
												description: 'Detailed explanation'
											},
											suggestedCode: {
												type: 'string',
												description: 'The improved code'
											}
										},
										required: ['type', 'title', 'description']
									}
								}
							},
							required: ['suggestions']
						}
					}
				],
				tool_choice: { type: 'tool', name: 'provide_suggestions' }
			})

			console.log('Anthropic response content:', JSON.stringify(response.content, null, 2))
			
			const toolUse = response.content.find((block) => block.type === 'tool_use')
			if (!toolUse || toolUse.type !== 'tool_use') {
				console.log('No tool use found in Anthropic response')
				return []
			}
			
			console.log('Tool use input:', JSON.stringify(toolUse.input, null, 2))
			const input = toolUse.input as { suggestions: any[] }
			console.timeEnd('ai analysis time:')
			
			if (!input || !input.suggestions) {
				console.log('No suggestions in tool input, raw input:', input)
				return []
			}
			
			return this.mapToSuggestions(input.suggestions)
		} catch (error) {
			console.error('Anthropic API error:', error)
			// TODO: handle errors (e.g. no credits etc.)
			return []
		}
	}

	private mapToSuggestions(raw: any[]): Suggestion[] {
		console.log('Raw suggestions from Anthropic:', raw)
		if (!Array.isArray(raw)) return []

		return raw.map((item, index) => ({
			id: `suggestion-${Date.now()}-${index}`,
			scopeName: '',
			type: item.type || 'refactor',
			title: item.title || 'Suggestion',
			description: item.description || '',
			suggestedCode: item.suggestedCode,
			range: null as any,
			createdAt: Date.now()
		}))
	}
}

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
        let apiKey = await this.context.secrets.get('retroAI.anthropicApiKey')

        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Use "Retro AI: Set API Key" command.')
        }
        this.client = new Anthropic({ apiKey })
        return this.client
    }

    async analyze(code: string, context: string, language: string): Promise<Suggestion[]> {
        const client = await this.getClient()
        const config = vscode.workspace.getConfiguration('retroAI')
        const model = config.get<string>('model') || 'claude-haiku-4-5'

        try {
            const response = await client.messages.create({
                model: model,
                max_tokens: 2048,
                system: `You are a code reviewer. When given code, you MUST call the provide_suggestions tool with an array of 1-4 suggestions. Never respond with text only - always use the tool.`,
                messages: [
                    {
                        role: 'user',
                        content: `Review this ${language} code and call provide_suggestions with improvements:

\`\`\`${language}
${code}
\`\`\`

Find issues like:
- Unused variables
- Functions that are too long
- Non-idiomatic patterns
- Potential bugs

Call the tool now.`
                    }
                ],
                tools: [
                    {
                        name: 'provide_suggestions',
                        description: 'Submit code review suggestions. You MUST call this with at least one suggestion.',
                        input_schema: {
                            type: 'object',
                            properties: {
                                suggestions: {
                                    type: 'array',
                                    minItems: 1,
                                    items: {
                                        type: 'object',
                                        properties: {
                                            type: {
                                                type: 'string',
                                                enum: ['refactor', 'efficiency', 'idiom', 'style']
                                            },
                                            title: { type: 'string' },
                                            description: { type: 'string' },
                                            suggestedCode: { type: 'string' }
                                        },
                                        required: ['type', 'title', 'description', 'suggestedCode']
                                    }
                                }
                            },
                            required: ['suggestions']
                        }
                    }
                ],
                tool_choice: { type: 'any' }
            })

            console.log('Anthropic response content:', JSON.stringify(response.content, null, 2))

            const toolUse = response.content.find((block) => block.type === 'tool_use')
            if (!toolUse || toolUse.type !== 'tool_use') {
                console.log('No tool use found in Anthropic response')
                return []
            }

            console.log('Tool use input:', JSON.stringify(toolUse.input, null, 2))
            const input = toolUse.input as { suggestions?: any[] }

            if (!input || !input.suggestions || !Array.isArray(input.suggestions)) {
                console.log('No suggestions in tool input, raw input:', input)
                return []
            }

            return this.mapToSuggestions(input.suggestions)
        } catch (error) {
            console.error('Anthropic API error:', error)
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
            suggestedCode: item.suggestedCode || '',
            range: null as any,
            createdAt: Date.now()
        }))
    }
}
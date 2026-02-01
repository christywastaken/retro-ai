/**
 * - for now we have on single prompt
 * TODO: in the future, if we want to create different types of suggestions, we can tune different prompts
 * TODO: we might want to tune the response to only make suggestions if they are x% improvements etc?
 * TODO: tune it so it only responds if it thinks the function is mostly complete?
 *        - return values set, function looks syntactically complete etc
 */

export function buildAnalysisPrompt(code: string, context: string, language: string): string {
	return `Analyze this ${language} code and provide suggestions for improvement.

Context (imports, surrounding code):
${context}

Code to analyze:
${code}

Focus on:
- More idiomatic ${language} patterns
- Efficiency improvements  
- Cleaner/more readable code
- Potential bugs or edge cases

If the code looks good, return an empty suggestions array.`
}

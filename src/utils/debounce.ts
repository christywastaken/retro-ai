/**
 * debounce function that returns the original function, with a debounce on it, while maintaining type safety
 * TODO: this might get torn out depending on what direction we go with the analyzers...
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
	let timer: NodeJS.Timeout | undefined

	return (...args: Parameters<T>) => {
		if (timer) {
			clearTimeout(timer)
		}
		timer = setTimeout(() => fn(...args), delay)
	}
}


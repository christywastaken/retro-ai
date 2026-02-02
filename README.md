# Retro AI Assistant

AI-powered code analysis that provides real-time suggestions for improving your code quality, efficiency, and style.

![Retro AI Demo](https://raw.githubusercontent.com/christywastaken/retro-ai/main/assets/demo.gif)

## Features

- **Real-time Analysis**: Automatically analyzes your TypeScript and Python code as you write
- **Smart Suggestions**: Get actionable recommendations for:
  - Code refactoring
  - Performance improvements
  - Language idioms and best practices
  - Style consistency
- **Non-intrusive UI**: Purple gutter indicators show which functions have suggestions
- **Hover to View**: Hover over highlighted lines to see suggestions inline
- **Detailed Panel**: Click "Open Panel" for a full view with syntax-highlighted code examples

## Getting Started

### 1. Install the Extension

Search for "Retro AI Assistant" in the VS Code Extensions marketplace, or install from the command line:

```bash
code --install-extension ChristyWasTaken.retro-ai-assistant
```

### 2. Set Your API Key

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run `Retro AI: Set API Key`
3. Enter your Anthropic API key

### 3. Select a Model (Optional)

1. Open Command Palette
2. Run `Retro AI: Select Model`
3. Choose from:
   - **Claude Haiku 4.5** - Fast, good for quick feedback
   - **Claude Sonnet 4.5** - Balanced speed and quality
   - **Claude Opus 4.5** - Highest quality analysis

## Usage

1. Open a TypeScript or Python file
2. Write or edit a function
3. After a few seconds, a purple dot appears in the gutter if suggestions are available
4. Hover over the highlighted line to see suggestions
5. Click "Open Panel" for detailed view with code examples

## Commands

| Command | Description |
|---------|-------------|
| `Retro AI: Set API Key` | Configure your Anthropic API key |
| `Retro AI: Select Model` | Choose the AI model to use |
| `Retro AI: Clear All Suggestions` | Clear cached suggestions |
| `Retro AI: Open Suggestions Panel` | Open the suggestions panel |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `retroAI.enabled` | `true` | Enable/disable the assistant |
| `retroAI.model` | `claude-haiku-4-5` | AI model to use for analysis |

## Supported Languages

- TypeScript
- TypeScript React (TSX)
- Python

## Privacy

- Your code is sent to Anthropic's API for analysis
- No code is stored or logged by this extension
- API keys are stored securely in VS Code's secret storage

## Requirements

- VS Code 1.85.0 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

GPL-3.0 - see [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/christywastaken/retro-ai/issues)
- [Feature Requests](https://github.com/christywastaken/retro-ai/issues/new?labels=enhancement)

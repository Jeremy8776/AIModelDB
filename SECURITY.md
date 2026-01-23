# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in AI Model DB, please follow these steps:

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email your findings to the repository owner via GitHub's private messaging
3. Or use GitHub's [private vulnerability reporting](https://github.com/Jeremy8776/AIModelDB/security/advisories/new) feature

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

## Security Considerations

### Local Data Storage

AI Model DB stores all data locally on your machine:

- **API Keys**: Encrypted in localStorage
- **Model Database**: Stored in localStorage
- **Settings**: Stored in localStorage

**No data is transmitted to any server except:**
- Direct API calls to enabled data sources (Hugging Face, Civitai, etc.)
- Direct API calls to LLM providers (if configured for validation)

### API Key Handling

- API keys are stored using browser's localStorage with encryption
- Keys are only used for direct API calls to their respective services
- Keys are never logged or transmitted elsewhere

### Third-Party Services

When you enable data sources, the application connects to:
- Hugging Face API (api.huggingface.co)
- Civitai API (civitai.com)
- OpenModelDB (openmodeldb.info)
- Artificial Analysis (artificialanalysis.ai)

When you use LLM validation, the application connects to:
- OpenAI API (api.openai.com)
- Anthropic API (api.anthropic.com)
- Google AI API (generativelanguage.googleapis.com)
- DeepSeek API (api.deepseek.com)

### Electron Security

- Context isolation is enabled
- Node integration is disabled in renderer
- Preload scripts use contextBridge
- Content Security Policy (CSP) is configured

## Best Practices

1. **Keep Updated**: Always use the latest version for security fixes
2. **API Key Safety**: Never share your API keys or configuration files
3. **Download Source**: Only download from official GitHub releases
4. **Verify Checksums**: Check file hashes if available

## Dependencies

We regularly update dependencies to patch known vulnerabilities. Run `npm audit` to check for issues in a development environment.

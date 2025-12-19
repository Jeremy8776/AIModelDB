/**
 * API Key Manager
 * Handles resolution of API keys from local configuration
 */

/**
 * Get the effective API key for a provider
 * @param provider - The provider name (e.g., 'openai', 'anthropic')
 * @param localKey - Optional local API key from configuration
 * @returns The effective API key to use, or undefined if none available
 */
export async function getEffectiveApiKey(provider: string, localKey?: string): Promise<string | undefined> {
    // Return local key if available
    if (localKey && localKey.trim() !== '') {
        return localKey;
    }

    return undefined;
}

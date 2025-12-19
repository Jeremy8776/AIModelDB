import { Domain, Model } from '../../../types';
import { cleanId } from '../../../utils/format';
import { proxyUrl } from '../config';
import { determineType, determineCommercialUse } from '../utils';
import { isModelComplete } from '../filtering';

/**
 * Helper function to determine domain from GitHub repository topics
 */
function determineDomainFromTopics(topics: string[]): Domain {
    const topicsStr = topics.join(' ').toLowerCase();

    if (topicsStr.includes('text-to-image') || topicsStr.includes('diffusion') || topicsStr.includes('image-generation')) {
        return 'ImageGen';
    } else if (topicsStr.includes('llm') || topicsStr.includes('language-model') || topicsStr.includes('gpt') ||
        topicsStr.includes('chatbot') || topicsStr.includes('transformers')) {
        return 'LLM';
    } else if (topicsStr.includes('computer-vision') || topicsStr.includes('object-detection') ||
        topicsStr.includes('image-recognition') || topicsStr.includes('multimodal') || topicsStr.includes('vlm')) {
        return 'VLM';
    } else if (topicsStr.includes('lora') || topicsStr.includes('peft') || topicsStr.includes('adapter')) {
        return 'LoRA';
    } else if (topicsStr.includes('fine-tune') || topicsStr.includes('finetune') || topicsStr.includes('fine-tuned') || topicsStr.includes('sft')) {
        return 'FineTune';
    } else if (topicsStr.includes('text-to-speech')) {
        return 'TTS';
    } else if (topicsStr.includes('text-to-video') || topicsStr.includes('video-generation')) {
        return 'VideoGen';
    } else if (topicsStr.includes('audio') || topicsStr.includes('music-generation')) {
        return 'Audio';
    } else if (topicsStr.includes('speech-recognition') || topicsStr.includes('asr')) {
        return 'ASR';
    } else if (topicsStr.includes('3d') || topicsStr.includes('3d-generation')) {
        return '3D';
    } else if (topicsStr.includes('world-model') || topicsStr.includes('simulation')) {
        return 'World/Sim';
    }

    return 'Other';
}

/**
 * Fetch popular generative model repositories from GitHub
 * @param limit Maximum number of repositories to fetch (default: 50)
 * @returns Object containing complete and flagged models
 */
export async function fetchGitHubPopular(limit = 50): Promise<{ complete: Model[], flagged: Model[] }> {
    let complete: Model[] = [];
    let flagged: Model[] = [];

    try {
        const query = encodeURIComponent(
            "machine-learning OR deep-learning OR AI OR llm OR stable-diffusion OR text-generation"
        );
        const url = proxyUrl(
            `/github-api/search/repositories?q=${query}+stars:>50+language:python&sort=stars&order=desc&per_page=${limit}`,
            `https://api.github.com/search/repositories?q=${query}+stars:>50+language:python&sort=stars&order=desc&per_page=${limit}`
        );
        const ghToken = import.meta.env.VITE_GITHUB_TOKEN || '';
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'ai-model-db-pro',
                ...(ghToken ? { 'Authorization': `Bearer ${ghToken}` } : {})
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[GitHub] ERROR: Status ${response.status} ${response.statusText}. Response: ${text}`);
            return { complete: [], flagged: [] };
        }

        const data = await response.json();
        const repos = data.items || [];

        if (!repos.length) {
            console.error('[GitHub] API did not return any repositories:', data);
            return { complete: [], flagged: [] };
        }

        // Map GitHub API response to Model[]
        repos.forEach((repo: any) => {
            // Extract topics to help determine domain
            const topics = repo.topics || [];
            const topicsStr = topics.join(' ').toLowerCase();
            const description = (repo.description || "").toLowerCase();

            // Skip repositories that are likely not actual models but tools, libraries, or inference engines
            if (
                topicsStr.includes('inference-engine') ||
                topicsStr.includes('inference-server') ||
                description.includes('inference server') ||
                description.includes('inference engine') ||
                description.includes('deployment') ||
                (description.includes('framework') && !description.includes('model')) ||
                repo.name.toLowerCase().includes('inference')
            ) {
                return;
            }

            const model: Model = {
                id: cleanId(repo.name),
                name: repo.name,
                provider: repo.owner?.login || "GitHub",
                domain: determineDomainFromTopics(topics),
                source: "GitHub",
                url: repo.html_url,
                repo: repo.html_url,
                license: {
                    name: repo.license?.name || "Unknown",
                    type: determineType(repo.license?.name),
                    commercial_use: determineCommercialUse(repo.license?.name),
                    attribution_required: repo.license?.name?.toLowerCase().includes("attribution"),
                    share_alike: repo.license?.name?.toLowerCase().includes("share-alike"),
                    copyleft: repo.license?.name?.toLowerCase().includes("gpl")
                },
                downloads: repo.stargazers_count,
                updated_at: repo.updated_at,
                release_date: repo.created_at,
                tags: topics,
                hosting: {
                    weights_available: true,
                    api_available: false,
                    on_premise_friendly: true
                }
            };

            if (isModelComplete(model)) {
                complete.push(model);
            } else {
                flagged.push(model);
            }
        });

        return { complete, flagged };
    } catch (err: any) {
        console.error('[GitHub] Fetch error:', err?.message || err);
        return { complete: [], flagged: [] };
    }
}

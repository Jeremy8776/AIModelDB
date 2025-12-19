import { Model } from '../../../types';
import { proxyUrl } from '../config';
import {
    normalizeLicenseName,
    determineType,
    determineCommercialUse,
    inferLicenseFromTags
} from '../utils/license-utils';
import { normalizeDate } from '../utils/date-utils';
import { inferParametersFromNameTags } from '../utils/parameter-utils';

type PartialModel = Partial<Model>;

export async function enrichFromHuggingFace(model: Model): Promise<PartialModel | null> {
    const isHF = (model.source === 'HuggingFace') || (model.url?.includes('huggingface.co'));
    if (!isHF) return null;
    try {
        let modelId = '';
        if (model.url?.includes('huggingface.co')) {
            const u = new URL(model.url);
            modelId = u.pathname.replace(/^\//, '');
        }
        if (!modelId && model.id) modelId = model.id;
        if (!modelId) return null;
        const resp = await fetch(proxyUrl(`/huggingface-api/models/${encodeURIComponent(modelId)}`, `https://huggingface.co/api/models/${encodeURIComponent(modelId)}`));
        if (!resp.ok) return null;
        const data = await resp.json();
        const license = normalizeLicenseName(data.license || data.cardData?.license);
        const tags = data.tags || data.cardData?.tags || [];
        const downloads = data.downloads || data.downloadsAllTime || undefined;
        // Extract provider from model ID if not available from API data
        let provider = model.provider || data.author || data.owner?.username || null;
        if (!provider && model.id) {
            const parts = model.id.split('/');
            if (parts.length >= 2) {
                provider = parts[0]; // Extract organization/user from "pyannote/speaker-diarization-3.1"
            }
        }
        const enriched: PartialModel = {
            id: model.id,
            name: model.name,
            provider: provider, // Now extracts from URL structure if needed
            domain: model.domain,
            source: model.source,
            hosting: model.hosting,
            description: model.description || data.description || data.cardData?.description || null,
            license: {
                name: model.license?.name || license || normalizeLicenseName(inferLicenseFromTags(tags)) || 'Unknown',
                type: model.license?.type || determineType(license || inferLicenseFromTags(tags)),
                commercial_use: model.license?.commercial_use ?? determineCommercialUse(license || inferLicenseFromTags(tags)),
                attribution_required: model.license?.attribution_required ?? (license ? String(license).toLowerCase().includes('by') : false),
                share_alike: model.license?.share_alike ?? (license ? String(license).toLowerCase().includes('sa') : false),
                copyleft: model.license?.copyleft ?? (license ? String(license).toLowerCase().includes('gpl') : false)
            },
        } as any;
        if ((!model.tags || model.tags.length === 0) && Array.isArray(tags)) enriched.tags = tags;
        if (!model.parameters) {
            const inferred = inferParametersFromNameTags(model.name, Array.isArray(tags) ? tags : []);
            if (inferred) (enriched as any).parameters = inferred;
        }
        if (downloads && !model.downloads) enriched.downloads = downloads;
        // Normalize dates if present on enriched model
        if ((enriched as any).updated_at) (enriched as any).updated_at = normalizeDate((enriched as any).updated_at);
        if ((enriched as any).release_date) (enriched as any).release_date = normalizeDate((enriched as any).release_date);
        // Try inferring release date from tags like "2024-05-01" or year/month
        if (!(enriched as any).release_date && Array.isArray(tags)) {
            const iso = tags.find((t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t));
            const y = tags.find((t: string) => /^\d{4}$/.test(t));
            if (iso) (enriched as any).release_date = iso;
            else if (y) (enriched as any).release_date = `${y}-01-01`;
        }
        return enriched;
    } catch {
        return null;
    }
}

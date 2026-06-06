import { performMergeBatch } from '../utils/mergeLogic';
import { Model } from '../types';

const ctx: Worker = self as any;

type WorkerMessage =
    | { type: 'MERGE_MODELS'; payload: { requestId?: number; currentModels: Model[]; newModels: Model[]; autoMergeDuplicates: boolean } }
    | { type: 'PING' };

ctx.addEventListener('message', (event) => {
    const msg = event.data as WorkerMessage;

    try {
        if (msg.type === 'MERGE_MODELS') {
            const { requestId, currentModels, newModels, autoMergeDuplicates } = msg.payload;
            const result = performMergeBatch(currentModels, newModels, autoMergeDuplicates);
            ctx.postMessage({ type: 'MERGE_COMPLETE', payload: { ...result, requestId } });
        } else if (msg.type === 'PING') {
            ctx.postMessage({ type: 'PONG' });
        }
    } catch (error) {
        ctx.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
});

export { };

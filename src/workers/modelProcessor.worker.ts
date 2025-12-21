import { performMergeBatch } from '../utils/mergeLogic';
import { Model } from '../types';

/* eslint-disable no-restricted-globals */
const ctx: Worker = self as any;

type WorkerMessage =
    | { type: 'MERGE_MODELS'; payload: { currentModels: Model[]; newModels: Model[]; autoMergeDuplicates: boolean } }
    | { type: 'PING' };

ctx.addEventListener('message', (event) => {
    const msg = event.data as WorkerMessage;

    try {
        if (msg.type === 'MERGE_MODELS') {
            const { currentModels, newModels, autoMergeDuplicates } = msg.payload;
            const result = performMergeBatch(currentModels, newModels, autoMergeDuplicates);
            ctx.postMessage({ type: 'MERGE_COMPLETE', payload: result });
        } else if (msg.type === 'PING') {
            ctx.postMessage({ type: 'PONG' });
        }
    } catch (error) {
        ctx.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : String(error) });
    }
});

export { };

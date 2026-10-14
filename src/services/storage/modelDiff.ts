/**
 * Change detection for saving the model list.
 *
 * Models are treated as immutable (an edit or merge produces a new object and
 * leaves untouched records as the same reference), so comparing references
 * against the previously saved array finds exactly what changed. Saving only
 * those records avoids re-serialising the whole database (tens of MB of
 * structured clone on the main thread) for a single favourite toggle or sync.
 */
import type { Model } from '../../types';

export interface ModelChanges {
    puts: Model[];
    deletes: string[];
}

export function diffModels(previous: Model[], next: Model[]): ModelChanges {
    const previousById = new Map<string, Model>();
    for (const model of previous) previousById.set(model.id, model);

    const puts: Model[] = [];
    const seen = new Set<string>();
    for (const model of next) {
        seen.add(model.id);
        if (previousById.get(model.id) !== model) puts.push(model);
    }

    const deletes: string[] = [];
    for (const id of previousById.keys()) {
        if (!seen.has(id)) deletes.push(id);
    }
    return { puts, deletes };
}

/** A full rewrite is simpler and about as fast once most of the store changes (or on first save). */
export function shouldRewriteAll(previousCount: number, nextCount: number, changes: ModelChanges): boolean {
    if (previousCount === 0) return true;
    return changes.puts.length + changes.deletes.length > Math.max(nextCount, previousCount) * 0.5;
}

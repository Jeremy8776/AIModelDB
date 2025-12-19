import { Model } from "../../../types";

/**
 * Check if a model has all required fields to be considered complete
 * 
 * @param model - The model to check for completeness
 * @returns true if the model has all required fields, false otherwise
 */
export function isModelComplete(model: Model): boolean {
    return Boolean(
        model.id &&
        model.name &&
        model.provider &&
        model.domain &&
        model.source
    );
}

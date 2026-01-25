import { Model } from "./index";

/**
 * Validation source types
 */
export enum ValidationSource {
    API = "api",
    WEBSEARCH = "websearch",
    SCRAPING = "scraping"
}

/**
 * Validation job status types
 */
export type ValidationJobStatus =
    | "pending"
    | "processing"
    | "completed"
    | "failed";

/**
 * Represents a single validation job entry
 */
export interface ValidationJob {
    id: string;
    model: Model;
    sources: ValidationSource[];
    status: ValidationJobStatus;
    attempts: number;
    maxAttempts: number;
    error?: string;
    result?: Model;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Event for tracking specific metadata changes during validation
 */
export interface ValidationUpdateEvent {
    modelId: string;
    modelName: string;
    field: string;
    oldValue: any;
    newValue: any;
}

/**
 * Summary of results for a validation operation
 */
export interface ValidationSummary {
    totalModels: number;
    modelsUpdated: number;
    fieldsUpdated: {
        description: number;
        parameters: number;
        context_window: number;
        license: number;
        release_date: number;
        tags: number;
        pricing: number;
        other: number;
    };
    updates: ValidationUpdateEvent[];
    errors: number;
    webSearchUsed: boolean;
}

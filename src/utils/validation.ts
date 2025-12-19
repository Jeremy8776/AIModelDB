import { Model } from "../types";

// Define the sources to check for model information
export const DATA_SOURCES = {
  HUGGINGFACE: 'huggingface',
  GITHUB: 'github',
  PAPERSWITHCODE: 'paperswithcode',
  MODELSCOPE: 'modelscope', 
  REPLICATE: 'replicate',
  WEBSEARCH: 'websearch'
};

// Structure for validation tasks
export interface ValidationTask {
  model: Model;
  sources: string[];
  priority: number; // Higher number = higher priority
  added: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

// Helper to create web search query for a model
export function createModelSearchQuery(model: Model): string {
  const components = [];
  
  if (model.name) components.push(model.name);
  if (model.provider) components.push(model.provider);
  if (model.parameters) components.push(`${model.parameters} parameters`);
  if (model.domain) components.push(model.domain);
  
  // Add specific keyword combinations that might help
  if (model.domain === 'LLM') {
    components.push('large language model');
  } else if (model.domain === 'ImageGen') {
    components.push('image generation model');
  } else if (model.domain === 'VideoGen') {
    components.push('video generation AI');
  }
  
  // Add license information if we're specifically looking for that
  if (!model.license?.name) {
    components.push('license');
  }
  
  // If we need parameter count, add specific search terms for that
  if (!model.parameters && model.domain === 'LLM') {
    components.push('parameter count');
    components.push('model size');
  }
  
  return components.join(' ');
}

// Create a web search prompt for an LLM
export function createWebSearchPrompt(model: Model, searchResults: string): string {
  return `
I need to gather accurate information about an AI model named "${model.name}" by ${model.provider || 'unknown provider'}. 
Here is the current information I have:

${JSON.stringify(model, null, 2)}

And here are web search results about this model:

${searchResults}

Please extract accurate information from these results to fill in the missing fields in the model object.
Focus on these fields if they're missing:
- parameters (size of the model, e.g. "7B" or "1.5B")
- context_window (for LLMs, e.g. "8K", "32K" tokens)
- license details (name, type, commercial_use, attribution_required)
- release_date (in ISO format)
- tags (relevant model capabilities or features)
- hosting information
- downloads (approximate number if mentioned)

Return ONLY a valid JSON object with the updated model information. Do not include explanations outside the JSON.
Only include fields that you have found reliable information for. If information conflicts between sources, use the most recent or authoritative source.
`;
}

// Create an enrichment prompt based on model fields that need completing
export function createEnrichmentPrompt(model: Model): string {
  // Identify missing fields
  const missingFields = [];
  if (!model.parameters && ['LLM', 'Vision', 'ImageGen', 'VideoGen'].includes(model.domain)) 
    missingFields.push('parameters');
  if (!model.context_window && model.domain === 'LLM') 
    missingFields.push('context_window');
  if (!model.license || !model.license.name) 
    missingFields.push('license details');
  if (!model.release_date) 
    missingFields.push('release_date');
  if (!model.tags || model.tags.length === 0) 
    missingFields.push('tags');
  if (!model.hosting) 
    missingFields.push('hosting information');

  return `
I have an AI model with incomplete metadata. Fill in the missing information for this model:
${JSON.stringify(model, null, 2)}

The following fields need to be completed or improved:
${missingFields.map(field => `- ${field}`).join('\n')}

Based on your knowledge of AI models, please provide the most accurate information for these fields.
For parameters, provide the model size (e.g., "7B", "1.5B").
For context_window, provide the maximum tokens the model can process (e.g., "8K", "32K").
For license, determine the most likely license based on the provider and model type.
For tags, provide relevant keywords that describe the model's capabilities.

Return ONLY a valid JSON object with the model information including the fields you've filled in.
Do not include explanations outside of the JSON.
`;
}

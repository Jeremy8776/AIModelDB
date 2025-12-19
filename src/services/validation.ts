import { Model } from "../types";

// Define the sources to check for model information
export enum ValidationSource {
  API = "api",
  WEBSEARCH = "websearch",
  SCRAPING = "scraping"
}

// Define validation job status
export type ValidationJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// Define a validation job
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

// ValidationQueue class for managing model validation
export class ValidationQueue {
  private jobs: ValidationJob[] = [];
  private concurrency: number;
  private processingCount: number = 0;
  private onValidate: (model: Model, sources: ValidationSource[]) => Promise<Model>;
  private onProgress?: (current: number, total: number) => void;
  private onComplete?: (job: ValidationJob) => void;
  private onError?: (job: ValidationJob) => void;
  private paused: boolean = false;

  constructor(
    onValidate: (model: Model, sources: ValidationSource[]) => Promise<Model>,
    options: {
      concurrency?: number;
      onProgress?: (current: number, total: number) => void;
      onComplete?: (job: ValidationJob) => void;
      onError?: (job: ValidationJob) => void;
    } = {}
  ) {
    this.concurrency = options.concurrency || 2;
    this.onValidate = onValidate;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  // Add a model to the validation queue
  public addJob(
    model: Model,
    sources: ValidationSource[] = [ValidationSource.API],
    maxAttempts: number = 3
  ): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ValidationJob = {
      id: jobId,
      model,
      sources,
      status: "pending",
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.push(job);

    // Start processing if not paused
    if (!this.paused) {
      this.processNext();
    }

    return jobId;
  }

  // Add multiple models to the validation queue
  public addJobs(
    models: Model[],
    sources: ValidationSource[] = [ValidationSource.API],
    maxAttempts: number = 3
  ): string[] {
    return models.map(model => this.addJob(model, sources, maxAttempts));
  }

  // Pause the queue processing
  public pause(): void {
    this.paused = true;
  }

  // Resume queue processing
  public resume(): void {
    this.paused = false;
    this.processNext();
  }

  // Get paused status
  public isPaused(): boolean {
    return this.paused;
  }

  // Process next jobs in queue
  private processNext(): void {
    if (this.paused) return;

    // Check how many jobs we can process now
    const availableSlots = this.concurrency - this.processingCount;
    if (availableSlots <= 0) return;

    // Get pending jobs
    const pendingJobs = this.jobs.filter(job => job.status === "pending");

    // Process up to availableSlots jobs
    const jobsToProcess = pendingJobs.slice(0, availableSlots);

    // Update progress if needed
    if (this.onProgress && this.jobs.length > 0) {
      const completed = this.jobs.filter(j => j.status === "completed" || j.status === "failed").length;
      this.onProgress(completed, this.jobs.length);
    }

    // If no more jobs to process, we're done
    if (jobsToProcess.length === 0) return;

    // Process each job
    jobsToProcess.forEach(job => this.processJob(job));
  }

  // Process a single job
  private async processJob(job: ValidationJob): Promise<void> {
    if (job.status !== "pending") return;

    // Mark job as processing and increment counter
    job.status = "processing";
    job.attempts++;
    job.updatedAt = new Date();
    this.processingCount++;

    try {
      // Call validation function
      const result = await this.onValidate(job.model, job.sources);

      // Update job with result
      job.status = "completed";
      job.result = result;
      job.updatedAt = new Date();

      // Notify completion if callback exists
      if (this.onComplete) {
        this.onComplete(job);
      }
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        job.status = "pending"; // Mark for retry
        job.error = `${errorMessage} (Retrying ${job.attempts}/${job.maxAttempts})`;
      } else {
        job.status = "failed"; // Give up after max attempts
        job.error = `${errorMessage} (Failed after ${job.maxAttempts} attempts)`;

        // Add more context for common errors
        if (errorMessage.includes("No enabled LLM providers")) {
          job.error = "No API providers configured. Please set up an API provider in Sync settings.";
        } else if (errorMessage.includes("401")) {
          job.error = "API authentication failed (401). Check your API key.";
        } else if (errorMessage.includes("403")) {
          job.error = "API access forbidden (403). Check your account permissions.";
        } else if (errorMessage.includes("404")) {
          job.error = "API endpoint not found (404). The provider may have changed their API.";
        } else if (errorMessage.includes("429")) {
          job.error = "API rate limit exceeded (429). Try again later or use a different provider.";
        } else if (errorMessage.includes("500")) {
          job.error = "API server error (500). The provider's service may be experiencing issues.";
        }

        // Notify error if callback exists
        if (this.onError) {
          this.onError(job);
        }
      }
    } finally {
      // Decrement processing counter
      this.processingCount--;

      // Update progress if needed
      if (this.onProgress && this.jobs.length > 0) {
        const completed = this.jobs.filter(j => j.status === "completed" || j.status === "failed").length;
        this.onProgress(completed, this.jobs.length);
      }

      // Process next job
      this.processNext();
    }
  }

  // Get all jobs
  public getJobs(): ValidationJob[] {
    return [...this.jobs];
  }

  // Get pending job count
  public getPendingCount(): number {
    return this.jobs.filter(j => j.status === "pending").length;
  }

  // Get completed job count
  public getCompletedCount(): number {
    return this.jobs.filter(j => j.status === "completed").length;
  }

  // Get failed job count
  public getFailedCount(): number {
    return this.jobs.filter(j => j.status === "failed").length;
  }

  // Get processing job count
  public getProcessingCount(): number {
    return this.jobs.filter(j => j.status === "processing").length;
  }

  // Get total job count
  public getTotalCount(): number {
    return this.jobs.length;
  }

  // Clear completed and failed jobs
  public clearFinishedJobs(): void {
    this.jobs = this.jobs.filter(j => j.status !== "completed" && j.status !== "failed");
  }

  // Clear all jobs
  public clearAllJobs(): void {
    this.pause();
    this.jobs = [];
    this.processingCount = 0;
  }
}

// Helper functions for common validation tasks

// Create a validation prompt for LLM-based validation
export function createValidationPrompt(model: Model, sources: ValidationSource[]): string {
  const sourceDescription = sources.includes(ValidationSource.WEBSEARCH)
    ? "Use web search to find the most accurate and up-to-date information."
    : "Use your knowledge to fill in missing information.";

  return `
I need complete and accurate metadata for this AI model:
${JSON.stringify(model, null, 2)}

${sourceDescription}

For each missing or incomplete field, provide the most accurate information available.
Pay special attention to:
1. Provider/Author: The actual person or organization who created/published the model (NOT the platform like "HuggingFace" or "Replicate")
2. Parameters (model size like "7B", "70B", "1.3B")
3. Context window (for LLMs like "4k", "8k", "32k", "128k")
4. License details (exact name, type, commercial use permissions)
5. Release date: CRITICAL - Find the official announcement/launch date when this model was first released. Look for:
   - Official company blog posts announcing the model
   - Technical reports and research papers
   - Press releases and news articles
   - GitHub repository creation dates and release tags
   - Model card publication dates
   Format as YYYY-MM-DD, prefer the earliest official announcement
6. Description (brief explanation of what the model does)
7. Tags (relevant technical tags and categories)
 8. Links: include authoritative url (model card, official page) and repo (GitHub or equivalent) if available

IMPORTANT: If a reliable date or source cannot be found, search again with different queries and cross-check at least two sources before returning "Unknown".

Return the complete model information as a valid JSON object with all fields filled.
Do not include explanations outside the JSON structure.
`;
}

// Helper to check if a model is missing critical information
export function getMissingFields(model: Model): string[] {
  const missingFields: string[] = [];

  if (!model.name) missingFields.push('name');
  if (!model.provider) missingFields.push('provider');
  if (!model.domain) missingFields.push('domain');
  if (!model.description) missingFields.push('description');
  if (!model.parameters && (model.domain === 'LLM' || model.domain === 'VLM' || model.domain === 'ImageGen')) missingFields.push('parameters');
  if (!model.context_window && (model.domain === 'LLM' || model.domain === 'VLM')) missingFields.push('context_window');
  if (!model.license) {
    missingFields.push('license');
  } else {
    if (!model.license.name || model.license.name === 'Unknown') missingFields.push('license.name');
    if (!model.license.type) missingFields.push('license.type');
    if (model.license.commercial_use === undefined) missingFields.push('license.commercial_use');
  }
  if (!model.updated_at && !model.release_date) missingFields.push('release_date');
  if (!model.tags || model.tags.length === 0) missingFields.push('tags');

  return missingFields;
}

// Database-wide validation functions

// Create validation prompt for entire database
export function createDatabaseValidationPrompt(models: Model[]): string {
  // If too many models, suggest chunking
  if (models.length > 100) {
    console.warn(`Large database (${models.length} models) may hit API limits. Consider processing in batches.`);
  }

  const csvData = convertModelsToCSV(models);

  // Calculate approximate token count (rough estimate: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil(csvData.length / 4);

  if (estimatedTokens > 100000) {
    throw new Error(`Database too large (est. ${estimatedTokens} tokens). Please validate in smaller batches or contact support for enterprise processing.`);
  }

  return `You are an AI model database expert. I'm providing you with my AI model database in CSV format for enrichment and validation.

⚠️ CRITICAL RULES:
1. **PRESERVE ALL MODELS** - You MUST return ALL ${models.length} models in your response
2. **ONLY FILL BLANKS** - Only update fields that are empty or contain "Unknown"
3. **DO NOT REMOVE MODELS** - Every model in the input MUST appear in the output
4. **DO NOT GUESS** - If you don't know accurate information, leave the field as is or mark "Unknown"
5. **USE WEB SEARCH** - For missing dates, parameters, or other facts, search for official sources

TASK: Enrich this database by filling in ONLY the missing information:

**PRIORITY FIELDS TO FILL:**
- **release_date**: Find official announcement/launch date (YYYY-MM-DD format)
  * Search for: "[model name] release date", "[model name] announcement", "[model name] launch"
  * Verify with official blog posts, research papers, press releases
  * Cross-check at least 2 sources before adding
- **parameters**: Model size (e.g., "7B", "70B", "1.3B", "405B")
- **context_window**: For LLMs (e.g., "4k", "8k", "32k", "128k", "200k")
- **provider**: ACTUAL creator/publisher (NOT "HuggingFace" or "Replicate")
- **description**: Brief, accurate description of capabilities
- **license_name**: Exact license name (e.g., "Apache-2.0", "MIT", "Llama 3 Community License")
- **commercial_use**: true/false based on actual license terms

**VALIDATION APPROACH:**
1. Scan each row for empty fields
2. For each empty field, search for accurate information
3. Only update if you find reliable, verifiable data
4. Keep existing data unless it's clearly wrong
5. Return ALL ${models.length} models with enriched data

DATABASE (${models.length} models):
${csvData}

**OUTPUT FORMAT:**
Return ONLY the complete CSV with ALL ${models.length} models.
- Same column structure as input
- Same row count as input (${models.length} rows + header)
- Only empty fields should be filled
- No explanations, just the CSV data

Begin CSV output now:`;
}

// Convert models array to CSV for GPT processing
export function convertModelsToCSV(models: Model[]): string {
  const headers = [
    'id', 'name', 'provider', 'domain', 'source', 'url', 'repo',
    'license_name', 'license_type', 'commercial_use', 'attribution_required',
    'share_alike', 'copyleft', 'parameters', 'context_window', 'description',
    'pricing_flat', 'pricing_input', 'pricing_output', 'pricing_currency',
    'pricing_unit', 'pricing_notes', 'release_date', 'updated_at',
    'downloads', 'tags', 'indemnity', 'data_provenance'
  ];

  const rows = models.map(model => [
    model.id || '',
    model.name || '',
    model.provider || '',
    model.domain || '',
    model.source || '',
    model.url || '',
    model.repo || '',
    model.license?.name || '',
    model.license?.type || '',
    model.license?.commercial_use ? 'true' : 'false',
    model.license?.attribution_required ? 'true' : 'false',
    model.license?.share_alike ? 'true' : 'false',
    model.license?.copyleft ? 'true' : 'false',
    model.parameters || '',
    model.context_window || '',
    model.description || '',
    model.pricing?.[0]?.flat?.toString() || '',
    model.pricing?.[0]?.input?.toString() || '',
    model.pricing?.[0]?.output?.toString() || '',
    model.pricing?.[0]?.currency || '',
    model.pricing?.[0]?.unit || '',
    model.pricing?.[0]?.notes || '',
    model.release_date || '',
    model.updated_at || '',
    model.downloads?.toString() || '',
    model.tags?.join(';') || '',
    model.indemnity || '',
    model.data_provenance || ''
  ]);

  const csvContent = [headers.join(','), ...rows.map(row =>
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  )].join('\n');

  return csvContent;
}

// Parse CSV response from GPT back to models
export function parseCSVToModels(csvData: string): Model[] {
  try {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV parsing: Less than 2 lines found');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const models: Model[] = [];

    console.log(`CSV parsing: Found ${lines.length - 1} data rows with ${headers.length} columns`);

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);

        // More lenient: allow slight column mismatch
        if (values.length === 0) {
          console.warn(`CSV parsing: Row ${i} is empty, skipping`);
          continue;
        }

        if (Math.abs(values.length - headers.length) > 3) {
          console.warn(`CSV parsing: Row ${i} has ${values.length} columns, expected ${headers.length}, skipping`);
          continue;
        }

        const modelData: any = {};
        headers.forEach((header, index) => {
          modelData[header] = values[index]?.replace(/"/g, '').trim() || '';
        });

        // Skip rows without essential fields
        if (!modelData.id && !modelData.name) {
          console.warn(`CSV parsing: Row ${i} missing both id and name, skipping`);
          continue;
        }

        // Convert back to Model structure
        const model: Model = {
          id: modelData.id || modelData.name || `model_${i}`,
          name: modelData.name || modelData.id || 'Unknown',
          provider: modelData.provider || null,
          domain: modelData.domain as any || 'Other',
          source: modelData.source || '',
          url: modelData.url || null,
          repo: modelData.repo || null,
          license: {
            name: modelData.license_name || 'Unknown',
            type: modelData.license_type as any || 'Custom',
            commercial_use: modelData.commercial_use === 'true',
            attribution_required: modelData.attribution_required === 'true',
            share_alike: modelData.share_alike === 'true',
            copyleft: modelData.copyleft === 'true'
          },
          pricing: [],
          parameters: modelData.parameters || null,
          context_window: modelData.context_window || null,
          description: modelData.description || null,
          release_date: modelData.release_date || null,
          updated_at: modelData.updated_at || null,
          downloads: modelData.downloads ? parseInt(modelData.downloads) : null,
          tags: modelData.tags ? modelData.tags.split(';').filter(Boolean) : [],
          indemnity: modelData.indemnity as any || 'None',
          data_provenance: modelData.data_provenance || null,
          hosting: {
            weights_available: true,
            api_available: false,
            on_premise_friendly: true
          }
        };

        // Reconstruct pricing if available
        if (modelData.pricing_flat || modelData.pricing_input || modelData.pricing_output) {
          model.pricing = [{
            flat: modelData.pricing_flat ? parseFloat(modelData.pricing_flat) : null,
            input: modelData.pricing_input ? parseFloat(modelData.pricing_input) : null,
            output: modelData.pricing_output ? parseFloat(modelData.pricing_output) : null,
            currency: modelData.pricing_currency || null,
            unit: modelData.pricing_unit || null,
            notes: modelData.pricing_notes || null,
            model: null,
            url: null
          }];
        }

        models.push(model);
      } catch (rowError) {
        console.error(`CSV parsing: Error parsing row ${i}:`, rowError);
        continue;
      }
    }

    console.log(`CSV parsing: Successfully parsed ${models.length} models`);
    return models;
  } catch (error) {
    console.error('CSV parsing: Fatal error:', error);
    return [];
  }
}

// Helper function to parse CSV line properly handling quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current);
  return result;
}

export type JsonSchemaDefinition = Readonly<Record<string, unknown>>;

export type StructuredOutputDefinition = {
  /** Stable internal name used to identify the requested output shape. */
  name: string;
  description?: string;
  schema: JsonSchemaDefinition;
};

export type AiGenerationOptions = {
  /** Sampling temperature passed through when supported by the provider. */
  temperature?: number;
  /** Upper bound for generated output when supported by the provider. */
  maxOutputTokens?: number;
};

export type StructuredGenerationRequest = {
  systemInstruction: string;
  userInstruction: string;
  output: StructuredOutputDefinition;
  options?: AiGenerationOptions;
};

export type StructuredGenerationResult = {
  /** Provider-neutral parsed output. Domain services remain responsible for validation. */
  output: unknown;
};

export interface AiGenerationProvider {
  generateStructured(request: StructuredGenerationRequest): Promise<StructuredGenerationResult>;
}

export type AiGenerationFailureKind =
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN';

export class AiGenerationProviderError extends Error {
  constructor(
    message: string,
    readonly failureKind: AiGenerationFailureKind,
    readonly retryable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AiGenerationProviderError';
  }
}

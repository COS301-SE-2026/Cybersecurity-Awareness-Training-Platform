export interface ValidationErrorDetailDto {
  field: string;
  message: string;
}

export interface ApiErrorResponseDto {
  error: string;
  message?: string;
  fields?: string[];
  details?: ValidationErrorDetailDto[];
}

export interface SuccessResponseDto {
  success: true;
}

export interface PaginationMetadataDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

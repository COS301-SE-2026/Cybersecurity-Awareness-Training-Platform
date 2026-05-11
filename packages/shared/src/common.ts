export type Id = string;
export type IsoDateTimeString = string;

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

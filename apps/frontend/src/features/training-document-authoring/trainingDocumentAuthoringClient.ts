import type {
  PreviewTrainingDocumentRequestDto,
  PreviewTrainingDocumentResponseDto,
  TrainingDocuemtnDraftInputDto,
  TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';
import {
  activateTrainingDocumentDraft,
  copyTrainingDocument,
  createTrainingDocumentDraft,
  getTrainingDocumentForAuthoring,
  previewTrainingDocumentMarkdown,
  updateTrainingDocumentDraft,
  type TrainingDocumentAuthoringContext,
} from '../../lib/trainingApi';

export interface TrainingDocumentAuthoringClient {
  createDraft(
    context: TrainingDocumentAuthoringContext,
    input: TrainingDocuemtnDraftInputDto,
  ): Promise<TrainingDocumentAuthoringResponseDto>;
  getDocument(
    context: TrainingDocumentAuthoringContext,
    trainingDocumentId: string,
  ): Promise<TrainingDocumentAuthoringResponseDto>;
  updateDraft(
    context: TrainingDocumentAuthoringContext,
    trainingDocumentId: string,
    input: TrainingDocuemtnDraftInputDto,
  ): Promise<TrainingDocumentAuthoringResponseDto>;
  preview(
    context: TrainingDocumentAuthoringContext,
    input: PreviewTrainingDocumentRequestDto,
  ): Promise<PreviewTrainingDocumentResponseDto>;
  activate(
    context: TrainingDocumentAuthoringContext,
    trainingDocumentId: string,
  ): Promise<TrainingDocumentAuthoringResponseDto>;
  copy(
    context: TrainingDocumentAuthoringContext,
    trainingDocumentId: string,
  ): Promise<TrainingDocumentAuthoringResponseDto>;
}

export const apiTrainingDocumentAuthoringClient: TrainingDocumentAuthoringClient = {
  createDraft: createTrainingDocumentDraft,
  getDocument: getTrainingDocumentForAuthoring,
  updateDraft: updateTrainingDocumentDraft,
  preview: previewTrainingDocumentMarkdown,
  activate: activateTrainingDocumentDraft,
  copy: copyTrainingDocument,
};

import {
  type PreviewTrainingDocumentRequestDto,
  type TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import type { Request, Response } from 'express';
import * as ContentLifecycleService from '../services/content-lifecycle.service.js';

function actor(req: Request): ContentLifecycleService.UserActorContext {
  if (req.auth === undefined) {
    throw new ContentLifecycleService.ContentLifecycleServiceError(
      401,
      'UNAUTHORIZED',
      'Authentication is required',
    );
  }
  return { userId: req.auth.userId, userType: req.auth.user.userType };
}

export async function createTrainingDocumentDraftHandler(req: Request, res: Response) {
  const organisationId = req.params.organisationId;
  const document = await ContentLifecycleService.createTrainingDocumentDraft(
    actor(req),
    organisationId === undefined ? null : String(organisationId),
    req.body as TrainingDocuemtnDraftInputDto,
  );
  return res.status(201).json(document);
}

export async function getTrainingDocumentAuthoringHandler(req: Request, res: Response) {
  const organisationId = req.params.organisationId;
  const document = await ContentLifecycleService.getTrainingDocumentAuthoring(
    actor(req),
    String(req.params.trainingDocumentId),
    organisationId === undefined ? null : String(organisationId),
  );
  return res.status(200).json(document);
}

export async function listTrainingDocumentsAuthoringHandler(req: Request, res: Response) {
  const documents = await ContentLifecycleService.listTrainingDocumentsForAuthoring(
    actor(req),
    String(req.params.organisationId),
  );
  return res.status(200).json(documents);
}

export async function updateTrainingDocumentDraftHandler(req: Request, res: Response) {
  const organisationId = req.params.organisationId;
  const document = await ContentLifecycleService.editTrainingDocumentDraft(
    actor(req),
    String(req.params.trainingDocumentId),
    organisationId === undefined ? null : String(organisationId),
    req.body as TrainingDocuemtnDraftInputDto,
  );
  return res.status(200).json(document);
}

export async function activateTrainingDocumentHandler(req: Request, res: Response) {
  const orgId = req.params.organisationId;
  const document = await ContentLifecycleService.activateTrainingDocumentForAuthoring(
    actor(req),
    String(req.params.trainingDocumentId),
    orgId === undefined ? null : String(orgId),
  );
  return res.status(200).json(document);
}

export async function archiveTrainingDocumentHandler(req: Request, res: Response) {
  const organisationId = req.params.organisationId;
  const document = await ContentLifecycleService.archiveTrainingDocumentForAuthoring(
    actor(req),
    String(req.params.trainingDocumentId),
    organisationId === undefined ? null : String(organisationId),
  );
  return res.status(200).json(document);
}

export async function unarchiveTrainingDocumentHandler(req: Request, res: Response) {
  const organisationId = req.params.organisationId;
  const document = await ContentLifecycleService.unarchiveTrainingDocumentForAuthoring(
    actor(req),
    String(req.params.trainingDocumentId),
    organisationId === undefined ? null : String(organisationId),
  );
  return res.status(200).json(document);
}

export async function copyTrainingDocumentHandler(req: Request, res: Response) {
  const orgId = req.params.organisationId;
  const document = await ContentLifecycleService.copyTrainingDocumentForAuthoring(
    actor(req),
    String(req.params.trainingDocumentId),
    orgId === undefined ? null : String(orgId),
  );
  return res.status(201).json(document);
}

export async function previewTrainingDocumentHandler(req: Request, res: Response) {
  const orgId = req.params.organisationId;
  const preview = await ContentLifecycleService.previewTrainingDocumentMarkdown(
    actor(req),
    orgId === undefined ? null : String(orgId),
    (req.body as PreviewTrainingDocumentRequestDto).rawMarkdown,
  );
  return res.status(200).set('Cache-Control', 'no-store').json(preview);
}

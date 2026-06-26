import type { Request, Response } from 'express';
import {
  createOrganisationRegistrationRequest,
  OrganisationRegistrationRequestError,
} from '../services/organisation-registration-request.service.js';

export async function submitOrganisationRegistrationRequest(req: Request, res: Response) {
  try {
    const response = await createOrganisationRegistrationRequest(req.body);
    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof OrganisationRegistrationRequestError) {
      return res.status(error.statusCode).json({
        error: error.error,
        message: error.message,
      });
    }

    throw error;
  }
}

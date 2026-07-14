import type { Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';
import {
  acceptInvitation,
  getInvitationContext,
  rejectInvitation,
} from '../../../src/controllers/invitation.controller.js';

const { invitationServiceMock, authTokenServiceMock, authSessionServiceMock, authServiceMock } =
  vi.hoisted(() => {
    class MockInvitationFlowError extends Error {
      constructor(
        public readonly statusCode: number,
        public readonly errorKey: string,
        message: string,
      ) {
        super(message);
        this.name = 'InvitationFlowError';
      }
    }

    return {
      invitationServiceMock: {
        InvitationFlowError: MockInvitationFlowError,
        getInvitationTokenContext: vi.fn(),
        acceptInvitationWithToken: vi.fn(),
        rejectInvitationWithToken: vi.fn(),
      },
      authTokenServiceMock: {
        verifyAuthToken: vi.fn(),
      },
      authSessionServiceMock: {
        validateAuthSession: vi.fn(),
      },
      authServiceMock: {
        getCurrentUser: vi.fn(),
      },
    };
  });

vi.mock('../../../src/services/invitation.service.js', () => invitationServiceMock);
vi.mock('../../../src/services/auth-token.service.js', () => authTokenServiceMock);
vi.mock('../../../src/services/auth-session.service.js', () => authSessionServiceMock);
vi.mock('../../../src/services/auth.service.js', () => authServiceMock);

const validToken = 'ValidInvitationTokenWithMoreThan32CharactersRightHere';
const contextPath = `/invitations/token/${validToken}/context`;
const acceptPath = `/invitations/token/${validToken}/accept`;
const rejectPath = `/invitations/token/${validToken}/reject`;

describe('invitation controller and routes', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Controller Unit Tests (Direct Handler Calls)', () => {
    function mockResponse() {
      const res: Partial<Response> = {};
      res.status = vi.fn().mockReturnValue(res);
      res.json = vi.fn().mockReturnValue(res);
      return res as Response;
    }

    it('getInvitationContext controller calls service with token and auth email and returns 200', async () => {
      const req = {
        params: { token: validToken },
        auth: { user: { email: 'trainee@example.com' } },
      } as unknown as Request;
      const res = mockResponse();

      invitationServiceMock.getInvitationTokenContext.mockResolvedValue({
        invitationType: 'ORGANISATION_TRAINEE',
        targetEmail: 'trainee@example.com',
        roleGranted: 'ORGANISATION_TRAINEE',
        status: 'PENDING',
      });

      await getInvitationContext(req, res);

      expect(invitationServiceMock.getInvitationTokenContext).toHaveBeenCalledWith(
        validToken,
        'trainee@example.com',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ invitationType: 'ORGANISATION_TRAINEE' }),
      );
    });

    it('acceptInvitation controller passes ip and user-agent to service and returns 200', async () => {
      const req = {
        params: { token: validToken },
        body: { confirmRoleChange: true },
        auth: { user: { email: 'trainee@example.com' } },
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
        header: vi.fn().mockImplementation((header: string) => {
          if (header.toLowerCase() === 'user-agent') return 'Unit-Test-Agent';
          return undefined;
        }),
      } as unknown as Request;
      const res = mockResponse();

      invitationServiceMock.acceptInvitationWithToken.mockResolvedValue({
        success: true,
        message: 'Invitation accepted successfully.',
      });

      await acceptInvitation(req, res);

      expect(invitationServiceMock.acceptInvitationWithToken).toHaveBeenCalledWith(
        validToken,
        { confirmRoleChange: true },
        'trainee@example.com',
        '10.0.0.1',
        'Unit-Test-Agent',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Invitation accepted successfully.',
      });
    });

    it('rejectInvitation controller passes rejectionReason and returns 200', async () => {
      const req = {
        params: { token: validToken },
        body: { rejectionReason: 'No longer available' },
        auth: undefined,
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' },
        header: vi.fn(),
      } as unknown as Request;
      const res = mockResponse();

      invitationServiceMock.rejectInvitationWithToken.mockResolvedValue({
        success: true,
        message: 'Invitation rejected successfully.',
      });

      await rejectInvitation(req, res);

      expect(invitationServiceMock.rejectInvitationWithToken).toHaveBeenCalledWith(
        validToken,
        { rejectionReason: 'No longer available' },
        undefined,
        '10.0.0.1',
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Invitation rejected successfully.',
      });
    });
  });

  describe('Route & Middleware Integration Tests (Supertest)', () => {
    describe('GET /invitations/token/:token/context', () => {
      it('returns 200 with invitation context on success', async () => {
        invitationServiceMock.getInvitationTokenContext.mockResolvedValue({
          invitationType: 'ORGANISATION_TRAINEE',
          targetEmail: 'trainee@example.com',
          organisationId: 'org-1',
          organisationName: 'Acme Corp',
          roleGranted: 'ORGANISATION_TRAINEE',
          accountExists: true,
          requiresLogin: true,
          requiresSetup: false,
          status: 'PENDING',
          expiresAt: new Date().toISOString(),
        });

        const res = await request(app).get(contextPath);
        expect(res.status).toBe(200);
        expect(res.body.invitationType).toBe('ORGANISATION_TRAINEE');
      });

      it('returns 400 when token param is invalid according to Zod schema', async () => {
        const res = await request(app).get('/invitations/token/short/context');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });

      it('returns 403 when InvitationFlowError is thrown for AUTH_USER_MISMATCH', async () => {
        invitationServiceMock.getInvitationTokenContext.mockRejectedValue(
          new invitationServiceMock.InvitationFlowError(
            403,
            'AUTH_USER_MISMATCH',
            'Logged in user mismatch',
          ),
        );

        const res = await request(app).get(contextPath);
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('AUTH_USER_MISMATCH');
      });
    });

    describe('POST /invitations/token/:token/accept', () => {
      it('returns 200 on successful acceptance', async () => {
        invitationServiceMock.acceptInvitationWithToken.mockResolvedValue({
          success: true,
          message: 'Invitation accepted successfully.',
        });

        const res = await request(app).post(acceptPath).send({ confirmRoleChange: true });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('extracts logged in user when Bearer token is provided', async () => {
        authTokenServiceMock.verifyAuthToken.mockReturnValue({
          userId: 'user-1',
          authSessionId: 'session-1',
        });
        authSessionServiceMock.validateAuthSession.mockResolvedValue({
          state: 'ACTIVE',
          session: { userId: 'user-1' },
        });
        authServiceMock.getCurrentUser.mockResolvedValue({
          user: { id: 'user-1', email: 'trainee@example.com' },
        });
        invitationServiceMock.acceptInvitationWithToken.mockResolvedValue({
          success: true,
          message: 'Accepted',
        });

        await request(app).post(acceptPath).set('Authorization', 'Bearer valid-jwt-token').send({});

        expect(invitationServiceMock.acceptInvitationWithToken).toHaveBeenCalledWith(
          validToken,
          expect.any(Object),
          'trainee@example.com',
          expect.stringContaining('127.0.0.1'),
          undefined,
        );
      });

      it('returns 400 when accept body has extra unexpected keys due to strict validation', async () => {
        const res = await request(app).post(acceptPath).send({ unexpectedKey: 'hacked' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /invitations/token/:token/reject', () => {
      it('returns 200 on successful rejection', async () => {
        invitationServiceMock.rejectInvitationWithToken.mockResolvedValue({
          success: true,
          message: 'Invitation rejected successfully.',
        });

        const res = await request(app).post(rejectPath).send({ rejectionReason: 'Not interested' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});

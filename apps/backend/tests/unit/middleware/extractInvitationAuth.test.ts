import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractInvitationAuth } from '../../../src/middleware/extractInvitationAuth.js';

const { authServiceMock, authTokenServiceMock, authSessionServiceMock } = vi.hoisted(() => ({
  authServiceMock: {
    getCurrentUser: vi.fn(),
  },
  authTokenServiceMock: {
    verifyAuthToken: vi.fn(),
  },
  authSessionServiceMock: {
    validateAuthSession: vi.fn(),
  },
}));

vi.mock('../../../src/services/auth.service.js', () => authServiceMock);
vi.mock('../../../src/services/auth-token.service.js', () => authTokenServiceMock);
vi.mock('../../../src/services/auth-session.service.js', () => authSessionServiceMock);

describe('extractInvitationAuth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      header: vi.fn(),
      auth: undefined,
    };
    mockRes = {};
    mockNext = vi.fn();
  });

  it('proceeds with req.auth undefined when authorization header is missing', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('proceeds with req.auth undefined when scheme is not Bearer or token is empty', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Basic abc123');

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);
    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);

    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Bearer ');
    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);
    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('proceeds with req.auth undefined when token verification returns null', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Bearer invalid-token');
    authTokenServiceMock.verifyAuthToken.mockReturnValue(null);

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('proceeds with req.auth undefined when auth session is not active or userId mismatches', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Bearer valid-token');
    authTokenServiceMock.verifyAuthToken.mockReturnValue({
      authSessionId: 'sess-1',
      userId: 'user-1',
    });

    authSessionServiceMock.validateAuthSession.mockResolvedValueOnce({
      state: 'REVOKED',
      session: { userId: 'user-1' },
    });

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);
    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);

    authSessionServiceMock.validateAuthSession.mockResolvedValueOnce({
      state: 'ACTIVE',
      session: { userId: 'diff-user' },
    });

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);
    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(2);
  });

  it('proceeds with req.auth undefined when validateAuthSession or getCurrentUser throws', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Bearer valid-token');
    authTokenServiceMock.verifyAuthToken.mockReturnValue({
      authSessionId: 'sess-1',
      userId: 'user-1',
    });

    authSessionServiceMock.validateAuthSession.mockRejectedValueOnce(new Error('DB failure'));

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);
    expect(mockReq.auth).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('attaches req.auth and calls next when token and session are active and valid', async () => {
    (mockReq.header as unknown as ReturnType<typeof vi.fn>).mockReturnValue('Bearer valid-token');
    authTokenServiceMock.verifyAuthToken.mockReturnValue({
      authSessionId: 'sess-1',
      userId: 'user-1',
    });

    authSessionServiceMock.validateAuthSession.mockResolvedValue({
      state: 'ACTIVE',
      session: { userId: 'user-1' },
    });

    authServiceMock.getCurrentUser.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    await extractInvitationAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.auth).toEqual({
      userId: 'user-1',
      user: { id: 'user-1', email: 'user@example.com' },
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});

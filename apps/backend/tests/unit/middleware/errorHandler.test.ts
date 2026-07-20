import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../src/middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('delegates to next if headersSent is true', () => {
    mockRes.headersSent = true;
    const err = new Error('Already sent');
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(err);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('uses statusCode property if status is not a number', () => {
    const err = { statusCode: 400, error: 'BAD_REQUEST', message: 'Invalid data' };
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'BAD_REQUEST',
      message: 'Invalid data',
    });
  });

  it('returns default message when non-500 error lacks a valid string message', () => {
    const err = { status: 404, error: 'NOT_FOUND', message: null };
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'NOT_FOUND',
      message: 'An unexpected error occurred',
    });
  });

  it('logs and masks internal errors (status >= 500)', () => {
    const err = { status: 500, error: 'DB_ERROR', message: 'Secret SQL query details' };
    errorHandler(err, mockReq as Request, mockRes as Response, mockNext);

    expect(console.error).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'DB_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  it('handles primitive err types gracefully', () => {
    errorHandler('some string error', mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
});

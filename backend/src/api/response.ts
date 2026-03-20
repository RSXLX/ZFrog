import { Request, Response } from 'express';
import { ApiErrorBody, ApiErrorResponse, ApiMeta, ApiSuccessResponse } from '../types/api';
import { getOrCreateRequestId } from '../utils/request-id';

const createMeta = (req: Request, extra?: Record<string, unknown>): ApiMeta => ({
  requestId: getOrCreateRequestId(req),
  timestamp: new Date().toISOString(),
  ...(extra || {}),
});

export const buildSuccessResponse = <T>(
  req: Request,
  data: T,
  extraMeta?: Record<string, unknown>
): ApiSuccessResponse<T> => ({
  success: true,
  data,
  meta: createMeta(req, extraMeta),
});

export const buildErrorResponse = (
  req: Request,
  error: ApiErrorBody,
  extraMeta?: Record<string, unknown>
): ApiErrorResponse => ({
  success: false,
  error,
  meta: createMeta(req, extraMeta),
});

export const respondSuccess = <T>(
  req: Request,
  res: Response,
  data: T,
  statusCode = 200,
  extraMeta?: Record<string, unknown>
): Response => res.status(statusCode).json(buildSuccessResponse(req, data, extraMeta));

export const respondError = (
  req: Request,
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
  extraMeta?: Record<string, unknown>
): Response =>
  res
    .status(statusCode)
    .json(buildErrorResponse(req, { code, message, ...(details !== undefined ? { details } : {}) }, extraMeta));

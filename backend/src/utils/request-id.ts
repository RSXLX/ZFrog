import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const normalizeRequestId = (value?: string | string[]): string | undefined => {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) {
    return undefined;
  }
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const getOrCreateRequestId = (req: Request): string => {
  if (req.requestId) {
    return req.requestId;
  }
  return randomUUID();
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingRequestId = normalizeRequestId(req.header(REQUEST_ID_HEADER));
  req.requestId = incomingRequestId ?? randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
};

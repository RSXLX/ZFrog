import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler';
import {
  AuthenticatedIntegrationContext,
  IntegrationPermissionValue,
  integrationRegistryService,
} from '../platform/integrations/integration-registry.service';
import { V3IntegrationErrorCodes } from '../types/api';
import {
  V3ModuleAction,
  V3RuntimeModuleCapability,
  buildV3ModuleCapabilities,
  hasV3ModuleCapability,
} from '../platform/runtime/v3-access-control.service';
import { V3RuntimeModule } from '../platform/runtime/v3-runtime.service';

declare global {
  namespace Express {
    interface Request {
      v3Integration?: AuthenticatedIntegrationContext & {
        moduleCapabilities: V3RuntimeModuleCapability[];
      };
    }
  }
}

interface V3IntegrationAuthOptions {
  permission?: IntegrationPermissionValue;
  module?: V3RuntimeModule;
  action?: V3ModuleAction;
}

const getHeaderValue = (value: string | string[] | undefined): string | null => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (typeof normalized !== 'string') {
    return null;
  }

  const trimmed = normalized.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractIntegrationApiKey = (req: Request): string | null => {
  const fromHeader = getHeaderValue(req.headers['x-api-key']);
  if (fromHeader) {
    return fromHeader;
  }

  const authorization = getHeaderValue(req.headers.authorization);
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const secret = authorization.slice('Bearer '.length).trim();
  return secret.length > 0 ? secret : null;
};

const assertRequiredPermission = (
  integration: AuthenticatedIntegrationContext,
  permission: IntegrationPermissionValue
): void => {
  if (integration.permissions.includes(permission)) {
    return;
  }

  throw new AppError(
    403,
    `integration does not grant ${permission}`,
    V3IntegrationErrorCodes.INTEGRATION_PERMISSION_DENIED,
    {
      requiredPermission: permission,
      grantedPermissions: integration.permissions,
      appId: integration.app.id,
      keyId: integration.key.id,
    }
  );
};

const assertRequiredCapability = (
  capabilities: V3RuntimeModuleCapability[],
  module: V3RuntimeModule,
  action: V3ModuleAction
): void => {
  if (hasV3ModuleCapability(capabilities, module, action)) {
    return;
  }

  throw new AppError(
    403,
    `integration does not grant ${module}.${action}`,
    V3IntegrationErrorCodes.INTEGRATION_PERMISSION_DENIED,
    {
      module,
      action,
      capabilities,
    }
  );
};

export const v3IntegrationAuthRequired =
  (options: V3IntegrationAuthOptions = {}) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const secret = extractIntegrationApiKey(req);
    if (!secret) {
      next(
        new AppError(
          401,
          'integration api key is required',
          V3IntegrationErrorCodes.INTEGRATION_API_KEY_REQUIRED
        )
      );
      return;
    }

    void (async () => {
      const integration = await integrationRegistryService.authenticateKey(secret);
      const moduleCapabilities = buildV3ModuleCapabilities(integration.permissions);

      if (options.permission) {
        assertRequiredPermission(integration, options.permission);
      }

      if (options.module && options.action) {
        assertRequiredCapability(moduleCapabilities, options.module, options.action);
      }

      req.v3Integration = {
        ...integration,
        moduleCapabilities,
      };

      next();
    })().catch(next);
  };

export const getV3IntegrationAccess = (
  req: Request
): (AuthenticatedIntegrationContext & { moduleCapabilities: V3RuntimeModuleCapability[] }) => {
  if (!req.v3Integration) {
    throw new AppError(
      500,
      'v3 integration access context missing',
      'INTERNAL_ERROR'
    );
  }

  return req.v3Integration;
};

import { EAgentResponseType } from '../enums';
import { IAgentResponse, IAgentSchema } from '../interfaces';

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

export function isValidAgentResponse(value: unknown): value is IAgentResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.actions) || typeof response.finished !== 'boolean') return false;

  return response.actions.every(action => {
    if (!action || typeof action !== 'object') return false;
    const candidate = action as Record<string, unknown>;

    switch (candidate.type) {
      case EAgentResponseType.TEXT:
        return typeof candidate.text === 'string';
      case EAgentResponseType.FUNCTION:
        return typeof candidate.functionName === 'string'
          && !!candidate.paramsToPass
          && typeof candidate.paramsToPass === 'object'
          && !Array.isArray(candidate.paramsToPass);
      case EAgentResponseType.AGENT:
        return typeof candidate.name === 'string' && typeof candidate.specialInstructions === 'string';
      default:
        return false;
    }
  });
}

export function validateAgentHierarchy(schema: IAgentSchema): void {
  const MAX_HIERARCHY_LEVEL = 2;

  function calculateHierarchyDepth(schema: IAgentSchema): number {
    if (!schema.children || schema.children.length === 0) {
      return 1;
    }

    const subAgentDepths = schema.children.map(subAgent => calculateHierarchyDepth(subAgent));
    return Math.max(...subAgentDepths) + 1;
  }

  const hierarchyDepth = calculateHierarchyDepth(schema);
  if (hierarchyDepth > MAX_HIERARCHY_LEVEL) {
    throw new AgentValidationError(
      `Agent hierarchy exceeds maximum allowed depth of ${MAX_HIERARCHY_LEVEL}. Current depth: ${hierarchyDepth}`
    );
  }
}

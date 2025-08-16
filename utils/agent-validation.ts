import { IAgentSchema } from '../interfaces';

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentValidationError';
  }
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
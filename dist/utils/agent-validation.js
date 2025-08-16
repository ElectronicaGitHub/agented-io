"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentValidationError = void 0;
exports.validateAgentHierarchy = validateAgentHierarchy;
class AgentValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AgentValidationError';
    }
}
exports.AgentValidationError = AgentValidationError;
function validateAgentHierarchy(schema) {
    const MAX_HIERARCHY_LEVEL = 2;
    function calculateHierarchyDepth(schema) {
        if (!schema.children || schema.children.length === 0) {
            return 1;
        }
        const subAgentDepths = schema.children.map(subAgent => calculateHierarchyDepth(subAgent));
        return Math.max(...subAgentDepths) + 1;
    }
    const hierarchyDepth = calculateHierarchyDepth(schema);
    if (hierarchyDepth > MAX_HIERARCHY_LEVEL) {
        throw new AgentValidationError(`Agent hierarchy exceeds maximum allowed depth of ${MAX_HIERARCHY_LEVEL}. Current depth: ${hierarchyDepth}`);
    }
}

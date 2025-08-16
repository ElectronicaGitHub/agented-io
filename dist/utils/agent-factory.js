"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMainAgentFactory = exports.createAgentFactory = void 0;
const agent_1 = require("../agent");
const main_agent_1 = require("../main-agent");
const uuid_1 = require("uuid");
const createAgentFactory = (agentSchema, parentAgent, mainAgent) => {
    const id = (0, uuid_1.v4)();
    const agent = new agent_1.Agent(id, agentSchema, parentAgent, mainAgent);
    return agent;
};
exports.createAgentFactory = createAgentFactory;
const createMainAgentFactory = (agentSchema, id) => {
    const newId = id || (0, uuid_1.v4)();
    return new main_agent_1.MainAgent(newId, agentSchema);
};
exports.createMainAgentFactory = createMainAgentFactory;

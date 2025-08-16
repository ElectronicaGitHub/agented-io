"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agent_1 = require("./agent");
const agent_type_1 = require("./enums/agent-type");
console.log('Testing ReflectionAgent import...');
try {
    const schema = {
        type: agent_type_1.EAgentType.PERMANENT,
        name: 'permanent',
        id: 'permanent',
        prompt: 'test-prompt',
        flowInstructionPrompt: '',
        children: [
            {
                id: 'context_maintainer',
                type: agent_type_1.EAgentType.WORKER,
                name: 'Context Maintainer',
                prompt: `You are a context maintainer, you will maintain the context of the conversation, and you will also be responsible for the flow of the conversation.`,
            }
        ],
    };
    const agent = new agent_1.Agent('test-agent', schema);
    console.log('✅ Successfully created ReflectionAgent instance:', agent);
    console.log('🎉 Import fix verified - no TypeError!');
}
catch (error) {
    console.error('❌ Error creating ReflectionAgent:', error.message);
    process.exit(1);
}

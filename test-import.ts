import { Agent } from './agent';
import { EAgentType } from './enums/agent-type';

console.log('Testing ReflectionAgent import...');

try {
    const schema = {
        type: EAgentType.PERMANENT,
        name: 'permanent',
        id: 'permanent',
        prompt: 'test-prompt',
        flowInstructionPrompt: '',
        children: [
        {
            id: 'context_maintainer',
            type: EAgentType.WORKER,
            name: 'Context Maintainer',
            prompt: `You are a context maintainer, you will maintain the context of the conversation, and you will also be responsible for the flow of the conversation.`,
        }],
    }
    const agent = new Agent('test-agent', schema);
    console.log('✅ Successfully created ReflectionAgent instance:', agent);
    
    console.log('🎉 Import fix verified - no TypeError!');
} catch (error: any) {
    console.error('❌ Error creating ReflectionAgent:', error.message);
    process.exit(1);
}
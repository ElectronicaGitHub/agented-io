// ANTHROPIC_API_KEY=xxx npx tsx examples/chat-cli.ts
import readline from 'readline';
import { IAgent, IAgentMessage, IMainAgent } from '../interfaces';
import { EAgentType, EAgentEvent } from '../enums';
import { createMainAgentFactory } from '../utils';

async function getAgentConfig() {
  return {
    type: EAgentType.PERMANENT,
    name: 'permanent',
    id: 'permanent',
    prompt: `You are a helpful assistant. Answer briefly and to the point.`,
    flowInstructionPrompt: `
- Be concise
- Be friendly
- If unsure, ask clarifying questions
    `.trim(),
    functions: [
      {
        name: 'sumAB',
        func: ({a, b}: {a: number, b: number}) => a + b,
        description: 'Sum of A and B',
        paramsToPass: {
          a: 'number',
          b: 'number',
        },
      },
      {
        name: 'generateSomeText',
        func: ({text}: {text: string}) => 'some text',
        description: 'Generate some text',
        // paramsToPass: {
        //   text: 'number',
        // },
      },
    ],
  };
}

function setupAgentEventHandlers(topAgent?: IAgent) {
  if (!topAgent) return;

  const logMessage = (prefix: string, response: IAgentMessage) => {
    const ts = new Date().toISOString();
    const meta = (response as any)?.metadata ? ` [in=${(response as any).metadata.inputTokens} out=${(response as any).metadata.outputTokens}]` : '';
    const type = response?.type ? ` (${response.type})` : '';
    console.log(`\n${prefix}${type}${meta} @ ${ts}`);
    if ((response as any)?.explanation) {
      console.log(`explanation: ${(response as any).explanation}`);
    }
    if ((response as any)?.functionName) {
      console.log(`function: ${(response as any).functionName}`);
    }
    if ((response as any)?.commands?.length) {
      console.log(`commands: ${JSON.stringify((response as any).commands, null, 2)}`);
    }
    console.log(response?.text || '');
  };

  topAgent.on(EAgentEvent.MAIN_RESPONSE, (response: IAgentMessage) => {
    logMessage('[Agent]', response);
    process.stdout.write('\n> ');
  });

  topAgent.on(EAgentEvent.RESPONSE, (response: IAgentMessage) => {
    logMessage('[Agent]', response);
    process.stdout.write('\n> ');
  });
}

async function main() {
  const agentConfig = await getAgentConfig();
  const mainAgent: IMainAgent = createMainAgentFactory(agentConfig, 'cli-agent');
  mainAgent.init();

  const topAgent = mainAgent.getAgent('permanent');
  setupAgentEventHandlers(topAgent);

  console.log('Agent is ready. Type your message and press Enter. Type /exit to quit.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
  rl.prompt();

  rl.on('line', (line: string) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }
    if (text === '/exit' || text === '/quit') {
      rl.close();
      return;
    }

    // Send user message to the main agent
    mainAgent.sendMessage(text, 'user');
  });

  rl.on('close', () => {
    console.log('\nBye!');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('CLI error:', err);
  process.exit(1);
});

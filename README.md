# agented-io ![NPM Version](https://img.shields.io/npm/v/agented-io)

AI Agent Framework for building intelligent agents with LLM integration, function calling, and reflection capabilities.

## Features

- 🤖 **Multi-Agent Architecture**: Support for main agents, worker agents, and reflection agents
- 🔌 **LLM Integration**: Built-in connectors for OpenAI, Anthropic Claude, and DeepSeek
- 🎯 **Function Calling**: Dynamic function execution and management
- 🧠 **Reflection Capabilities**: Agents can reflect on their own performance and improve
- 📝 **TypeScript Support**: Full TypeScript support with type definitions
- 🚀 **Modular Design**: Clean separation of concerns with modular architecture
- 🎨 **Custom Prompts**: Full control over agent behavior with custom system prompts and validation

## Documentation

- 📖 **[Custom Prompts Guide](./docs/CUSTOM_PROMPTS.md)** - Complete guide on creating custom prompts with validation
- 🔧 **[Constants Reference](./consts/README.md)** - Overview of all constants and placeholders
- 💡 **[Custom Prompt Examples](./examples/custom-prompt-example.ts)** - Code examples for custom prompts

## Installation

```bash
npm install agented-io
```

## Environment Configuration

The framework supports flexible configuration through environment variables or programmatic options. All settings can be configured via:
1. **Environment variables** (`.env` file)
2. **Programmatic options** (`IEnvOptions` passed to `MainAgent`)
3. **Default values** (built-in fallbacks)

### Configuration Priority

Settings are resolved in this order:
1. `envOptions` passed to `MainAgent` constructor
2. `process.env` environment variables
3. Default values

### Available Configuration Options

#### API Keys
```bash
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_KEY=your-openai-key
DEEPSEEK_KEY=your-deepseek-key
GROK_KEY=your-grok-key
```

#### LLM Models
```bash
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
DEEPSEEK_MODEL=deepseek-chat
GROK_MODEL=grok-beta
```

#### LLM Providers
```bash
LLM_PROVIDER=Anthropic                    # Main LLM provider
FAST_REQUEST_LLM_PROVIDER=DeepSeek        # Provider for fast requests
```

#### LLM Settings
```bash
MAX_NUMBER_OF_TRIES_IN_FLOW=5             # Max retries in agent flow
LLM_RESULT_TIMEOUT_MS=30000               # Request timeout (30 seconds)
LLM_MAX_RETRIES=3                         # Max retries for LLM requests
LLM_RETRY_DELAY_MS=1000                   # Delay between retries (1 second)
PROMPT_LAST_MESSAGES_N=15                 # Number of messages in chat history
```

#### LLM Connectors Substitute
```bash
LLM_CONNECTORS_SUBSTITUTE_OPENAI=Anthropic
LLM_CONNECTORS_SUBSTITUTE_ANTHROPIC=DeepSeek
LLM_CONNECTORS_SUBSTITUTE_DEEPSEEK=OpenAI
LLM_CONNECTORS_SUBSTITUTE_GROK=Anthropic
```

#### Agent Settings
```bash
IS_USE_SCHEDULED_REFLECTION=true          # Enable scheduled reflection
DEFAULT_WORK_TIMEOUT=60000                # Default work timeout (60 seconds)
DEFAULT_PING_INTERVAL=10000               # Ping interval (10 seconds)
MAX_RETRY_COUNT=3                         # Max retry count for agent operations
RETRY_BACKOFF_MULTIPLIER=1.5              # Backoff multiplier for retries

ADD_ERRORS_TO_MESSAGES=true               # Add errors to messages
```

#### Debug Settings
```bash
LOG_PROMPT=false                          # Log prompts to console
LOG_RESPONSE=false                        # Log LLM responses to console
```

### Programmatic Configuration

You can override any environment variable by passing `IEnvOptions` to the `MainAgent` constructor:

```typescript
import { MainAgent, IAgentSchema, IEnvOptions, ELLMProvider } from 'agented-io';

const customEnvOptions: IEnvOptions = {
  // API Keys
  ANTHROPIC_API_KEY: 'your-custom-key',
  
  // LLM Models
  ANTHROPIC_MODEL: 'claude-sonnet-4-20250514',
  OPENAI_MODEL: 'gpt-4o',
  DEEPSEEK_MODEL: 'deepseek-chat',
  
  // LLM Settings
  LLM_PROVIDER: ELLMProvider.Anthropic,
  FAST_REQUEST_LLM_PROVIDER: ELLMProvider.DeepSeek,
  PROMPT_LAST_MESSAGES_N: 20,              // Custom history length
  LLM_MAX_RETRIES: 5,                      // More retries
  LLM_RETRY_DELAY_MS: 2000,                // Longer delay
  
  // Agent Settings
  DEFAULT_WORK_TIMEOUT: 120000,            // 2 minutes
  IS_USE_SCHEDULED_REFLECTION: true,
  
  // Debug
  LOG_PROMPT: true,                        // Enable prompt logging
  LOG_RESPONSE: true,                      // Enable response logging
};

const agentSchema: IAgentSchema = {
  id: 'my-agent',
  type: EAgentType.PERMANENT,
  name: 'MyAgent',
  prompt: 'You are a helpful assistant.',
};

// Create agent with custom configuration
const mainAgent = new MainAgent('agent-1', agentSchema, customEnvOptions);
mainAgent.init();
```

For more examples, see [env-options-usage.ts](./examples/env-options-usage.ts).

## Quick Start

```typescript
import { DataRetrievalFunctionsPrepared } from '../agent-data/prepared-functions';
import { EAgentType, IAgentSchema, createMainAgentFactory } from 'agented-io';

// Create agent configuration
export async function getAgentConfig(): Promise<IAgentSchema> {
  return {
    // Agent type - permanent agent that stays active
    type: EAgentType.PERMANENT,
    // Agent name for identification
    name: 'permanent',
    // Unique agent identifier
    id: 'permanent',
    // Main system prompt - defines agent role and behavior
    prompt: `
You are a cryptocurrency portfolio consultant for a client. You need to consult the client on their portfolio.
Do not show sensitive information about account balances.
`,
    // Detailed instructions for agent workflow
    flowInstructionPrompt: `
## Rules:
- Communicate with the client, not too verbose, to the point, but friendly and patient
- If the client needs to see their currencies or data about them, they ask for it or hint at it in some way, then you must do it

## Available functions:
- getPortfolioData - portfolio data across all networks
- getCryptoPerformanceAnalysis - gain/loss analysis by periods (1h, 24h, 7d, 30d, 1y)
- getCoingeckoTrendingSearchesCoins - trending coins
- getFearAndGreedIndex - fear and greed index
- getCoindeskLatestSearchArticles - news
`,
    // Array of functions available to the agent
    functions: [
      ...DataRetrievalFunctionsPrepared,
    ],
  };
}

// Initialize and create agent
private async initializeAgent() {
  try {
    // Get agent configuration
    const agentConfig = await getAgentConfig();
    
    // Create main agent with factory
    this.mainAgent = createMainAgentFactory(agentConfig, 'socket-agent');
    
    // Initialize the agent
    this.mainAgent.init();

    // Find the agent by name
    const topAgent = this.mainAgent.agents.find((a: any) => a.name === 'permanent');
    
    // Setup agent event handlers
    this.setupAgentEventHandlers(topAgent);
  } catch (error) {
    console.error('Error initializing agent:', error);
  }
}
```

## Multi-Agent Architecture with Children

The framework supports creating hierarchical agent structures where a main agent can have multiple child agents (workers) that specialize in specific tasks. For more examples, see [agent-configs.ts](./examples/agent-configs.ts).

### Example 1: Crypto Analytics Agent with Children

```typescript
import { EAgentType, IAgentSchema, createMainAgentFactory } from 'agented-io';

export function getCryptoAnalyticsAgentConfig(): IAgentSchema {
  const mainPrompt = `You are a crypto analytics agent. Your role is to:
    1. Coordinate analysis between your specialized sub-agents
    2. Combine insights from market data and news
    3. Create comprehensive reports and social media posts
    4. Always include a DYOR (Do Your Own Research) disclaimer`;

  return {
    type: EAgentType.PERMANENT,
    name: 'main_analytics',
    id: 'main_analytics',
    prompt: mainPrompt,
    flowInstructionPrompt: `
      Coordinate with your child agents to gather market data and news.
      Combine their insights into comprehensive reports.
      Post updates every 4 hours using the reflection agent.
    `,
    reflections: [
      {
        type: EAgentType.REFLECTION,
        name: 'reflection',
        id: 'reflection',
        prompt: 'Analyze the data and generate a comprehensive report',
        cronInitOnStart: true,
        cronSchedule: '0 0 */4 * * *', // every 4 hours
      }
    ],
    functions: [
      {
        name: 'postToTwitter',
        func: postToTwitter,
        description: 'Post a message to Twitter',
        paramsToPass: { message: 'string' },
      },
    ],
    children: [
      {
        type: EAgentType.WORKER,
        name: 'market_data_agent',
        id: 'market_data_agent',
        prompt: `You are a crypto market data specialist. Analyze and report on:
          - Current prices and 24h changes
          - Trading volume and market dominance
          - Key technical indicators
          Present data in a clear, structured format.`,
        functions: [
          {
            name: 'getPricesForCryptoPairs',
            func: getPricesForCryptoPairs,
            description: 'Get prices for crypto pairs',
            paramsToPass: { tickers: 'string[]' },
          },
        ],
      },
      {
        type: EAgentType.WORKER,
        name: 'news_agent',
        id: 'news_agent',
        prompt: `You are a crypto news specialist. Monitor and analyze:
          - Breaking news and development updates
          - Market sentiment and regulatory news
          Summarize key points and their potential market impact.`,
        functions: [
          {
            name: 'getCryptoNews',
            func: getCryptoNews,
            description: 'Get latest crypto news',
            paramsToPass: { tickers: 'string[]' },
          },
        ],
      }
    ]
  };
}

// Initialize the multi-agent system
async function initializeMultiAgentSystem() {
  const agentConfig = getCryptoAnalyticsAgentConfig();
  const mainAgent = createMainAgentFactory(agentConfig, 'crypto-analytics');
  
  mainAgent.init();
  
  // Access main agent and children
  const main = mainAgent.agents.find(a => a.name === 'main_analytics');
  const marketAgent = mainAgent.agents.find(a => a.name === 'market_data_agent');
  const newsAgent = mainAgent.agents.find(a => a.name === 'news_agent');
  
  // Setup event handlers for all agents
  setupAgentEventHandlers(main);
  setupAgentEventHandlers(marketAgent);
  setupAgentEventHandlers(newsAgent);
}
```

**Key Benefits of Children Agents:**
- **Specialization**: Each child agent focuses on a specific domain (market data, news, etc.)
- **Parallel Processing**: Children can work simultaneously on different tasks
- **Modularity**: Easy to add/remove specialized agents without changing the main logic
- **Coordination**: Main agent orchestrates the workflow and combines results

### Example 2: Arbitrage Agent with Raydium Worker

```typescript
import { EAgentType, IAgentSchema, createMainAgentFactory } from 'agented-io';

export function getArbitrageRaydiumMeteoraAgentConfig(): IAgentSchema {
  const mainPrompt = `
    You are an arbitrage agent, you will find arbitrage opportunities between Raydium and Meteora, 
    check few pools for price diff, if found diff in price est. >1-5%, prepare and post a message to Telegram.
  `;
  
  return {
    type: EAgentType.PERMANENT,
    name: 'arbitrage_main',
    id: 'arbitrage_main',
    prompt: mainPrompt,
    flowInstructionPrompt: `
      Coordinate with your Raydium worker agent to find arbitrage opportunities.
      When opportunities are found, post alerts to Telegram.
      Run analysis every hour using the reflection agent.
    `,
    reflections: [
      {
        type: EAgentType.REFLECTION,
        name: 'reflection',
        id: 'reflection',
        prompt: 'Analyze arbitrage opportunities and generate alerts',
        cronInitOnStart: true,
        cronSchedule: '0 0 */1 * * *', // every 1 hour
      }
    ],
    functions: [
      {
        name: 'postToTelegram',
        func: postToTelegram,
        description: 'Post arbitrage alerts to Telegram',
        paramsToPass: { message: 'string' },
      },
    ],
    children: [
      {
        type: EAgentType.WORKER,
        name: 'raydium_agent',
        id: 'raydium_agent',
        prompt: `
          You are a Raydium specialist agent. Your task is to:
          - Get 10-20 pools sorted by volume
          - Randomly select 7-10 pools for analysis
          - Check price differences between Raydium and Meteora
          - Report significant arbitrage opportunities (>1-5% difference)
          - Avoid repeating the same pool analysis in recent messages
        `,
        functions: [
          {
            name: 'getRaydiumPools',
            func: getRaydiumPools,
            description: 'Get Raydium pools sorted by volume',
            paramsToPass: { limit: 'number' },
          },
          {
            name: 'comparePrices',
            func: comparePrices,
            description: 'Compare prices between Raydium and Meteora',
            paramsToPass: { poolAddress: 'string' },
          },
        ],
      },
    ],
  };
}

// Initialize arbitrage system
async function initializeArbitrageSystem() {
  const agentConfig = getArbitrageRaydiumMeteoraAgentConfig();
  const mainAgent = createMainAgentFactory(agentConfig, 'arbitrage-system');
  
  mainAgent.init();
  
  // Access main arbitrage agent and Raydium worker
  const main = mainAgent.agents.find(a => a.name === 'arbitrage_main');
  const raydiumWorker = mainAgent.agents.find(a => a.name === 'raydium_agent');
  
  // Setup event handlers
  setupAgentEventHandlers(main);
  setupAgentEventHandlers(raydiumWorker);
}
```

**This example demonstrates:**
- **Task Delegation**: Main agent delegates pool analysis to specialized Raydium worker
- **Scheduled Execution**: Reflection agent runs every hour for continuous monitoring
- **Specialized Functions**: Worker agent has access to Raydium-specific functions
- **Workflow Coordination**: Main agent coordinates the overall arbitrage detection process

## Custom Prompts

You can fully customize agent behavior by providing custom system prompts. The framework includes validation to ensure your prompts contain all required placeholders.

```typescript
import { 
  MainAgent,
  EAgentType,
  CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER,
  LAST_INPUT_FIELD_PROMPT_PLACEHOLDER,
  FUNCTIONS_FIELD_PROMPT_PLACEHOLDER,
  DYNAMIC_PROMPT_SEPARATOR,
  validateCustomPrompt,
} from 'agented.io';

const customPrompt = `
You are a specialized customer support agent.

Available Functions:
${FUNCTIONS_FIELD_PROMPT_PLACEHOLDER}

Chat History:
${CHAT_HISTORY_FIELD_PROMPT_PLACEHOLDER}

${DYNAMIC_PROMPT_SEPARATOR}

Current Input:
${LAST_INPUT_FIELD_PROMPT_PLACEHOLDER}
`;

// Validate the prompt
validateCustomPrompt(customPrompt, true);

// Create agent with custom prompt
const agent = new MainAgent('support-agent', {
  id: 'support-agent',
  name: 'SupportAgent',
  type: EAgentType.PERMANENT,
  customPrompt,
});

agent.init();
```

**Key Features:**
- ✅ **Automatic Validation**: Prompts are validated on initialization
- 📋 **Required Placeholders**: `{{chat_history}}` and `{{last_input}}` are mandatory
- ⚡ **Caching Optimization**: Use `DYNAMIC_PROMPT_SEPARATOR` to split cacheable/non-cacheable parts
- 🔧 **Full Control**: Complete customization of agent behavior
- 📚 **Template Library**: Import and modify base templates

For detailed documentation, examples, and best practices, see:
- **[Custom Prompts Guide](./docs/CUSTOM_PROMPTS.md)** - Complete documentation
- **[Custom Prompt Examples](./examples/custom-prompt-example.ts)** - Code examples

**Available Placeholders:**
All prompt placeholders are available in `consts/agent-placeholders.ts` and can be imported from `agented.io`.

## Function Definitions

### DataRetrievalFunctionsPrepared

`DataRetrievalFunctionsPrepared` - это готовый набор функций для получения данных в агентах. Представляет собой массив функций типа `IAgentFunctionDefinition[]`.

**Структура функции:**
```typescript
interface IAgentFunctionDefinition {
  func: (...args: any[]) => IFunctionExecutionResult;
  name: string;
  description: string;
  paramsToPass?: Record<string, string>;
  privateParamsToPass?: Record<string, string>;
  exampleOutput?: any;
}
```

**Available functions in the example:**
- `getPortfolioData` - gets portfolio data across all networks
- `getCryptoPerformanceAnalysis` - gain/loss analysis by periods (1h, 24h, 7d, 30d, 1y)
- `getCoingeckoTrendingSearchesCoins` - gets trending coins from CoinGecko
- `getFearAndGreedIndex` - market fear and greed index
- `getCoindeskLatestSearchArticles` - latest news from CoinDesk

**Examples of creating custom functions:**

```typescript
// Function with API request
const apiFunction: IAgentFunctionDefinition = {
  func: async (symbol: string) => {
    const response = await fetch(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`);
    const data = await response.json();
    return data;
  },
  name: 'getCryptoPrice',
  description: 'Gets current cryptocurrency price through Coinbase API',
  paramsToPass: { symbol: 'string' },
  exampleOutput: { data: { amount: '50000', currency: 'USD' } }
};

// Function with database
const dbFunction: IAgentFunctionDefinition = {
  func: async (userId: string) => {
    const user = await database.users.findById(userId);
    return { balance: user.balance, assets: user.assets };
  },
  name: 'getUserPortfolio',
  description: 'Gets user portfolio from database',
  paramsToPass: { userId: 'string' },
  privateParamsToPass: { dbConnection: 'string' },
  exampleOutput: { balance: 1000, assets: ['BTC', 'ETH'] }
};

// Function with external service
const serviceFunction: IAgentFunctionDefinition = {
  func: async (address: string) => {
    const balance = await web3Service.getBalance(address);
    return { address, balance: balance.toString() };
  },
  name: 'getWalletBalance',
  description: 'Gets wallet balance through Web3 provider',
  paramsToPass: { address: 'string' },
  exampleOutput: { address: '0x...', balance: '1.5' }
 };

const functions = [
  ...DataRetrievalFunctionsPrepared,
  apiFunction,
  dbFunction,
  serviceFunction
];
```

## License

MIT

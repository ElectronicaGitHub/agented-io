# agented-io

AI Agent Framework for building intelligent agents with LLM integration, function calling, and reflection capabilities.

## Features

- 🤖 **Multi-Agent Architecture**: Support for main agents, worker agents, and reflection agents
- 🔌 **LLM Integration**: Built-in connectors for OpenAI, Anthropic Claude, and DeepSeek
- 🎯 **Function Calling**: Dynamic function execution and management
- 🧠 **Reflection Capabilities**: Agents can reflect on their own performance and improve
- 📝 **TypeScript Support**: Full TypeScript support with type definitions
- 🚀 **Modular Design**: Clean separation of concerns with modular architecture

## Installation

```bash
npm install agented-io
```

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
Ты криптовалютный консультант на портфолио клиента, необходимо консультировать клиента по его портфолио. 
Не показывай чувствительную информацию о суммах средств на счетах.
`,
    // Detailed instructions for agent workflow
    flowInstructionPrompt: `
## Правила:
- Общаешься с клиентом, не слишком многословно, по делу, но доброжелательно и терпеливо
- Если клиенту надо посмотреть какие то его валюты или данные по ним, он об этом просит или намекает или как то еще, то ты должен это сделать

## Доступные функции:
- getPortfolioData - данные портфеля по всем сетям
- getCryptoPerformanceAnalysis - анализ gain/loss по периодам (1h, 24h, 7d, 30d, 1y)
- getCoingeckoTrendingSearchesCoins - трендовые монеты
- getFearAndGreedIndex - индекс страха и жадности
- getCoindeskLatestSearchArticles - новости
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

// Setup agent event listeners
private setupAgentEventHandlers(agent: any) {
  // Listen to agent messages
  agent.on('message', (message: string) => {
    console.log('Agent message:', message);
  });
  
  // Listen to function calls
  agent.on('functionCall', (functionName: string, args: any) => {
    console.log('Function called:', functionName, args);
  });
  
  // Listen to completion events
  agent.on('complete', (result: any) => {
    console.log('Agent completed:', result);
  });
}
```

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

**Доступные функции в примере:**
- `getPortfolioData` - получает данные портфеля по всем сетям
- `getCryptoPerformanceAnalysis` - анализ gain/loss по периодам (1h, 24h, 7d, 30d, 1y)
- `getCoingeckoTrendingSearchesCoins` - получает трендовые монеты с CoinGecko
- `getFearAndGreedIndex` - индекс страха и жадности рынка
- `getCoindeskLatestSearchArticles` - последние новости с CoinDesk

**Примеры создания собственных функций:**

```typescript
// Функция с запросом к API
const apiFunction: IAgentFunctionDefinition = {
  func: async (symbol: string) => {
    const response = await fetch(`https://api.coinbase.com/v2/prices/${symbol}-USD/spot`);
    const data = await response.json();
    return data;
  },
  name: 'getCryptoPrice',
  description: 'Получает текущую цену криптовалюты через Coinbase API',
  paramsToPass: { symbol: 'string' },
  exampleOutput: { data: { amount: '50000', currency: 'USD' } }
};

// Функция с базой данных
const dbFunction: IAgentFunctionDefinition = {
  func: async (userId: string) => {
    const user = await database.users.findById(userId);
    return { balance: user.balance, assets: user.assets };
  },
  name: 'getUserPortfolio',
  description: 'Получает портфель пользователя из базы данных',
  paramsToPass: { userId: 'string' },
  privateParamsToPass: { dbConnection: 'string' },
  exampleOutput: { balance: 1000, assets: ['BTC', 'ETH'] }
};

// Функция с внешним сервисом
const serviceFunction: IAgentFunctionDefinition = {
  func: async (address: string) => {
    const balance = await web3Service.getBalance(address);
    return { address, balance: balance.toString() };
  },
  name: 'getWalletBalance',
  description: 'Получает баланс кошелька через Web3 провайдер',
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

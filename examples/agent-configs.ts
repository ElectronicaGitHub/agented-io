import { EAgentType } from "../enums";
import { IAgentSchema } from "../interfaces";

export function getArbitrageRaydiumMeteoraAgentConfig(): IAgentSchema {
  const mainPrompt = `
    You are a arbitrage agent, you will find arbitrage opportunities between Raydium and Meteora, 
    check few pools for price diff, if found diff in price est. >1-5%, prepare and post a message to Telegram.
  `;
  const flowInstructionPrompt = `
    You will get a list of Raydium pools sorted by volume, 
    you will need to find arbitrage opportunities between Raydium and Meteora, 
    if found diff in price, prepare and post a message to Telegram.
  `;
  return {
    type: EAgentType.PERMANENT,
    name: 'permanent',
    id: 'permanent',
    prompt: mainPrompt,
    flowInstructionPrompt: flowInstructionPrompt,
    reflections: [
      {
        type: EAgentType.REFLECTION,
        name: 'reflection',
        id: 'reflection',
        prompt: 'Analyze the data and generate a message',
        cronInitOnStart: true,
        cronSchedule: '0 0 */1 * * *', // every 1 hour
      }
    ],
    functions: [
      {
        name: 'postToTelegram',
        func: postToTelegram,
        description: 'Post a message to Telegram',
        paramsToPass: {
          message: 'string',
        },
      },
    ],
    children: [
      {
        type: EAgentType.WORKER,
        name: 'raydium_agent',
        id: 'raydium_agent',
        prompt: `
          You are a Raydium agent, you will find arbitrage opportunities between Raydium and Meteora, if found nice diff, then respond to main agent. 
        `,
        flowInstructionPrompt: `
          You can get 10-20 pools, and then randomly select 7-10, 
          which you can check with comparePrices function, 
          just don't repeat the same posts, if you already checked the same pools, few messages ago.
        `,
        functions: [
          {
            name: 'comparePrices',
            func: comparePrices,
            description: 'Compare prices for crypto pairs',
            paramsToPass: {
              tickers: 'string[]',
            },
          },
        ],
      },
    ],
  }
}

export function getReflectionBTCETCSOLAnalyticsAgentConfig(): IAgentSchema {
  const mainPrompt = `You are a BTC, ETH, and SOL analytics agent. Your role is to:
    1. Analyze market data and news for Bitcoin, Ethereum, and Solana
    2. Combine insights from your sub-agents (market data and news)
    3. Create informative and engaging Twitter threads about these cryptocurrencies
    4. Include price analysis, market trends, and relevant news
    5. Always include a DYOR (Do Your Own Research) disclaimer

    Format your analysis in a clear, professional manner using appropriate emojis and engaging language.`;

  return {
    type: EAgentType.PERMANENT,
    name: 'permanent',
    id: 'permanent',
    prompt: mainPrompt,
    reflections: [
      {
        type: EAgentType.REFLECTION,
        name: 'reflection',
        id: 'reflection',
        prompt: 'Analyze the data and generate a message',
        cronInitOnStart: true,
        cronSchedule: '0 0 */4 * * *', // every 4 hours
      }
    ],
    functions: [
      {
        name: 'postToTwitter',
        func: postToTwitter,
        description: 'Post a message to Twitter',
        paramsToPass: {
          message: 'string',
        },
      },
    ],
    children: [
      {
        type: EAgentType.WORKER,
        name: 'market_data_agent',
        id: 'market_data_agent',
        prompt: `You are a crypto market data specialist focused on BTC, ETH, and SOL.
          Analyze and report on:
          - Current prices and 24h changes
          - Trading volume
          - Market dominance
          - Key technical indicators
          Present data in a clear, structured format.`,
        functions: [
          {
            name: 'getPricesForCryptoPairs',
            func: getPricesForCryptoPairs,
            description: 'Get prices for crypto pairs',
            paramsToPass: {
              tickers: 'string[]',
            },
          },
        ],
      },
      {
        type: EAgentType.WORKER,
        name: 'news_agent',
        id: 'news_agent',
        prompt: `You are a crypto news specialist focused on BTC, ETH, and SOL.
          Monitor and analyze:
          - Breaking news
          - Development updates
          - Market sentiment
          - Regulatory news
          Summarize key points and their potential market impact.`,
        functions: [
          {
            name: 'getCryptoNews',
            func: getCryptoNews,
            description: 'Get latest crypto news',
            paramsToPass: {
              tickers: 'string[]',
            },
          },
        ],
      }
    ]
  }
}

export function getReflectionATHPumpFunAgentConfig(): IAgentSchema {
  const mainPrompt = `You are a PumpFun token analyst. 
    Your task is to analyze new tokens launched in the last 24 hours on PumpFun. Follow these steps:
    1. Use getNewPumpFunTokens() to get the top 5 new token addresses from PumpFun launched in last 24h, filtered by minimum market cap of $40,000.

    Format the data into a clear Twitter post that includes:
    1. A brief introduction about PumpFun's recent launches
    2. For each token in the top 5:
      - Token name and symbol
      - Current market cap in USD
      - Current price in USD
      - ATH MCAP

    Keep the message concise and engaging, using appropriate emojis. Format numbers in a readable way (e.g., $1.2M instead of 1200000).`;

  return {
    type: EAgentType.PERMANENT,
    name: 'permanent',
    id: 'permanent',
    prompt: mainPrompt,
    reflections: [
      {
        type: EAgentType.REFLECTION,
        name: 'reflection',
        id: 'reflection',
        prompt: 'Analyze the data and generate a message',
        cronInitOnStart: true,
        cronSchedule: '0 0 */4 * * *', // every 4 hours
      }
    ],
    functions: [  
      {
        name: 'getNewPumpFunTokens',
        func: getNewPumpFunTokens,
        description: 'Get the top 5 new token addresses from PumpFun launched in last 24h, filtered by minimum market cap of $40,000.',
        paramsToPass: {
          minMarketCap: 'number',
        },
        exampleOutput: 'string',
      },
    ],
    children: [
      {
        type: EAgentType.WORKER,
        name: 'twitter_formatter',
        id: 'twitter_formatter',
        prompt: `
          You are a crypto Twitter expert. 
          Format the provided token data into an engaging tweet thread. Use emojis and keep it exciting but professional. 
          Always include a DYOR disclaimer.
        `,
        functions: [
          {
            name: 'postToTwitter',
            func: postToTwitter,
            description: 'Post a message to Twitter',
            paramsToPass: {
              message: 'string',
            },
          },
        ]
      }
    ]
  }
}

function postToTwitter({message}: {message: string}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Twitter message sent');
    }, 1000);
  });
}

function getNewPumpFunTokens({minMarketCap}: {minMarketCap: number}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('New PumpFun tokens fetched');
    }, 1000);
  });
}

function getPricesForCryptoPairs({tickers}: {tickers: string[]}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Prices for crypto pairs fetched');
    }, 1000);
  });
}

function getCryptoNews({tickers}: {tickers: string[]}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Crypto news fetched');
    }, 1000);
  });
}

function postToTelegram({message}: {message: string}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Telegram message sent');
    }, 1000);
  });
}

function comparePrices({tickers}: {tickers: string[]}): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('Prices for crypto pairs fetched');
    }, 1000);
  });
}

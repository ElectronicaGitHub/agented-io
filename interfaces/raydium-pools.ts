export interface IRaydiumPoolInfo {
  type: string;
  programId: string;
  id: string;
  mintA: IRaydiumTokenInfo;
  mintB: IRaydiumTokenInfo;
  rewardDefaultPoolInfos: string;
  rewardDefaultInfos: IRaydiumRewardInfo[];
  price: number;
  mintAmountA: number;
  mintAmountB: number;
  feeRate: number;
  openTime: string;
  tvl: number;
  day: IRaydiumPeriodInfo;
  week: IRaydiumPeriodInfo;
  month: IRaydiumPeriodInfo;
  pooltype: any[];
  farmUpcomingCount: number;
  farmOngoingCount: number;
  farmFinishedCount: number;
  config: IRaydiumPoolConfig;
  burnPercent: number;
}

interface IRaydiumTokenInfo {
  chainId: number;
  address: string;
  programId: string;
  logoURI: string;
  symbol: string;
  name: string;
  decimals: number;
  tags: string[];
  extensions: Record<string, unknown>;
}

interface IRaydiumRewardInfo {
  mint: IRaydiumTokenInfo;
  perSecond: string;
  startTime: string;
  endTime: string;
}

interface IRaydiumPeriodInfo {
  volume: number;
  volumeQuote: number;
  volumeFee: number;
  apr: number;
  feeApr: number;
  priceMin: number;
  priceMax: number;
  rewardApr: number[];
}

interface IRaydiumPoolConfig {
  id: string;
  index: number;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
  fundFeeRate: number;
  defaultRange: number;
  defaultRangePoint: number[];
}


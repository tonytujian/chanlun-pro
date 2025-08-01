// 股票数据类型
export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

// 技术指标数据
export interface TechnicalIndicators {
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma50?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  kdj_k?: number;
  kdj_d?: number;
  kdj_j?: number;
  atr?: number;
  cci?: number;
  williams?: number;
}

// 增强的股票数据（包含技术指标）
export interface EnhancedStockData extends StockData {
  indicators: TechnicalIndicators;
}

// 交易信号类型
export type SignalType = 'BUY' | 'SELL' | 'HOLD';

// 交易信号
export interface TradingSignal {
  date: string;
  type: SignalType;
  price: number;
  confidence: number; // 0-1之间的置信度
  reason: string; // 信号产生的原因
}

// 策略条件
export interface StrategyCondition {
  indicator: keyof TechnicalIndicators | 'price' | 'volume';
  operator: '>' | '<' | '>=' | '<=' | '==' | 'cross_above' | 'cross_below';
  value: number | string;
  weight?: number; // 条件权重
}

// 交易策略
export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  buyConditions: StrategyCondition[];
  sellConditions: StrategyCondition[];
  stopLoss?: number; // 止损百分比
  takeProfit?: number; // 止盈百分比
  maxHoldDays?: number; // 最大持有天数
  fitness?: number; // 策略适应度评分
  parameters?: { [key: string]: any }; // 策略参数
}

// 回测结果
export interface BacktestResult {
  strategyId: string;
  totalReturn: number; // 总收益率
  annualizedReturn: number; // 年化收益率
  sharpeRatio: number; // 夏普比率
  maxDrawdown: number; // 最大回撤
  winRate: number; // 胜率
  totalTrades: number; // 总交易次数
  profitableTrades: number; // 盈利交易次数
  averageReturn: number; // 平均收益
  volatility: number; // 波动率
  trades: Trade[]; // 交易记录
  equityCurve: { date: string; equity: number }[]; // 资金曲线
  drawdownCurve: { date: string; drawdown: number }[]; // 回撤曲线
}

// 交易记录
export interface Trade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  return: number; // 收益率
  pnl: number; // 盈亏金额
  holdDays: number; // 持有天数
  type: 'LONG' | 'SHORT';
  exitReason: 'SIGNAL' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'MAX_HOLD';
}

// 形态匹配结果
export interface PatternMatch {
  startDate: string;
  endDate: string;
  similarity: number; // 相似度 0-1
  data: StockData[]; // 匹配的数据段
  correlation: number; // 相关系数
  dtw_distance: number; // DTW距离
  features: PatternFeatures; // 形态特征
}

// 形态特征
export interface PatternFeatures {
  volatility: number; // 波动率
  trend: number; // 趋势斜率
  volume_trend: number; // 成交量趋势
  price_range: number; // 价格区间
  duration: number; // 持续天数
  max_gain: number; // 最大涨幅
  max_loss: number; // 最大跌幅
}

// 遗传算法个体
export interface GeneticIndividual {
  id: string;
  strategy: TradingStrategy;
  fitness: number;
  generation: number;
}

// 优化参数
export interface OptimizationParameter {
  name: string;
  type: 'number' | 'boolean' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  current: any;
}

// 优化结果
export interface OptimizationResult {
  parameters: { [key: string]: any };
  fitness: number;
  backtest: BacktestResult;
}

// 数据导入配置
export interface DataImportConfig {
  file: File;
  delimiter: string;
  dateColumn: string;
  openColumn: string;
  highColumn: string;
  lowColumn: string;
  closeColumn: string;
  volumeColumn: string;
  dateFormat: string;
}

// 系统状态
export interface SystemState {
  isLoading: boolean;
  currentData: EnhancedStockData[];
  strategies: TradingStrategy[];
  backtestResults: { [strategyId: string]: BacktestResult };
  selectedStrategy?: string;
  patternMatches: PatternMatch[];
  optimizationResults: OptimizationResult[];
}

// Web Worker 消息类型
export interface WorkerMessage {
  type: 'CALCULATE_INDICATORS' | 'GENERATE_STRATEGIES' | 'BACKTEST' | 'PATTERN_MATCH' | 'OPTIMIZE';
  payload: any;
  id: string;
}

export interface WorkerResponse {
  type: string;
  payload: any;
  id: string;
  error?: string;
}

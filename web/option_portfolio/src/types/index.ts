// 期权合约类型
export interface OptionContract {
  contract_code: string;
  contract_name: string;
  option_type: 'C' | 'P'; // C: 看涨, P: 看跌
  strike_price: number;
  last_price: number;
  bid_price: number;
  ask_price: number;
  bid_volume: number;
  ask_volume: number;
  volume: number;
  open_interest: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho?: number;
  implied_volatility: number;
}

// T型报价行数据
export interface TQuoteRow {
  strike_price: number;
  call: OptionContract;
  put: OptionContract;
}

// T型报价数据
export interface TQuoteData {
  underlying_price: number;
  contracts: TQuoteRow[];
}

// 标的物
export interface Underlying {
  code: string;
  name: string;
}

// 到期月份
export interface ExpiryMonth {
  value: string;
  label: string;
}

// 期权组合
export interface OptionPortfolio {
  id?: number;
  portfolio_name: string;
  underlying_symbol: string;
  underlying_name: string;
  expiry_month: string;
  description?: string;
  created_at?: string;
  is_active?: boolean;
}

// 期权组合明细
export interface OptionPortfolioItem {
  id?: number;
  portfolio_id: number;
  contract_id: number;
  contract_code: string;
  position_type: 'long' | 'short';
  quantity: number;
  entry_price: number;
  current_price: number;
  pnl: number;
}

// 选中的期权合约
export interface SelectedContract {
  contract_code: string;
  contract_name: string;
  option_type: 'C' | 'P';
  strike_price: number;
  last_price: number;
  position_type: 'long' | 'short';
  quantity: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  implied_volatility?: number;
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number;
  data?: T;
  message?: string;
}

// 交易记录
export interface TradeRecord {
  id: number;
  contract_code: string;
  trade_type: string;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
  trade_time: string;
  status: string;
}

// 持仓信息
export interface Position {
  contract_code: string;
  contract_name: string;
  position_type: 'long' | 'short';
  quantity: number;
  avg_price: number;
  current_price: number;
  market_value: number;
  pnl: number;
  pnl_rate: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

// 委托订单
export interface Order {
  id: string;
  contract_code: string;
  contract_name: string;
  order_type: 'buy_open' | 'sell_open' | 'buy_close' | 'sell_close';
  quantity: number;
  price: number;
  filled_quantity: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  order_time: string;
  filled_time?: string;
}

// 账户信息
export interface AccountInfo {
  total_assets: number;
  available_cash: number;
  market_value: number;
  margin_used: number;
  margin_available: number;
  daily_pnl: number;
  total_pnl: number;
  risk_ratio: number;
}

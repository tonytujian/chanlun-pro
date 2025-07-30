import axios from 'axios';
import {
  ApiResponse,
  Underlying,
  ExpiryMonth,
  TQuoteData,
  OptionPortfolio,
  SelectedContract,
  TradeRecord,
  Position,
  Order,
  AccountInfo
} from '../types';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// 期权相关API
export const optionApi = {
  // 获取期权标的物列表
  getUnderlyings: (): Promise<ApiResponse<Underlying[]>> => {
    return api.get('/options/underlyings');
  },

  // 获取指定标的物的到期月份列表
  getExpiryMonths: (underlying: string): Promise<ApiResponse<ExpiryMonth[]>> => {
    return api.get(`/options/expiry_months/${underlying}`);
  },

  // 获取期权合约T型报价数据
  getOptionContracts: (underlying: string, expiryMonth: string): Promise<ApiResponse<TQuoteData>> => {
    return api.get(`/options/contracts/${underlying}/${expiryMonth}`);
  },

  // 获取期权组合列表
  getPortfolios: (): Promise<ApiResponse<OptionPortfolio[]>> => {
    return api.get('/options/portfolios');
  },

  // 创建期权组合
  createPortfolio: (portfolioData: {
    portfolio_name: string;
    underlying_symbol: string;
    underlying_name: string;
    expiry_month: string;
    description?: string;
    selected_contracts: SelectedContract[];
  }): Promise<ApiResponse<{ portfolio_id: number }>> => {
    const formData = new FormData();
    formData.append('portfolio_name', portfolioData.portfolio_name);
    formData.append('underlying_symbol', portfolioData.underlying_symbol);
    formData.append('underlying_name', portfolioData.underlying_name);
    formData.append('expiry_month', portfolioData.expiry_month);
    formData.append('description', portfolioData.description || '');
    formData.append('selected_contracts', JSON.stringify(portfolioData.selected_contracts));
    
    return api.post('/options/portfolios', formData);
  },

  // 获取期权组合详情
  getPortfolioDetail: (portfolioId: number): Promise<ApiResponse<{
    portfolio: OptionPortfolio;
    items: any[];
  }>> => {
    return api.get(`/options/portfolios/${portfolioId}`);
  },

  // 删除期权组合
  deletePortfolio: (portfolioId: number): Promise<ApiResponse> => {
    return api.delete(`/options/portfolios/${portfolioId}`);
  },
};

// 交易相关API
export const tradingApi = {
  // 获取交易记录
  getTradeRecords: (): Promise<ApiResponse<TradeRecord[]>> => {
    return api.get('/trading/records');
  },

  // 获取持仓信息
  getPositions: (): Promise<ApiResponse<Position[]>> => {
    return api.get('/trading/positions');
  },

  // 获取委托订单
  getOrders: (): Promise<ApiResponse<Order[]>> => {
    return api.get('/trading/orders');
  },

  // 获取账户信息
  getAccountInfo: (): Promise<ApiResponse<AccountInfo>> => {
    return api.get('/trading/account');
  },

  // 撤销订单
  cancelOrder: (orderId: string): Promise<ApiResponse> => {
    return api.post(`/trading/orders/${orderId}/cancel`);
  },
};

export default api;

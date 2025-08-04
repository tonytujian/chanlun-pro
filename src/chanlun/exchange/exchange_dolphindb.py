import datetime
from typing import List, Dict, Union

import pandas as pd

from chanlun import config
from chanlun.exchange.exchange import Exchange


class ExchangeDolphinDB(Exchange):
    """
    DolphinDB 数据库数据源
    """

    def __init__(self):
        super().__init__()
        
        # 导入DolphinDB数据库
        from chanlun.db_dolphindb import db
        self.db = db

    def default_code(self):
        """
        默认代码
        """
        return "SH.000001"

    def support_frequencys(self):
        """
        支持的周期
        """
        return {
            "y": "年线",
            "q": "季线", 
            "m": "月线",
            "w": "周线",
            "d": "日线",
            "120m": "120分钟",
            "60m": "60分钟",
            "30m": "30分钟",
            "15m": "15分钟",
            "5m": "5分钟",
            "1m": "1分钟",
        }

    def all_stocks(self):
        """
        获取所有股票信息
        """
        try:
            # 从DolphinDB获取股票信息
            stocks = self.db.stock_info_query(self.market_type())
            
            stock_list = []
            for stock in stocks:
                stock_list.append({
                    "code": stock.code,
                    "name": stock.name,
                    "industry": getattr(stock, 'industry', ''),
                    "concept": getattr(stock, 'concept', ''),
                })
            
            return stock_list
            
        except Exception as e:
            print(f"获取股票列表失败: {e}")
            return []

    def klines(
        self,
        code: str,
        frequency: str,
        start_date: str = None,
        end_date: str = None,
        args=None,
    ) -> [pd.DataFrame, None]:
        """
        获取K线数据
        """
        try:
            # 转换日期格式
            start_dt = None
            end_dt = None
            
            if start_date:
                start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            if end_date:
                end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d")
            
            # 从DolphinDB查询K线数据
            klines = self.db.klines_query(
                market=self.market_type(),
                code=code,
                frequency=frequency,
                start_date=start_dt,
                end_date=end_dt,
                limit=10000,
                order="asc"
            )
            
            if not klines:
                return pd.DataFrame()
            
            # 转换为DataFrame格式
            data = []
            for k in klines:
                data.append({
                    "code": k.code,
                    "date": k.dt,
                    "open": k.o,
                    "close": k.c,
                    "high": k.h,
                    "low": k.l,
                    "volume": k.v,
                    "amount": getattr(k, 'a', 0),
                })
                
                # 期货添加持仓量
                if hasattr(k, 'p'):
                    data[-1]["position"] = k.p
            
            df = pd.DataFrame(data)
            
            if len(df) == 0:
                return df
                
            # 设置索引
            df["date"] = pd.to_datetime(df["date"])
            df.set_index("date", inplace=True)
            df.sort_index(inplace=True)
            
            return df
            
        except Exception as e:
            print(f"获取K线数据失败 {code} {frequency}: {e}")
            return pd.DataFrame()

    def ticks(self, codes: List[str]) -> Dict[str, Dict]:
        """
        获取实时行情数据
        DolphinDB作为历史数据源，不提供实时数据
        """
        return {}

    def stock_owner_plate(self, code: str):
        """
        获取股票所属板块
        """
        try:
            stocks = self.db.stock_info_query(self.market_type(), code)
            if stocks:
                stock = stocks[0]
                return {
                    "industry": getattr(stock, 'industry', ''),
                    "concept": getattr(stock, 'concept', ''),
                }
        except Exception as e:
            print(f"获取股票板块信息失败 {code}: {e}")
        
        return {"industry": "", "concept": ""}

    def stock_info(self, code: str) -> Dict[str, Union[str, float]]:
        """
        获取股票基本信息
        """
        try:
            stocks = self.db.stock_info_query(self.market_type(), code)
            if stocks:
                stock = stocks[0]
                return {
                    "code": stock.code,
                    "name": stock.name,
                    "industry": getattr(stock, 'industry', ''),
                    "concept": getattr(stock, 'concept', ''),
                    "total_share": getattr(stock, 'total_share', 0),
                    "flow_share": getattr(stock, 'flow_share', 0),
                    "total_assets": getattr(stock, 'total_assets', 0),
                    "liquid_assets": getattr(stock, 'liquid_assets', 0),
                    "fixed_assets": getattr(stock, 'fixed_assets', 0),
                    "reserved": getattr(stock, 'reserved', 0),
                    "reserved_pershare": getattr(stock, 'reserved_pershare', 0),
                    "esp": getattr(stock, 'esp', 0),
                    "bvps": getattr(stock, 'bvps', 0),
                    "pb": getattr(stock, 'pb', 0),
                    "pe": getattr(stock, 'pe', 0),
                    "undp": getattr(stock, 'undp', 0),
                    "perundp": getattr(stock, 'perundp', 0),
                    "rev": getattr(stock, 'rev', 0),
                    "profit": getattr(stock, 'profit', 0),
                    "gpr": getattr(stock, 'gpr', 0),
                    "npr": getattr(stock, 'npr', 0),
                    "holders": getattr(stock, 'holders', 0),
                }
        except Exception as e:
            print(f"获取股票信息失败 {code}: {e}")
        
        return {}

    def market_type(self):
        """
        返回市场类型
        需要在子类中实现
        """
        return "a"


class ExchangeDolphinDBA(ExchangeDolphinDB):
    """
    A股市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "a"


class ExchangeDolphinDBHK(ExchangeDolphinDB):
    """
    港股市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "hk"


class ExchangeDolphinDBFutures(ExchangeDolphinDB):
    """
    期货市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "futures"


class ExchangeDolphinDBUS(ExchangeDolphinDB):
    """
    美股市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "us"


class ExchangeDolphinDBCurrency(ExchangeDolphinDB):
    """
    数字货币市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "currency"


class ExchangeDolphinDBCurrencySpot(ExchangeDolphinDB):
    """
    数字货币现货市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "currency_spot"


class ExchangeDolphinDBFX(ExchangeDolphinDB):
    """
    外汇市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "fx"


class ExchangeDolphinDBNYFutures(ExchangeDolphinDB):
    """
    纽约期货市场 DolphinDB 数据源
    """
    
    def market_type(self):
        return "ny_futures"

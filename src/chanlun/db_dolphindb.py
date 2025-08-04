import datetime
import json
import time
import warnings
from datetime import datetime
from typing import List, Union, Dict, Any

import numpy as np
import pandas as pd
import dolphindb as ddb

from chanlun import config, fun
from chanlun.base import Market
from chanlun.config import get_data_path

warnings.filterwarnings("ignore")


@fun.singleton
class DolphinDB(object):
    """
    DolphinDB数据库操作类
    """

    def __init__(self) -> None:
        """
        初始化DolphinDB连接
        """
        self.session = ddb.session()
        self.session.connect(
            host=config.DDB_HOST,
            port=config.DDB_PORT,
            userid=config.DDB_USER,
            password=config.DDB_PWD
        )
        
        # 创建数据库（如果不存在）
        self._create_database()
        
        # 初始化基础表
        self._init_tables()

    def _create_database(self):
        """
        创建数据库和分区表
        """
        try:
            # 创建数据库
            script = f"""
            if(existsDatabase("{config.DDB_DATABASE}")){{
                dropDatabase("{config.DDB_DATABASE}")
            }}
            db = database("{config.DDB_DATABASE}", RANGE, 2020.01.01..2030.01.01)
            """
            self.session.run(script)
            
            # 使用数据库
            self.session.run(f'use {config.DDB_DATABASE}')
            
        except Exception as e:
            print(f"创建数据库失败: {e}")

    def _init_tables(self):
        """
        初始化基础表结构
        """
        # 创建缓存表
        cache_script = """
        if(existsTable("cl_cache")){
            dropTable("cl_cache")
        }
        cache_schema = table(
            `STRING as k,
            `STRING as v,
            `INT as expire
        )
        cache_table = createTable(cache_schema, "cl_cache")
        """
        self.session.run(cache_script)
        
        # 创建股票信息表
        stock_info_script = """
        if(existsTable("cl_stock_info")){
            dropTable("cl_stock_info")
        }
        stock_info_schema = table(
            `STRING as market,
            `STRING as code,
            `STRING as name,
            `STRING as industry,
            `STRING as concept,
            `DOUBLE as total_share,
            `DOUBLE as flow_share,
            `DOUBLE as total_assets,
            `DOUBLE as liquid_assets,
            `DOUBLE as fixed_assets,
            `DOUBLE as reserved,
            `DOUBLE as reserved_pershare,
            `DOUBLE as esp,
            `DOUBLE as bvps,
            `DOUBLE as pb,
            `DOUBLE as pe,
            `DOUBLE as undp,
            `DOUBLE as perundp,
            `DOUBLE as rev,
            `DOUBLE as profit,
            `DOUBLE as gpr,
            `DOUBLE as npr,
            `DOUBLE as holders
        )
        stock_info_table = createTable(stock_info_schema, "cl_stock_info")
        """
        self.session.run(stock_info_script)

    def klines_table_name(self, market: str, stock_code: str, frequency: str) -> str:
        """
        生成K线表名
        """
        stock_code = stock_code.replace(".", "_")
        return f"{market}_{stock_code}_{frequency}"

    def create_klines_table(self, market: str, stock_code: str, frequency: str):
        """
        创建K线数据表
        """
        table_name = self.klines_table_name(market, stock_code, frequency)
        
        # 基础K线字段
        script = f"""
        if(existsTable("{table_name}")){{
            dropTable("{table_name}")
        }}
        klines_schema = table(
            `STRING as code,
            `DATETIME as dt,
            `STRING as f,
            `DOUBLE as o,
            `DOUBLE as c,
            `DOUBLE as h,
            `DOUBLE as l,
            `LONG as v,
            `DOUBLE as a
        )
        """
        
        # 期货市场添加持仓量字段
        if market == Market.FUTURES.value:
            script += """
            klines_schema = select *, double() as p from klines_schema
            """
        
        script += f"""
        {table_name} = createTable(klines_schema, "{table_name}")
        """
        
        self.session.run(script)

    def klines_insert(self, market: str, stock_code: str, frequency: str, klines: List):
        """
        插入K线数据
        """
        if not klines:
            return
            
        table_name = self.klines_table_name(market, stock_code, frequency)
        
        # 确保表存在
        if not self.session.existsTable(table_name):
            self.create_klines_table(market, stock_code, frequency)
        
        # 转换数据格式
        data_dict = {
            'code': [k.code for k in klines],
            'dt': [k.dt for k in klines],
            'f': [k.f for k in klines],
            'o': [k.o for k in klines],
            'c': [k.c for k in klines],
            'h': [k.h for k in klines],
            'l': [k.l for k in klines],
            'v': [k.v for k in klines],
            'a': [k.a for k in klines]
        }
        
        # 期货市场添加持仓量
        if market == Market.FUTURES.value:
            data_dict['p'] = [getattr(k, 'p', 0) for k in klines]
        
        # 创建DataFrame并上传
        df = pd.DataFrame(data_dict)
        self.session.upload({table_name: df})
        
        # 插入数据
        self.session.run(f"insert into {table_name} select * from {table_name}")

    def klines_query(
        self,
        market: str,
        stock_code: str,
        frequency: str,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = None,
        order: str = "asc"
    ) -> List:
        """
        查询K线数据
        """
        table_name = self.klines_table_name(market, stock_code, frequency)
        
        if not self.session.existsTable(table_name):
            return []
        
        # 构建查询条件
        where_conditions = []
        if start_date:
            where_conditions.append(f"dt >= {start_date.strftime('%Y.%m.%d')}")
        if end_date:
            where_conditions.append(f"dt <= {end_date.strftime('%Y.%m.%d')}")
        
        where_clause = ""
        if where_conditions:
            where_clause = f"where {' and '.join(where_conditions)}"
        
        # 构建排序和限制
        order_clause = f"order by dt {order}"
        limit_clause = f"limit {limit}" if limit else ""
        
        # 执行查询
        query = f"select * from {table_name} {where_clause} {order_clause} {limit_clause}"
        result = self.session.run(query)
        
        # 转换为对象列表
        klines = []
        if result is not None and len(result) > 0:
            for i in range(len(result)):
                kline = type('KLine', (), {})()
                kline.code = result['code'][i]
                kline.dt = result['dt'][i]
                kline.f = result['f'][i]
                kline.o = result['o'][i]
                kline.c = result['c'][i]
                kline.h = result['h'][i]
                kline.l = result['l'][i]
                kline.v = result['v'][i]
                kline.a = result['a'][i]
                if market == Market.FUTURES.value and 'p' in result:
                    kline.p = result['p'][i]
                klines.append(kline)
        
        return klines

    def query_klines_last_datetime(self, market: str, stock_code: str, frequency: str) -> datetime:
        """
        查询最后一条K线的时间
        """
        table_name = self.klines_table_name(market, stock_code, frequency)
        
        if not self.session.existsTable(table_name):
            return None
        
        query = f"select max(dt) as max_dt from {table_name}"
        result = self.session.run(query)
        
        if result is not None and len(result) > 0:
            return result['max_dt'][0]
        return None

    def delete_klines(self, market: str, stock_code: str, frequency: str):
        """
        删除K线数据表
        """
        table_name = self.klines_table_name(market, stock_code, frequency)
        
        if self.session.existsTable(table_name):
            self.session.run(f"dropTable('{table_name}')")

    def cache_set(self, key: str, value: str, expire: int = 0):
        """
        设置缓存
        """
        data = pd.DataFrame({
            'k': [key],
            'v': [value],
            'expire': [expire]
        })
        
        # 先删除已存在的key
        self.session.run(f"delete from cl_cache where k='{key}'")
        
        # 插入新数据
        self.session.upload({'cache_data': data})
        self.session.run("insert into cl_cache select * from cache_data")

    def cache_get(self, key: str) -> str:
        """
        获取缓存
        """
        current_time = int(time.time())
        query = f"select v from cl_cache where k='{key}' and (expire=0 or expire>{current_time})"
        result = self.session.run(query)
        
        if result is not None and len(result) > 0:
            return result['v'][0]
        return None

    def stock_info_insert(self, market: str, stock_infos: List):
        """
        插入股票信息
        """
        if not stock_infos:
            return
        
        # 转换数据格式
        data_dict = {
            'market': [market] * len(stock_infos),
            'code': [info.code for info in stock_infos],
            'name': [info.name for info in stock_infos],
            'industry': [getattr(info, 'industry', '') for info in stock_infos],
            'concept': [getattr(info, 'concept', '') for info in stock_infos],
            'total_share': [getattr(info, 'total_share', 0) for info in stock_infos],
            'flow_share': [getattr(info, 'flow_share', 0) for info in stock_infos],
            'total_assets': [getattr(info, 'total_assets', 0) for info in stock_infos],
            'liquid_assets': [getattr(info, 'liquid_assets', 0) for info in stock_infos],
            'fixed_assets': [getattr(info, 'fixed_assets', 0) for info in stock_infos],
            'reserved': [getattr(info, 'reserved', 0) for info in stock_infos],
            'reserved_pershare': [getattr(info, 'reserved_pershare', 0) for info in stock_infos],
            'esp': [getattr(info, 'esp', 0) for info in stock_infos],
            'bvps': [getattr(info, 'bvps', 0) for info in stock_infos],
            'pb': [getattr(info, 'pb', 0) for info in stock_infos],
            'pe': [getattr(info, 'pe', 0) for info in stock_infos],
            'undp': [getattr(info, 'undp', 0) for info in stock_infos],
            'perundp': [getattr(info, 'perundp', 0) for info in stock_infos],
            'rev': [getattr(info, 'rev', 0) for info in stock_infos],
            'profit': [getattr(info, 'profit', 0) for info in stock_infos],
            'gpr': [getattr(info, 'gpr', 0) for info in stock_infos],
            'npr': [getattr(info, 'npr', 0) for info in stock_infos],
            'holders': [getattr(info, 'holders', 0) for info in stock_infos]
        }
        
        # 先删除已存在的数据
        self.session.run(f"delete from cl_stock_info where market='{market}'")
        
        # 插入新数据
        df = pd.DataFrame(data_dict)
        self.session.upload({'stock_info_data': df})
        self.session.run("insert into cl_stock_info select * from stock_info_data")

    def stock_info_query(self, market: str, code: str = None) -> List:
        """
        查询股票信息
        """
        where_clause = f"where market='{market}'"
        if code:
            where_clause += f" and code='{code}'"
        
        query = f"select * from cl_stock_info {where_clause}"
        result = self.session.run(query)
        
        stock_infos = []
        if result is not None and len(result) > 0:
            for i in range(len(result)):
                info = type('StockInfo', (), {})()
                info.market = result['market'][i]
                info.code = result['code'][i]
                info.name = result['name'][i]
                info.industry = result['industry'][i]
                info.concept = result['concept'][i]
                info.total_share = result['total_share'][i]
                info.flow_share = result['flow_share'][i]
                info.total_assets = result['total_assets'][i]
                info.liquid_assets = result['liquid_assets'][i]
                info.fixed_assets = result['fixed_assets'][i]
                info.reserved = result['reserved'][i]
                info.reserved_pershare = result['reserved_pershare'][i]
                info.esp = result['esp'][i]
                info.bvps = result['bvps'][i]
                info.pb = result['pb'][i]
                info.pe = result['pe'][i]
                info.undp = result['undp'][i]
                info.perundp = result['perundp'][i]
                info.rev = result['rev'][i]
                info.profit = result['profit'][i]
                info.gpr = result['gpr'][i]
                info.npr = result['npr'][i]
                info.holders = result['holders'][i]
                stock_infos.append(info)
        
        return stock_infos

    def close(self):
        """
        关闭数据库连接
        """
        if self.session:
            self.session.close()


# 创建全局数据库实例
db = DolphinDB()


if __name__ == "__main__":
    # 测试代码
    print("DolphinDB 数据库连接测试")
    
    # 测试缓存功能
    db.cache_set("test_key", "test_value", int(time.time()) + 60)
    value = db.cache_get("test_key")
    print(f"缓存测试: {value}")
    
    print("DolphinDB 数据库测试完成")

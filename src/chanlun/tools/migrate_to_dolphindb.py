#!/usr/bin/env python3
"""
数据迁移工具：将现有数据库数据迁移到DolphinDB

使用方法:
python migrate_to_dolphindb.py --source sqlite --target dolphindb --market a --batch-size 1000

参数说明:
--source: 源数据库类型 (sqlite/mysql)
--target: 目标数据库类型 (dolphindb)
--market: 市场类型 (a/hk/futures/us/currency/currency_spot/fx/ny_futures)
--batch-size: 批量处理大小，默认1000
--codes: 指定股票代码，多个代码用逗号分隔，不指定则迁移所有
--dry-run: 只显示迁移计划，不实际执行
"""

import argparse
import sys
import time
from datetime import datetime
from typing import List, Dict, Any

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 添加项目路径
sys.path.append('../../')

from chanlun import config
from chanlun.config import get_data_path
from chanlun.db_dolphindb import DolphinDB
from chanlun.base import Market


class DataMigrator:
    """
    数据迁移器
    """
    
    def __init__(self, source_type: str, target_type: str):
        self.source_type = source_type
        self.target_type = target_type
        
        # 初始化源数据库连接
        self._init_source_db()
        
        # 初始化目标数据库连接
        if target_type == "dolphindb":
            self.target_db = DolphinDB()
        else:
            raise ValueError(f"不支持的目标数据库类型: {target_type}")
    
    def _init_source_db(self):
        """
        初始化源数据库连接
        """
        if self.source_type == "sqlite":
            db_path = get_data_path() / "db"
            db_file = db_path / f"{config.DB_DATABASE}.sqlite"
            if not db_file.exists():
                raise FileNotFoundError(f"SQLite数据库文件不存在: {db_file}")
            
            self.source_engine = create_engine(f"sqlite:///{str(db_file)}")
            
        elif self.source_type == "mysql":
            self.source_engine = create_engine(
                f"mysql+pymysql://{config.DB_USER}:{config.DB_PWD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_DATABASE}?charset=utf8mb4"
            )
        else:
            raise ValueError(f"不支持的源数据库类型: {self.source_type}")
        
        self.source_session = sessionmaker(bind=self.source_engine)()
    
    def get_klines_tables(self, market: str) -> List[str]:
        """
        获取K线数据表列表
        """
        if self.source_type == "sqlite":
            query = "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE ?"
            result = self.source_session.execute(text(query), (f"{market}_%",))
        else:  # mysql
            query = "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name LIKE ?"
            result = self.source_session.execute(text(query), (config.DB_DATABASE, f"{market}_%"))
        
        tables = [row[0] for row in result.fetchall()]
        return tables
    
    def parse_table_info(self, table_name: str) -> Dict[str, str]:
        """
        解析表名获取市场、代码、周期信息
        """
        parts = table_name.split('_')
        if len(parts) < 3:
            return {}
        
        market = parts[0]
        frequency = parts[-1]
        code = '_'.join(parts[1:-1])
        
        # 还原代码格式
        code = code.replace('_', '.')
        
        return {
            'market': market,
            'code': code,
            'frequency': frequency
        }
    
    def migrate_klines_table(self, table_name: str, batch_size: int = 1000, dry_run: bool = False) -> Dict[str, Any]:
        """
        迁移单个K线表
        """
        table_info = self.parse_table_info(table_name)
        if not table_info:
            return {'success': False, 'error': f'无法解析表名: {table_name}'}
        
        market = table_info['market']
        code = table_info['code']
        frequency = table_info['frequency']
        
        print(f"迁移表: {table_name} -> {market}.{code}.{frequency}")
        
        if dry_run:
            # 只统计数据量
            count_query = f"SELECT COUNT(*) FROM {table_name}"
            result = self.source_session.execute(text(count_query))
            count = result.fetchone()[0]
            return {
                'success': True,
                'table': table_name,
                'market': market,
                'code': code,
                'frequency': frequency,
                'count': count,
                'dry_run': True
            }
        
        try:
            # 查询源数据
            query = f"SELECT * FROM {table_name} ORDER BY dt"
            df = pd.read_sql(query, self.source_engine)
            
            if len(df) == 0:
                return {
                    'success': True,
                    'table': table_name,
                    'count': 0,
                    'message': '表为空，跳过'
                }
            
            # 转换数据格式
            klines = []
            for _, row in df.iterrows():
                kline = type('KLine', (), {})()
                kline.code = row['code']
                kline.dt = pd.to_datetime(row['dt'])
                kline.f = row['f']
                kline.o = float(row['o'])
                kline.c = float(row['c'])
                kline.h = float(row['h'])
                kline.l = float(row['l'])
                kline.v = int(row['v'])
                kline.a = float(row.get('a', 0))
                
                # 期货市场添加持仓量
                if market == Market.FUTURES.value and 'p' in row:
                    kline.p = float(row['p'])
                
                klines.append(kline)
            
            # 批量插入到DolphinDB
            total_count = len(klines)
            inserted_count = 0
            
            for i in range(0, total_count, batch_size):
                batch = klines[i:i + batch_size]
                self.target_db.klines_insert(market, code, frequency, batch)
                inserted_count += len(batch)
                
                # 显示进度
                progress = (inserted_count / total_count) * 100
                print(f"  进度: {inserted_count}/{total_count} ({progress:.1f}%)")
            
            return {
                'success': True,
                'table': table_name,
                'market': market,
                'code': code,
                'frequency': frequency,
                'count': total_count,
                'inserted': inserted_count
            }
            
        except Exception as e:
            return {
                'success': False,
                'table': table_name,
                'error': str(e)
            }
    
    def migrate_stock_info(self, market: str, dry_run: bool = False) -> Dict[str, Any]:
        """
        迁移股票信息
        """
        print(f"迁移股票信息: {market}")
        
        try:
            # 查询股票信息表
            info_table = f"cl_stock_info_{market}"
            
            # 检查表是否存在
            if self.source_type == "sqlite":
                check_query = "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
                result = self.source_session.execute(text(check_query), (info_table,))
            else:
                check_query = "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?"
                result = self.source_session.execute(text(check_query), (config.DB_DATABASE, info_table))
            
            if not result.fetchone():
                return {
                    'success': True,
                    'message': f'股票信息表 {info_table} 不存在，跳过'
                }
            
            if dry_run:
                count_query = f"SELECT COUNT(*) FROM {info_table}"
                result = self.source_session.execute(text(count_query))
                count = result.fetchone()[0]
                return {
                    'success': True,
                    'table': info_table,
                    'count': count,
                    'dry_run': True
                }
            
            # 查询数据
            query = f"SELECT * FROM {info_table}"
            df = pd.read_sql(query, self.source_engine)
            
            if len(df) == 0:
                return {
                    'success': True,
                    'table': info_table,
                    'count': 0,
                    'message': '表为空，跳过'
                }
            
            # 转换数据格式
            stock_infos = []
            for _, row in df.iterrows():
                info = type('StockInfo', (), {})()
                for col in df.columns:
                    setattr(info, col, row[col])
                stock_infos.append(info)
            
            # 插入到DolphinDB
            self.target_db.stock_info_insert(market, stock_infos)
            
            return {
                'success': True,
                'table': info_table,
                'count': len(stock_infos),
                'inserted': len(stock_infos)
            }
            
        except Exception as e:
            return {
                'success': False,
                'table': f'cl_stock_info_{market}',
                'error': str(e)
            }
    
    def migrate_cache(self, dry_run: bool = False) -> Dict[str, Any]:
        """
        迁移缓存数据
        """
        print("迁移缓存数据")
        
        try:
            cache_table = "cl_cache"
            
            if dry_run:
                count_query = f"SELECT COUNT(*) FROM {cache_table}"
                result = self.source_session.execute(text(count_query))
                count = result.fetchone()[0]
                return {
                    'success': True,
                    'table': cache_table,
                    'count': count,
                    'dry_run': True
                }
            
            # 查询缓存数据
            query = f"SELECT * FROM {cache_table}"
            df = pd.read_sql(query, self.source_engine)
            
            if len(df) == 0:
                return {
                    'success': True,
                    'table': cache_table,
                    'count': 0,
                    'message': '表为空，跳过'
                }
            
            # 插入到DolphinDB
            inserted_count = 0
            for _, row in df.iterrows():
                self.target_db.cache_set(row['k'], row['v'], row['expire'])
                inserted_count += 1
            
            return {
                'success': True,
                'table': cache_table,
                'count': len(df),
                'inserted': inserted_count
            }
            
        except Exception as e:
            return {
                'success': False,
                'table': 'cl_cache',
                'error': str(e)
            }
    
    def migrate_market(self, market: str, codes: List[str] = None, batch_size: int = 1000, dry_run: bool = False):
        """
        迁移指定市场的数据
        """
        print(f"\n开始迁移市场: {market}")
        print(f"源数据库: {self.source_type}")
        print(f"目标数据库: {self.target_type}")
        print(f"批量大小: {batch_size}")
        print(f"预演模式: {dry_run}")
        print("-" * 50)
        
        results = []
        
        # 迁移股票信息
        stock_info_result = self.migrate_stock_info(market, dry_run)
        results.append(stock_info_result)
        
        # 获取K线表列表
        tables = self.get_klines_tables(market)
        
        # 过滤指定代码
        if codes:
            filtered_tables = []
            for table in tables:
                table_info = self.parse_table_info(table)
                if table_info and table_info['code'] in codes:
                    filtered_tables.append(table)
            tables = filtered_tables
        
        print(f"找到 {len(tables)} 个K线表需要迁移")
        
        # 迁移K线数据
        for i, table in enumerate(tables, 1):
            print(f"\n[{i}/{len(tables)}] ", end="")
            result = self.migrate_klines_table(table, batch_size, dry_run)
            results.append(result)
            
            if not result['success']:
                print(f"  错误: {result.get('error', '未知错误')}")
            elif dry_run:
                print(f"  预计迁移 {result.get('count', 0)} 条记录")
            else:
                print(f"  完成，迁移了 {result.get('inserted', 0)} 条记录")
        
        # 迁移缓存数据（只在第一次迁移时执行）
        if market == 'a':  # 只在A股市场迁移时执行一次
            cache_result = self.migrate_cache(dry_run)
            results.append(cache_result)
        
        # 统计结果
        success_count = sum(1 for r in results if r['success'])
        total_records = sum(r.get('count', 0) for r in results if r['success'])
        
        print(f"\n迁移完成!")
        print(f"成功: {success_count}/{len(results)}")
        print(f"总记录数: {total_records}")
        
        # 显示失败的表
        failed_results = [r for r in results if not r['success']]
        if failed_results:
            print(f"\n失败的表:")
            for result in failed_results:
                print(f"  {result.get('table', 'unknown')}: {result.get('error', '未知错误')}")
        
        return results
    
    def close(self):
        """
        关闭数据库连接
        """
        if hasattr(self, 'source_session'):
            self.source_session.close()
        if hasattr(self, 'target_db'):
            self.target_db.close()


def main():
    parser = argparse.ArgumentParser(description='数据迁移工具：将现有数据库数据迁移到DolphinDB')
    parser.add_argument('--source', choices=['sqlite', 'mysql'], default='sqlite', help='源数据库类型')
    parser.add_argument('--target', choices=['dolphindb'], default='dolphindb', help='目标数据库类型')
    parser.add_argument('--market', choices=['a', 'hk', 'futures', 'us', 'currency', 'currency_spot', 'fx', 'ny_futures'], 
                       required=True, help='市场类型')
    parser.add_argument('--batch-size', type=int, default=1000, help='批量处理大小')
    parser.add_argument('--codes', help='指定股票代码，多个代码用逗号分隔')
    parser.add_argument('--dry-run', action='store_true', help='只显示迁移计划，不实际执行')
    
    args = parser.parse_args()
    
    # 解析股票代码
    codes = None
    if args.codes:
        codes = [code.strip() for code in args.codes.split(',')]
    
    try:
        # 创建迁移器
        migrator = DataMigrator(args.source, args.target)
        
        # 执行迁移
        results = migrator.migrate_market(
            market=args.market,
            codes=codes,
            batch_size=args.batch_size,
            dry_run=args.dry_run
        )
        
        # 关闭连接
        migrator.close()
        
        print("\n迁移工具执行完成!")
        
    except Exception as e:
        print(f"迁移失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

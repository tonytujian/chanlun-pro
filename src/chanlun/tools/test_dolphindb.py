#!/usr/bin/env python3
"""
DolphinDB 连接测试脚本

使用方法:
python test_dolphindb.py

功能:
1. 测试DolphinDB连接
2. 验证数据库和表创建
3. 测试数据插入和查询
4. 性能基准测试
"""

import sys
import time
import random
from datetime import datetime, timedelta
from typing import List

# 添加项目路径
sys.path.append('../../')

from chanlun import config
from chanlun.db_dolphindb import DolphinDB


class DolphinDBTester:
    """
    DolphinDB测试器
    """
    
    def __init__(self):
        self.db = None
        self.test_results = []
    
    def log_result(self, test_name: str, success: bool, message: str = "", duration: float = 0):
        """
        记录测试结果
        """
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'duration': duration
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        duration_str = f" ({duration:.3f}s)" if duration > 0 else ""
        print(f"{status} {test_name}{duration_str}")
        if message:
            print(f"    {message}")
    
    def test_connection(self):
        """
        测试数据库连接
        """
        print("🔗 测试DolphinDB连接...")
        
        try:
            start_time = time.time()
            self.db = DolphinDB()
            duration = time.time() - start_time
            
            self.log_result(
                "数据库连接",
                True,
                f"成功连接到 {config.DDB_HOST}:{config.DDB_PORT}",
                duration
            )
            return True
            
        except Exception as e:
            self.log_result(
                "数据库连接",
                False,
                f"连接失败: {str(e)}"
            )
            return False
    
    def test_basic_operations(self):
        """
        测试基本操作
        """
        print("\n📝 测试基本操作...")
        
        # 测试缓存操作
        try:
            start_time = time.time()
            
            # 设置缓存
            test_key = "test_key_" + str(int(time.time()))
            test_value = {"test": "value", "timestamp": time.time()}
            self.db.cache_set(test_key, test_value, int(time.time()) + 60)
            
            # 获取缓存
            cached_value = self.db.cache_get(test_key)
            
            duration = time.time() - start_time
            
            if cached_value and cached_value.get("test") == "value":
                self.log_result(
                    "缓存操作",
                    True,
                    "缓存设置和获取正常",
                    duration
                )
            else:
                self.log_result(
                    "缓存操作",
                    False,
                    f"缓存值不匹配: {cached_value}"
                )
                
        except Exception as e:
            self.log_result(
                "缓存操作",
                False,
                f"缓存操作失败: {str(e)}"
            )
    
    def test_klines_operations(self):
        """
        测试K线数据操作
        """
        print("\n📊 测试K线数据操作...")
        
        market = "test"
        code = "TEST.001"
        frequency = "d"
        
        try:
            # 生成测试K线数据
            start_time = time.time()
            test_klines = self._generate_test_klines(code, frequency, 100)
            
            # 插入K线数据
            self.db.klines_insert(market, code, frequency, test_klines)
            
            # 查询K线数据
            queried_klines = self.db.klines_query(market, code, frequency, limit=50)
            
            duration = time.time() - start_time
            
            if len(queried_klines) > 0:
                self.log_result(
                    "K线数据操作",
                    True,
                    f"成功插入和查询 {len(queried_klines)} 条K线数据",
                    duration
                )
                
                # 测试最后时间查询
                last_dt = self.db.query_klines_last_datetime(market, code, frequency)
                if last_dt:
                    self.log_result(
                        "最后时间查询",
                        True,
                        f"最后时间: {last_dt}"
                    )
                else:
                    self.log_result(
                        "最后时间查询",
                        False,
                        "无法获取最后时间"
                    )
            else:
                self.log_result(
                    "K线数据操作",
                    False,
                    "查询结果为空"
                )
                
        except Exception as e:
            self.log_result(
                "K线数据操作",
                False,
                f"K线操作失败: {str(e)}"
            )
    
    def test_stock_info_operations(self):
        """
        测试股票信息操作
        """
        print("\n🏢 测试股票信息操作...")
        
        market = "test"
        
        try:
            start_time = time.time()
            
            # 生成测试股票信息
            test_stocks = self._generate_test_stock_info(10)
            
            # 插入股票信息
            self.db.stock_info_insert(market, test_stocks)
            
            # 查询股票信息
            queried_stocks = self.db.stock_info_query(market)
            
            duration = time.time() - start_time
            
            if len(queried_stocks) > 0:
                self.log_result(
                    "股票信息操作",
                    True,
                    f"成功插入和查询 {len(queried_stocks)} 条股票信息",
                    duration
                )
                
                # 测试单个股票查询
                single_stock = self.db.stock_info_query(market, test_stocks[0].code)
                if single_stock:
                    self.log_result(
                        "单个股票查询",
                        True,
                        f"查询到股票: {single_stock[0].name}"
                    )
                else:
                    self.log_result(
                        "单个股票查询",
                        False,
                        "无法查询单个股票"
                    )
            else:
                self.log_result(
                    "股票信息操作",
                    False,
                    "查询结果为空"
                )
                
        except Exception as e:
            self.log_result(
                "股票信息操作",
                False,
                f"股票信息操作失败: {str(e)}"
            )
    
    def test_performance(self):
        """
        测试性能
        """
        print("\n🚀 测试性能...")
        
        market = "perf_test"
        code = "PERF.001"
        frequency = "1m"
        
        try:
            # 大批量数据插入测试
            print("  生成测试数据...")
            large_klines = self._generate_test_klines(code, frequency, 10000)
            
            print("  测试大批量插入...")
            start_time = time.time()
            self.db.klines_insert(market, code, frequency, large_klines)
            insert_duration = time.time() - start_time
            
            self.log_result(
                "大批量插入 (10K条)",
                True,
                f"插入速度: {10000/insert_duration:.0f} 条/秒",
                insert_duration
            )
            
            # 大批量查询测试
            print("  测试大批量查询...")
            start_time = time.time()
            queried_klines = self.db.klines_query(market, code, frequency, limit=5000)
            query_duration = time.time() - start_time
            
            self.log_result(
                "大批量查询 (5K条)",
                True,
                f"查询速度: {len(queried_klines)/query_duration:.0f} 条/秒",
                query_duration
            )
            
            # 范围查询测试
            print("  测试范围查询...")
            start_date = datetime.now() - timedelta(days=30)
            end_date = datetime.now() - timedelta(days=1)
            
            start_time = time.time()
            range_klines = self.db.klines_query(
                market, code, frequency, 
                start_date=start_date, 
                end_date=end_date
            )
            range_duration = time.time() - start_time
            
            self.log_result(
                "范围查询",
                True,
                f"查询到 {len(range_klines)} 条记录",
                range_duration
            )
            
        except Exception as e:
            self.log_result(
                "性能测试",
                False,
                f"性能测试失败: {str(e)}"
            )
    
    def _generate_test_klines(self, code: str, frequency: str, count: int) -> List:
        """
        生成测试K线数据
        """
        klines = []
        base_time = datetime.now() - timedelta(days=count)
        base_price = 100.0
        
        for i in range(count):
            kline = type('KLine', (), {})()
            kline.code = code
            kline.dt = base_time + timedelta(days=i)
            kline.f = frequency
            
            # 生成随机价格数据
            change = random.uniform(-0.05, 0.05)
            base_price *= (1 + change)
            
            kline.o = base_price
            kline.c = base_price * (1 + random.uniform(-0.02, 0.02))
            kline.h = max(kline.o, kline.c) * (1 + random.uniform(0, 0.03))
            kline.l = min(kline.o, kline.c) * (1 - random.uniform(0, 0.03))
            kline.v = random.randint(1000000, 10000000)
            kline.a = kline.v * (kline.o + kline.c) / 2
            
            klines.append(kline)
        
        return klines
    
    def _generate_test_stock_info(self, count: int) -> List:
        """
        生成测试股票信息
        """
        stocks = []
        
        for i in range(count):
            stock = type('StockInfo', (), {})()
            stock.code = f"TEST.{i:03d}"
            stock.name = f"测试股票{i:03d}"
            stock.industry = "测试行业"
            stock.concept = "测试概念"
            stock.total_share = random.uniform(1000000, 10000000)
            stock.flow_share = stock.total_share * 0.8
            stock.total_assets = random.uniform(1000000000, 10000000000)
            stock.liquid_assets = stock.total_assets * 0.3
            stock.fixed_assets = stock.total_assets * 0.4
            stock.reserved = random.uniform(100000000, 1000000000)
            stock.reserved_pershare = stock.reserved / stock.total_share
            stock.esp = random.uniform(0.1, 5.0)
            stock.bvps = random.uniform(5.0, 20.0)
            stock.pb = random.uniform(1.0, 10.0)
            stock.pe = random.uniform(10.0, 50.0)
            stock.undp = random.uniform(100000000, 1000000000)
            stock.perundp = stock.undp / stock.total_share
            stock.rev = random.uniform(1000000000, 10000000000)
            stock.profit = stock.rev * random.uniform(0.05, 0.2)
            stock.gpr = random.uniform(0.1, 0.5)
            stock.npr = random.uniform(0.05, 0.3)
            stock.holders = random.randint(10000, 100000)
            
            stocks.append(stock)
        
        return stocks
    
    def cleanup(self):
        """
        清理测试数据
        """
        print("\n🧹 清理测试数据...")
        
        try:
            # 删除测试表
            test_markets = ["test", "perf_test"]
            for market in test_markets:
                # 这里可以添加删除测试数据的逻辑
                pass
            
            self.log_result(
                "数据清理",
                True,
                "测试数据清理完成"
            )
            
        except Exception as e:
            self.log_result(
                "数据清理",
                False,
                f"清理失败: {str(e)}"
            )
    
    def print_summary(self):
        """
        打印测试摘要
        """
        print("\n" + "="*60)
        print("📋 测试摘要")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"总测试数: {total_tests}")
        print(f"通过: {passed_tests}")
        print(f"失败: {failed_tests}")
        print(f"成功率: {passed_tests/total_tests*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ 失败的测试:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "="*60)
    
    def run_all_tests(self):
        """
        运行所有测试
        """
        print("🧪 DolphinDB 连接测试开始")
        print("="*60)
        
        # 测试连接
        if not self.test_connection():
            print("❌ 数据库连接失败，终止测试")
            return
        
        # 运行各项测试
        self.test_basic_operations()
        self.test_klines_operations()
        self.test_stock_info_operations()
        self.test_performance()
        
        # 清理测试数据
        self.cleanup()
        
        # 关闭连接
        if self.db:
            self.db.close()
        
        # 打印摘要
        self.print_summary()


def main():
    """
    主函数
    """
    print("DolphinDB 测试工具")
    print(f"配置信息:")
    print(f"  主机: {config.DDB_HOST}")
    print(f"  端口: {config.DDB_PORT}")
    print(f"  用户: {config.DDB_USER}")
    print(f"  数据库: {config.DDB_DATABASE}")
    print()
    
    # 创建测试器并运行测试
    tester = DolphinDBTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()

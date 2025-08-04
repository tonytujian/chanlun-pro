# DolphinDB 配置指南

本指南将帮助您配置和使用DolphinDB作为缠论系统的数据库后端。

## 📋 目录

1. [DolphinDB简介](#dolphindb简介)
2. [安装DolphinDB](#安装dolphindb)
3. [配置DolphinDB](#配置dolphindb)
4. [系统配置](#系统配置)
5. [数据迁移](#数据迁移)
6. [性能优化](#性能优化)
7. [常见问题](#常见问题)

## 🐬 DolphinDB简介

DolphinDB是一个高性能的分布式时序数据库，特别适合金融数据的存储和分析：

### 主要优势
- **高性能**: 专为时序数据优化，查询速度极快
- **分布式**: 支持水平扩展，处理海量数据
- **内置分析**: 集成丰富的金融分析函数
- **实时计算**: 支持流数据处理和实时计算
- **SQL兼容**: 支持标准SQL语法，易于使用

### 适用场景
- 大量历史K线数据存储
- 实时行情数据处理
- 复杂的技术分析计算
- 高频交易数据分析

## 🚀 安装DolphinDB

### 1. 下载DolphinDB

访问 [DolphinDB官网](https://www.dolphindb.cn/) 下载适合您操作系统的版本：

- **Linux**: `DolphinDB_Linux64_V2.00.10.tar.gz`
- **Windows**: `DolphinDB_Win64_V2.00.10.zip`
- **macOS**: `DolphinDB_MacOS_V2.00.10.tar.gz`

### 2. 解压和安装

```bash
# Linux/macOS
tar -xzf DolphinDB_Linux64_V2.00.10.tar.gz
cd DolphinDB

# Windows
# 解压zip文件到指定目录
```

### 3. 启动DolphinDB服务器

```bash
# Linux/macOS
./dolphindb

# Windows
dolphindb.exe
```

默认情况下，DolphinDB将在以下端口启动：
- **HTTP端口**: 8848
- **TCP端口**: 8849

## ⚙️ 配置DolphinDB

### 1. 基础配置文件

创建配置文件 `dolphindb.cfg`：

```ini
# 基础配置
localSite=localhost:8848:local8848
mode=single

# 数据目录
dataDirectory=./data
logDirectory=./log

# 内存配置
maxMemSize=8
regularArrayMemoryLimit=512

# 网络配置
tcpNoDelay=true
maxConnections=512

# 安全配置
enableHTTPS=false
enableAuthentication=true

# 日志配置
logLevel=INFO
maxLogSize=1024
```

### 2. 启动参数

使用配置文件启动：

```bash
./dolphindb -config dolphindb.cfg
```

### 3. 创建用户和权限

连接到DolphinDB后，创建用户：

```sql
-- 创建管理员用户
createUser("admin", "123456")

-- 创建普通用户
createUser("chanlun", "chanlun123")

-- 授权
grant("chanlun", TABLE_READ, "*")
grant("chanlun", TABLE_WRITE, "*")
grant("chanlun", DB_MANAGE, "*")
```

## 🔧 系统配置

### 1. 修改配置文件

将 `config.py.demo` 复制为 `config.py`，并修改数据库配置：

```python
# 数据库配置
DB_TYPE = "dolphindb"  # 使用DolphinDB

# DolphinDB 数据库配置
DDB_HOST = '127.0.0.1'
DDB_PORT = 8848
DDB_USER = 'chanlun'
DDB_PWD = 'chanlun123'
DDB_DATABASE = 'chanlun_db'
```

### 2. 安装Python客户端

```bash
pip install dolphindb
```

### 3. 配置交易所数据源

如果要使用DolphinDB作为数据源，修改交易所配置：

```python
# 各个市场的交易所设置
EXCHANGE_A = "dolphindb"        # A股使用DolphinDB
EXCHANGE_HK = "dolphindb"       # 港股使用DolphinDB
EXCHANGE_FUTURES = "dolphindb"  # 期货使用DolphinDB
EXCHANGE_US = "dolphindb"       # 美股使用DolphinDB
# ... 其他市场
```

## 📦 数据迁移

### 1. 使用迁移工具

系统提供了专门的数据迁移工具：

```bash
# 迁移A股数据（预演模式）
python src/chanlun/tools/migrate_to_dolphindb.py \
    --source sqlite \
    --target dolphindb \
    --market a \
    --dry-run

# 实际迁移A股数据
python src/chanlun/tools/migrate_to_dolphindb.py \
    --source sqlite \
    --target dolphindb \
    --market a \
    --batch-size 1000

# 迁移指定股票
python src/chanlun/tools/migrate_to_dolphindb.py \
    --source sqlite \
    --target dolphindb \
    --market a \
    --codes "SH.000001,SZ.000002" \
    --batch-size 500
```

### 2. 迁移参数说明

- `--source`: 源数据库类型 (sqlite/mysql)
- `--target`: 目标数据库类型 (dolphindb)
- `--market`: 市场类型 (a/hk/futures/us等)
- `--batch-size`: 批量处理大小，默认1000
- `--codes`: 指定股票代码，多个代码用逗号分隔
- `--dry-run`: 只显示迁移计划，不实际执行

### 3. 迁移进度监控

迁移工具会显示详细的进度信息：

```
开始迁移市场: a
源数据库: sqlite
目标数据库: dolphindb
批量大小: 1000
预演模式: False
--------------------------------------------------
迁移股票信息: a
找到 156 个K线表需要迁移

[1/156] 迁移表: a_SH_000001_d -> a.SH.000001.d
  进度: 1000/5234 (19.1%)
  进度: 2000/5234 (38.2%)
  ...
  完成，迁移了 5234 条记录
```

## 🚀 性能优化

### 1. 内存配置

根据服务器内存调整配置：

```ini
# 8GB内存服务器
maxMemSize=6
regularArrayMemoryLimit=1024

# 16GB内存服务器
maxMemSize=12
regularArrayMemoryLimit=2048

# 32GB内存服务器
maxMemSize=24
regularArrayMemoryLimit=4096
```

### 2. 分区策略

对于大量数据，使用合适的分区策略：

```sql
-- 按日期分区（推荐）
db = database("chanlun_db", RANGE, 2020.01.01..2030.01.01)

-- 按股票代码分区
db = database("chanlun_db", HASH, [SYMBOL, 100])

-- 复合分区
db1 = database("", RANGE, 2020.01.01..2030.01.01)
db2 = database("", HASH, [SYMBOL, 50])
db = database("chanlun_db", COMPO, [db1, db2])
```

### 3. 查询优化

- 使用合适的索引
- 避免全表扫描
- 使用批量操作
- 合理设置缓存大小

## ❓ 常见问题

### 1. 连接失败

**问题**: 无法连接到DolphinDB服务器

**解决方案**:
- 检查DolphinDB服务是否启动
- 确认端口配置正确（默认8848）
- 检查防火墙设置
- 验证用户名密码

### 2. 内存不足

**问题**: DolphinDB报告内存不足

**解决方案**:
- 增加 `maxMemSize` 配置
- 调整 `regularArrayMemoryLimit`
- 使用批量处理减少内存占用
- 考虑分布式部署

### 3. 数据导入慢

**问题**: 数据迁移速度很慢

**解决方案**:
- 增加批量大小 `--batch-size`
- 使用SSD存储
- 调整网络缓冲区大小
- 并行导入多个表

### 4. 查询性能差

**问题**: 查询速度不理想

**解决方案**:
- 检查分区策略是否合理
- 添加适当的索引
- 优化查询条件
- 使用列式存储

### 5. 许可证问题

**问题**: 社区版功能限制

**解决方案**:
- 社区版支持单机部署
- 数据量限制在一定范围内
- 如需更多功能，考虑商业版

## 📚 参考资料

- [DolphinDB官方文档](https://www.dolphindb.cn/cn/help/)
- [DolphinDB Python API](https://github.com/dolphindb/python3_api_experimental)
- [DolphinDB教程](https://github.com/dolphindb/Tutorials_CN)
- [时序数据库最佳实践](https://www.dolphindb.cn/cn/help/BestPractices/index.html)

## 🆘 技术支持

如果在配置过程中遇到问题：

1. 查看DolphinDB日志文件
2. 检查系统配置是否正确
3. 参考官方文档和社区
4. 提交Issue到项目仓库

---

**注意**: DolphinDB是一个专业的时序数据库，建议在生产环境使用前进行充分的测试和性能调优。

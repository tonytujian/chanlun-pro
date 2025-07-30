# 期权组合配置系统

这是一个基于React + TypeScript + Ant Design的期权组合配置界面，支持T型报价展示、期权合约选择、组合保存和交易看板等功能。

## 功能特性

### 1. 期权组合配置
- **标的物选择**：支持300ETF、500ETF、1000ETF等多种期权标的
- **到期月份选择**：动态加载可用的到期月份
- **T型报价界面**：标准的期权T型报价布局
  - 左侧：看涨期权(Call)
  - 右侧：看跌期权(Put)  
  - 中间：行权价
- **期权合约选择**：每个期权前有复选框，支持多选
- **实时数据展示**：
  - 最新价、买卖价
  - 成交量、持仓量
  - 希腊字母(Delta、Gamma、Theta、Vega)
  - 隐含波动率

### 2. 组合管理
- **组合保存**：将选中的期权合约保存为组合
- **持仓方向**：支持买入/卖出方向选择
- **数量设置**：可设置每个合约的数量
- **组合统计**：实时计算组合总价值和希腊字母
- **组合列表**：查看已保存的期权组合

### 3. 交易看板
- **账户总览**：总资产、当日盈亏、可用资金、风险度
- **当日委托**：委托订单列表，支持一键撤单
- **成交明细**：完整的成交流水记录
- **持仓盈亏**：持仓详情和盈亏分析
- **希腊字母监控**：实时风险暴露监控

## 技术栈

- **前端**：React 18 + TypeScript + Ant Design 5
- **后端**：Python Flask + SQLAlchemy
- **数据库**：SQLite/MySQL
- **状态管理**：React Hooks
- **HTTP客户端**：Axios

## 安装和启动

### 1. 安装依赖

```bash
cd web/option_portfolio
npm install
```

### 2. 启动开发服务器

```bash
npm start
```

服务器将在 http://localhost:3000 启动

### 3. 启动后端服务

确保Flask后端服务已启动（通常在8080端口）

### 4. 访问应用

在浏览器中访问：
- 期权组合配置：http://localhost:3000/portfolio
- 交易看板：http://localhost:3000/dashboard

或通过Flask应用访问：
- http://localhost:8080/options/portfolio

## 项目结构

```
web/option_portfolio/
├── public/
│   └── index.html          # HTML模板
├── src/
│   ├── components/         # React组件
│   │   ├── UnderlyingSelector.tsx    # 标的物选择器
│   │   ├── TQuoteTable.tsx          # T型报价表格
│   │   └── PortfolioSaveModal.tsx   # 组合保存弹窗
│   ├── pages/             # 页面组件
│   │   ├── OptionPortfolioPage.tsx  # 期权组合配置页面
│   │   └── TradingDashboard.tsx     # 交易看板页面
│   ├── services/          # API服务
│   │   └── api.ts         # API接口定义
│   ├── types/             # TypeScript类型定义
│   │   └── index.ts       # 类型定义文件
│   ├── App.tsx            # 主应用组件
│   ├── index.tsx          # 应用入口
│   └── index.css          # 全局样式
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
└── README.md             # 项目说明
```

## API接口

### 期权相关接口

- `GET /api/options/underlyings` - 获取期权标的物列表
- `GET /api/options/expiry_months/{underlying}` - 获取到期月份列表
- `GET /api/options/contracts/{underlying}/{expiry_month}` - 获取期权合约T型报价
- `GET /api/options/portfolios` - 获取期权组合列表
- `POST /api/options/portfolios` - 创建期权组合
- `GET /api/options/portfolios/{id}` - 获取期权组合详情
- `DELETE /api/options/portfolios/{id}` - 删除期权组合

### 交易相关接口

- `GET /api/trading/orders` - 获取委托订单
- `GET /api/trading/records` - 获取成交记录
- `GET /api/trading/positions` - 获取持仓信息
- `GET /api/trading/account` - 获取账户信息
- `POST /api/trading/orders/{id}/cancel` - 撤销订单

## 数据库表结构

### 期权组合表 (cl_option_portfolio)
- 组合基本信息：名称、标的、到期月份、描述等

### 期权合约表 (cl_option_contract)
- 合约信息：代码、名称、类型、行权价等
- 行情数据：最新价、买卖价、成交量等
- 希腊字母：Delta、Gamma、Theta、Vega等

### 期权组合明细表 (cl_option_portfolio_item)
- 组合与合约的关联关系
- 持仓方向、数量、价格等

### 期权交易记录表 (cl_option_trade)
- 交易流水记录

## 使用说明

### 1. 配置期权组合

1. 选择标的物（如300ETF）
2. 选择到期月份（如2024年3月）
3. 在T型报价界面中勾选需要的期权合约
4. 查看顶部已选合约数量
5. 点击"保存期权组合"按钮
6. 在弹窗中设置组合名称、持仓方向和数量
7. 确认保存

### 2. 查看交易看板

1. 切换到"交易看板"标签页
2. 查看账户总览信息
3. 监控当日委托状态
4. 查看成交明细和持仓盈亏
5. 实时监控希腊字母风险暴露

## 开发说明

### 添加新的期权标的

在后端API中修改 `get_option_underlyings` 方法，添加新的标的物配置。

### 自定义希腊字母计算

在 `TQuoteTable` 组件中修改希腊字母的显示和计算逻辑。

### 扩展交易功能

在 `TradingDashboard` 组件中添加新的交易相关功能。

## 注意事项

1. 确保后端Flask服务正常运行
2. 数据库表需要正确创建
3. 期权数据需要实时更新
4. 生产环境需要配置正确的API地址
5. 建议使用HTTPS协议保证数据安全

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Tag, Space, Typography, Progress, Tabs } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { tradingApi } from '../services/api';
import { Order, TradeRecord, Position, AccountInfo } from '../types';
import GreekMonitor from '../components/GreekMonitor';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const TradingDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 加载所有数据
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, tradesRes, positionsRes, accountRes] = await Promise.all([
        tradingApi.getOrders(),
        tradingApi.getTradeRecords(),
        tradingApi.getPositions(),
        tradingApi.getAccountInfo(),
      ]);

      if (ordersRes.code === 0) setOrders(ordersRes.data || []);
      if (tradesRes.code === 0) setTrades(tradesRes.data || []);
      if (positionsRes.code === 0) setPositions(positionsRes.data || []);
      if (accountRes.code === 0) setAccountInfo(accountRes.data);
    } catch (error) {
      console.error('Failed to load trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 撤销订单
  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await tradingApi.cancelOrder(orderId);
      if (response.code === 0) {
        loadAllData(); // 重新加载数据
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  // 订单状态颜色映射
  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'green';
      case 'pending': return 'orange';
      case 'cancelled': return 'default';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  // 订单状态文本映射
  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'filled': return '全部成交';
      case 'pending': return '待成交';
      case 'cancelled': return '已撤单';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  // 委托订单列表列定义
  const orderColumns: ColumnsType<Order> = [
    {
      title: '合约',
      dataIndex: 'contract_name',
      key: 'contract_name',
      width: 150,
    },
    {
      title: '方向',
      dataIndex: 'order_type',
      key: 'order_type',
      width: 80,
      render: (type: string) => {
        const typeMap: { [key: string]: { text: string; color: string } } = {
          'buy_open': { text: '买开', color: 'red' },
          'sell_open': { text: '卖开', color: 'green' },
          'buy_close': { text: '买平', color: 'red' },
          'sell_close': { text: '卖平', color: 'green' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: '委托价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (price: number) => price.toFixed(4),
    },
    {
      title: '成交量',
      dataIndex: 'filled_quantity',
      key: 'filled_quantity',
      width: 80,
      align: 'right',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={getOrderStatusColor(status)}>
          {getOrderStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '委托时间',
      dataIndex: 'order_time',
      key: 'order_time',
      width: 120,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record: Order) => (
        record.status === 'pending' ? (
          <Button
            type="link"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleCancelOrder(record.id)}
            danger
          >
            撤单
          </Button>
        ) : null
      ),
    },
  ];

  // 成交记录列定义
  const tradeColumns: ColumnsType<TradeRecord> = [
    {
      title: '合约',
      dataIndex: 'contract_code',
      key: 'contract_code',
      width: 150,
    },
    {
      title: '方向',
      dataIndex: 'trade_type',
      key: 'trade_type',
      width: 80,
      render: (type: string) => {
        const typeMap: { [key: string]: { text: string; color: string } } = {
          'buy_open': { text: '买开', color: 'red' },
          'sell_open': { text: '卖开', color: 'green' },
          'buy_close': { text: '买平', color: 'red' },
          'sell_close': { text: '卖平', color: 'green' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: '成交价',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      align: 'right',
      render: (price: number) => price.toFixed(4),
    },
    {
      title: '成交额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount: number) => amount.toFixed(2),
    },
    {
      title: '手续费',
      dataIndex: 'commission',
      key: 'commission',
      width: 80,
      align: 'right',
      render: (commission: number) => commission.toFixed(2),
    },
    {
      title: '成交时间',
      dataIndex: 'trade_time',
      key: 'trade_time',
      width: 120,
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];

  // 持仓列定义
  const positionColumns: ColumnsType<Position> = [
    {
      title: '合约',
      dataIndex: 'contract_name',
      key: 'contract_name',
      width: 150,
    },
    {
      title: '方向',
      dataIndex: 'position_type',
      key: 'position_type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'long' ? 'red' : 'green'}>
          {type === 'long' ? '多头' : '空头'}
        </Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: '均价',
      dataIndex: 'avg_price',
      key: 'avg_price',
      width: 100,
      align: 'right',
      render: (price: number) => price.toFixed(4),
    },
    {
      title: '现价',
      dataIndex: 'current_price',
      key: 'current_price',
      width: 100,
      align: 'right',
      render: (price: number) => price.toFixed(4),
    },
    {
      title: '市值',
      dataIndex: 'market_value',
      key: 'market_value',
      width: 100,
      align: 'right',
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      width: 100,
      align: 'right',
      render: (pnl: number) => (
        <Text style={{ color: pnl >= 0 ? '#cf1322' : '#389e0d' }}>
          {pnl.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '盈亏率',
      dataIndex: 'pnl_rate',
      key: 'pnl_rate',
      width: 80,
      align: 'right',
      render: (rate: number) => (
        <Text style={{ color: rate >= 0 ? '#cf1322' : '#389e0d' }}>
          {(rate * 100).toFixed(2)}%
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2}>交易看板</Title>
          <Button icon={<ReloadOutlined />} onClick={loadAllData} loading={loading}>
            刷新数据
          </Button>
        </div>

        {/* 账户总览 */}
        {accountInfo && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总资产"
                  value={accountInfo.total_assets}
                  precision={2}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="当日盈亏"
                  value={accountInfo.daily_pnl}
                  precision={2}
                  valueStyle={{ color: accountInfo.daily_pnl >= 0 ? '#cf1322' : '#389e0d' }}
                  prefix={accountInfo.daily_pnl >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="可用资金"
                  value={accountInfo.available_cash}
                  precision={2}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Text>风险度</Text>
                  </div>
                  <Progress
                    percent={accountInfo.risk_ratio * 100}
                    status={accountInfo.risk_ratio > 0.8 ? 'exception' : 'normal'}
                    format={(percent) => `${percent?.toFixed(1)}%`}
                  />
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 当日委托 */}
        <Card title="当日委托" extra={<Text type="secondary">共 {orders.length} 笔</Text>}>
          <Table
            columns={orderColumns}
            dataSource={orders}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 成交明细 */}
        <Card title="成交明细" extra={<Text type="secondary">共 {trades.length} 笔</Text>}>
          <Table
            columns={tradeColumns}
            dataSource={trades}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* 持仓盈亏与希腊字母监控 */}
        <Card title="持仓分析">
          <Tabs defaultActiveKey="positions">
            <TabPane tab={`持仓盈亏 (${positions.length})`} key="positions">
              <Table
                columns={positionColumns}
                dataSource={positions}
                rowKey="contract_code"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
            <TabPane tab="希腊字母监控" key="greeks">
              <GreekMonitor
                positions={positions}
                underlyingPrice={accountInfo?.total_assets ? 3000 : undefined}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default TradingDashboard;

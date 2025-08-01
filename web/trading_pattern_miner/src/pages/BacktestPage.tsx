import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Typography,
  Row,
  Col,
  Statistic,
  Progress,
  Modal,
  Form,
  InputNumber,
  Select,
  Descriptions,
  Tabs,
  Alert
} from 'antd';
import { 
  PlayCircleOutlined, 
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  TrophyOutlined,
  LineChartOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import { EnhancedStockData, TradingStrategy, BacktestResult, Trade } from '../types';
import { WorkerManager } from '../utils/WorkerManager';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface BacktestPageProps {
  data: EnhancedStockData[];
  strategies: TradingStrategy[];
  backtestResults: { [strategyId: string]: BacktestResult };
  onBacktestComplete: (strategyId: string, result: BacktestResult) => void;
  onStrategyUpdate: (strategyId: string, updates: Partial<TradingStrategy>) => void;
  onStrategyRemove: (strategyId: string) => void;
  setLoading: (loading: boolean) => void;
  workerManager: WorkerManager;
}

const BacktestPage: React.FC<BacktestPageProps> = ({
  data,
  strategies,
  backtestResults,
  onBacktestComplete,
  onStrategyUpdate,
  onStrategyRemove,
  setLoading,
  workerManager
}) => {
  const [form] = Form.useForm();
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<BacktestResult | null>(null);

  // 策略表格列配置
  const strategyColumns: ColumnsType<TradingStrategy> = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TradingStrategy) => (
        <Space>
          <Text strong>{name}</Text>
          {backtestResults[record.id] && (
            <Tag color="green">已回测</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '买入条件',
      dataIndex: 'buyConditions',
      key: 'buyConditions',
      render: (conditions: any[]) => (
        <Tag color="blue">{conditions.length} 个条件</Tag>
      ),
    },
    {
      title: '卖出条件',
      dataIndex: 'sellConditions',
      key: 'sellConditions',
      render: (conditions: any[]) => (
        <Tag color="orange">{conditions.length} 个条件</Tag>
      ),
    },
    {
      title: '止损/止盈',
      key: 'stopLoss',
      render: (_, record: TradingStrategy) => (
        <Space>
          {record.stopLoss && (
            <Tag color="red">{(record.stopLoss * 100).toFixed(1)}%</Tag>
          )}
          {record.takeProfit && (
            <Tag color="green">{(record.takeProfit * 100).toFixed(1)}%</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '回测结果',
      key: 'backtest',
      render: (_, record: TradingStrategy) => {
        const result = backtestResults[record.id];
        if (!result) return <Text type="secondary">未回测</Text>;
        
        return (
          <Space direction="vertical" size="small">
            <Text style={{ color: result.totalReturn >= 0 ? '#52c41a' : '#ff4d4f' }}>
              收益: {(result.totalReturn * 100).toFixed(2)}%
            </Text>
            <Text type="secondary">
              胜率: {(result.winRate * 100).toFixed(1)}%
            </Text>
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: TradingStrategy) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRunBacktest(record.id)}
            loading={isBacktesting && selectedStrategy === record.id}
          >
            回测
          </Button>
          {backtestResults[record.id] && (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewResult(backtestResults[record.id])}
            >
              详情
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStrategy(record)}
          >
            编辑
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteStrategy(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 运行回测
  const handleRunBacktest = useCallback(async (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    if (data.length === 0) {
      Modal.error({
        title: '数据不足',
        content: '请先导入股票数据后再进行回测'
      });
      return;
    }

    setIsBacktesting(true);
    setSelectedStrategy(strategyId);
    setLoading(true);
    setBacktestProgress(0);

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setBacktestProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 100);

    try {
      const response = await workerManager.sendMessage('backtest', {
        type: 'BACKTEST',
        payload: {
          strategy: strategy,
          data: data,
          initialCapital: 100000,
          commission: 0.001
        },
        id: 'backtest_' + strategyId
      });

      clearInterval(progressInterval);
      setBacktestProgress(100);

      const result = response.payload as BacktestResult;
      onBacktestComplete(strategyId, result);
      
      Modal.success({
        title: '回测完成',
        content: `策略 "${strategy.name}" 回测完成，总收益率: ${(result.totalReturn * 100).toFixed(2)}%`
      });

    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('回测失败:', error);
      Modal.error({
        title: '回测失败',
        content: error.message || '回测过程中发生未知错误'
      });
    } finally {
      setIsBacktesting(false);
      setSelectedStrategy('');
      setLoading(false);
      setBacktestProgress(0);
    }
  }, [data, strategies, onBacktestComplete, setLoading, workerManager]);

  // 查看回测结果
  const handleViewResult = useCallback((result: BacktestResult) => {
    setSelectedResult(result);
    setDetailModalVisible(true);
  }, []);

  // 编辑策略
  const handleEditStrategy = useCallback((strategy: TradingStrategy) => {
    form.setFieldsValue({
      stopLoss: strategy.stopLoss ? strategy.stopLoss * 100 : undefined,
      takeProfit: strategy.takeProfit ? strategy.takeProfit * 100 : undefined,
      maxHoldDays: strategy.maxHoldDays
    });
    setSelectedStrategy(strategy.id);
    setConfigModalVisible(true);
  }, [form]);

  // 删除策略
  const handleDeleteStrategy = useCallback((strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除策略 "${strategy.name}" 吗？此操作不可恢复。`,
      onOk: () => {
        onStrategyRemove(strategyId);
      }
    });
  }, [strategies, onStrategyRemove]);

  // 保存策略配置
  const handleSaveConfig = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      onStrategyUpdate(selectedStrategy, {
        stopLoss: values.stopLoss ? values.stopLoss / 100 : undefined,
        takeProfit: values.takeProfit ? values.takeProfit / 100 : undefined,
        maxHoldDays: values.maxHoldDays
      });

      setConfigModalVisible(false);
      Modal.success({
        title: '保存成功',
        content: '策略参数已更新'
      });
    } catch (error) {
      console.error('保存失败:', error);
    }
  }, [form, selectedStrategy, onStrategyUpdate]);

  // 资金曲线图配置
  const equityCurveOption = useMemo(() => {
    if (!selectedResult || !selectedResult.equityCurve.length) return {};

    const dates = selectedResult.equityCurve.map(item => item.date);
    const equity = selectedResult.equityCurve.map(item => item.equity);
    const drawdown = selectedResult.drawdownCurve.map(item => -item.drawdown * 100);

    return {
      title: {
        text: '资金曲线与回撤',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['资金曲线', '回撤'],
        top: 30
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          top: '15%',
          height: '50%'
        },
        {
          left: '10%',
          right: '8%',
          top: '70%',
          height: '25%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          boundaryGap: false,
          axisLabel: { show: false }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: '资金'
        },
        {
          type: 'value',
          gridIndex: 1,
          name: '回撤(%)',
          max: 0
        }
      ],
      series: [
        {
          name: '资金曲线',
          type: 'line',
          data: equity,
          smooth: true,
          lineStyle: { color: '#1890ff' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
              ]
            }
          }
        },
        {
          name: '回撤',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: drawdown,
          smooth: true,
          lineStyle: { color: '#ff4d4f' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 77, 79, 0.3)' },
                { offset: 1, color: 'rgba(255, 77, 79, 0.1)' }
              ]
            }
          }
        }
      ]
    };
  }, [selectedResult]);

  // 交易记录表格列配置
  const tradeColumns: ColumnsType<Trade> = [
    {
      title: '入场日期',
      dataIndex: 'entryDate',
      key: 'entryDate',
      width: 100,
    },
    {
      title: '出场日期',
      dataIndex: 'exitDate',
      key: 'exitDate',
      width: 100,
    },
    {
      title: '入场价格',
      dataIndex: 'entryPrice',
      key: 'entryPrice',
      width: 80,
      render: (price: number) => price.toFixed(2),
    },
    {
      title: '出场价格',
      dataIndex: 'exitPrice',
      key: 'exitPrice',
      width: 80,
      render: (price: number) => price.toFixed(2),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
    },
    {
      title: '收益率',
      dataIndex: 'return',
      key: 'return',
      width: 80,
      render: (returnRate: number) => (
        <Text style={{ color: returnRate >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {(returnRate * 100).toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '盈亏',
      dataIndex: 'pnl',
      key: 'pnl',
      width: 80,
      render: (pnl: number) => (
        <Text style={{ color: pnl >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {pnl.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '持有天数',
      dataIndex: 'holdDays',
      key: 'holdDays',
      width: 80,
    },
    {
      title: '出场原因',
      dataIndex: 'exitReason',
      key: 'exitReason',
      width: 80,
      render: (reason: string) => {
        const colorMap: { [key: string]: string } = {
          'SIGNAL': 'blue',
          'STOP_LOSS': 'red',
          'TAKE_PROFIT': 'green',
          'MAX_HOLD': 'orange'
        };
        const textMap: { [key: string]: string } = {
          'SIGNAL': '信号',
          'STOP_LOSS': '止损',
          'TAKE_PROFIT': '止盈',
          'MAX_HOLD': '到期'
        };
        return <Tag color={colorMap[reason]}>{textMap[reason] || reason}</Tag>;
      },
    },
  ];

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <BarChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
        <Title level={3} style={{ color: '#999', marginTop: '16px' }}>
          暂无数据
        </Title>
        <Text type="secondary">
          请先在"数据导入"页面上传股票数据
        </Text>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <TrophyOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
        <Title level={3} style={{ color: '#999', marginTop: '16px' }}>
          暂无策略
        </Title>
        <Text type="secondary">
          请先在"策略生成"页面创建交易策略
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>策略回测</Title>
      <Paragraph>
        对交易策略进行历史数据回测，评估策略的盈利能力、风险控制和稳定性。
        系统会模拟真实交易环境，包括交易成本、滑点等因素。
      </Paragraph>

      {isBacktesting && (
        <Alert
          message="正在进行回测"
          description={
            <div>
              <Progress percent={backtestProgress} status="active" />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                正在计算策略表现，请稍候...
              </Text>
            </div>
          }
          type="info"
          style={{ marginBottom: 24 }}
        />
      )}

      {/* 策略列表 */}
      <Card title="策略列表">
        <Table
          columns={strategyColumns}
          dataSource={strategies}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 回测结果统计 */}
      {Object.keys(backtestResults).length > 0 && (
        <Card title="回测结果统计" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]}>
            {Object.entries(backtestResults).map(([strategyId, result]) => {
              const strategy = strategies.find(s => s.id === strategyId);
              if (!strategy) return null;

              return (
                <Col xs={24} sm={12} md={8} lg={6} key={strategyId}>
                  <Card size="small" hoverable onClick={() => handleViewResult(result)}>
                    <Statistic
                      title={strategy.name}
                      value={result.totalReturn * 100}
                      precision={2}
                      suffix="%"
                      valueStyle={{ 
                        color: result.totalReturn >= 0 ? '#3f8600' : '#cf1322',
                        fontSize: '18px'
                      }}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          胜率: {(result.winRate * 100).toFixed(1)}%
                        </Text>
                        <Text type="secondary">
                          夏普: {result.sharpeRatio.toFixed(2)}
                        </Text>
                        <Text type="secondary">
                          回撤: {(result.maxDrawdown * 100).toFixed(1)}%
                        </Text>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {/* 策略配置弹窗 */}
      <Modal
        title="策略参数配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={handleSaveConfig}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="stopLoss"
            label="止损比例 (%)"
          >
            <InputNumber
              min={0}
              max={50}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="不设置则不止损"
            />
          </Form.Item>

          <Form.Item
            name="takeProfit"
            label="止盈比例 (%)"
          >
            <InputNumber
              min={0}
              max={100}
              step={0.1}
              style={{ width: '100%' }}
              placeholder="不设置则不止盈"
            />
          </Form.Item>

          <Form.Item
            name="maxHoldDays"
            label="最大持有天数"
          >
            <InputNumber
              min={1}
              max={365}
              style={{ width: '100%' }}
              placeholder="不设置则无限制"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 回测详情弹窗 */}
      <Modal
        title="回测详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1200}
      >
        {selectedResult && (
          <Tabs defaultActiveKey="overview">
            <TabPane tab="概览" key="overview">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic
                    title="总收益率"
                    value={selectedResult.totalReturn * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color: selectedResult.totalReturn >= 0 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="年化收益率"
                    value={selectedResult.annualizedReturn * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color: selectedResult.annualizedReturn >= 0 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="夏普比率"
                    value={selectedResult.sharpeRatio}
                    precision={2}
                    valueStyle={{
                      color: selectedResult.sharpeRatio >= 1 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="最大回撤"
                    value={selectedResult.maxDrawdown * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="胜率"
                    value={selectedResult.winRate * 100}
                    precision={1}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总交易次数"
                    value={selectedResult.totalTrades}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="盈利交易"
                    value={selectedResult.profitableTrades}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="平均收益"
                    value={selectedResult.averageReturn * 100}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color: selectedResult.averageReturn >= 0 ? '#3f8600' : '#cf1322'
                    }}
                  />
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="资金曲线" key="equity">
              <div style={{ height: '400px' }}>
                <ReactECharts
                  option={equityCurveOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </TabPane>

            <TabPane tab="交易记录" key="trades">
              <Table
                columns={tradeColumns}
                dataSource={selectedResult.trades}
                rowKey={(record, index) => index?.toString() || '0'}
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ y: 400 }}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
};

export default BacktestPage;

import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Form, 
  InputNumber, 
  Progress, 
  List, 
  Space, 
  Typography,
  Row,
  Col,
  Alert,
  Tag,
  Tooltip,
  Modal,
  Descriptions,
  Radio,
  Divider,
  Statistic
} from 'antd';
import { 
  SettingOutlined, 
  PlayCircleOutlined,
  StopOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  TrophyOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { EnhancedStockData, TradingStrategy, OptimizationResult, OptimizationParameter } from '../types';
import { WorkerManager } from '../utils/WorkerManager';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface OptimizationPageProps {
  data: EnhancedStockData[];
  strategies: TradingStrategy[];
  onOptimizationComplete: (results: OptimizationResult[]) => void;
  setLoading: (loading: boolean) => void;
  workerManager: WorkerManager;
}

const OptimizationPage: React.FC<OptimizationPageProps> = ({
  data,
  strategies,
  onOptimizationComplete,
  setLoading,
  workerManager
}) => {
  const [form] = Form.useForm();
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [currentProgress, setCurrentProgress] = useState({ completed: 0, total: 0 });
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<OptimizationResult | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 获取可优化的参数
  const getOptimizableParameters = (): OptimizationParameter[] => {
    return [
      {
        name: 'stopLoss',
        type: 'number',
        min: 0.01,
        max: 0.2,
        step: 0.01,
        current: 0.05
      },
      {
        name: 'takeProfit',
        type: 'number',
        min: 0.02,
        max: 0.5,
        step: 0.02,
        current: 0.1
      },
      {
        name: 'maxHoldDays',
        type: 'number',
        min: 1,
        max: 30,
        step: 1,
        current: 10
      }
    ];
  };

  // 开始参数优化
  const handleStartOptimization = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (!selectedStrategy) {
        Modal.error({
          title: '请选择策略',
          content: '请先选择要优化的策略'
        });
        return;
      }

      const strategy = strategies.find(s => s.id === selectedStrategy);
      if (!strategy) return;

      if (data.length === 0) {
        Modal.error({
          title: '数据不足',
          content: '请先导入股票数据后再进行优化'
        });
        return;
      }

      setIsOptimizing(true);
      setLoading(true);
      setOptimizationProgress(0);
      setCurrentProgress({ completed: 0, total: 0 });
      setOptimizationResults([]);

      // 构建参数配置
      const parameters: { [key: string]: OptimizationParameter } = {};
      
      if (values.optimizeStopLoss) {
        parameters.stopLoss = {
          name: 'stopLoss',
          type: 'number',
          min: values.stopLossMin / 100,
          max: values.stopLossMax / 100,
          step: values.stopLossStep / 100,
          current: strategy.stopLoss || 0.05
        };
      }

      if (values.optimizeTakeProfit) {
        parameters.takeProfit = {
          name: 'takeProfit',
          type: 'number',
          min: values.takeProfitMin / 100,
          max: values.takeProfitMax / 100,
          step: values.takeProfitStep / 100,
          current: strategy.takeProfit || 0.1
        };
      }

      if (values.optimizeMaxHoldDays) {
        parameters.maxHoldDays = {
          name: 'maxHoldDays',
          type: 'number',
          min: values.maxHoldDaysMin,
          max: values.maxHoldDaysMax,
          step: values.maxHoldDaysStep,
          current: strategy.maxHoldDays || 10
        };
      }

      // 监听进度更新
      const progressHandler = (response: any) => {
        if (response.type === 'OPTIMIZATION_PROGRESS') {
          const { completed, total, bestFitness } = response.payload;
          setCurrentProgress({ completed, total });
          setOptimizationProgress((completed / total) * 100);
        }
      };

      // 临时添加进度监听器
      const originalHandler = workerManager['messageHandlers']['progress'];
      workerManager['messageHandlers']['progress'] = progressHandler;

      const response = await workerManager.sendMessage('optimization', {
        type: 'OPTIMIZE',
        payload: {
          strategy: strategy,
          data: data,
          parameters: parameters,
          method: values.method
        },
        id: 'optimize_' + selectedStrategy
      });

      // 恢复原始处理器
      if (originalHandler) {
        workerManager['messageHandlers']['progress'] = originalHandler;
      } else {
        delete workerManager['messageHandlers']['progress'];
      }

      const results = response.payload as OptimizationResult[];
      setOptimizationResults(results);
      onOptimizationComplete(results);
      
      Modal.success({
        title: '参数优化完成',
        content: `找到 ${results.length} 组优化结果，最佳适应度: ${results[0]?.fitness.toFixed(2) || 'N/A'}`
      });

    } catch (error: any) {
      console.error('参数优化失败:', error);
      Modal.error({
        title: '参数优化失败',
        content: error.message || '优化过程中发生未知错误'
      });
    } finally {
      setIsOptimizing(false);
      setLoading(false);
      setOptimizationProgress(0);
    }
  }, [selectedStrategy, strategies, data, form, setLoading, workerManager, onOptimizationComplete]);

  // 停止优化
  const handleStopOptimization = useCallback(() => {
    setIsOptimizing(false);
    setLoading(false);
    setOptimizationProgress(0);
  }, [setLoading]);

  // 查看优化结果详情
  const handleViewResult = useCallback((result: OptimizationResult) => {
    setSelectedResult(result);
    setDetailModalVisible(true);
  }, []);

  // 获取适应度颜色
  const getFitnessColor = (fitness: number) => {
    if (fitness >= 80) return '#52c41a';
    if (fitness >= 60) return '#faad14';
    if (fitness >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  // 优化结果图表配置
  const optimizationChartOption = React.useMemo(() => {
    if (optimizationResults.length === 0) return {};

    const data = optimizationResults.map((result, index) => [
      index + 1,
      result.fitness,
      result.backtest.totalReturn * 100,
      result.backtest.winRate * 100,
      result.backtest.maxDrawdown * 100
    ]);

    return {
      title: {
        text: '参数优化结果分布',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['适应度', '总收益率(%)', '胜率(%)', '最大回撤(%)'],
        top: 30
      },
      grid: {
        left: '10%',
        right: '8%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        name: '参数组合序号'
      },
      yAxis: {
        type: 'value',
        name: '数值'
      },
      series: [
        {
          name: '适应度',
          type: 'scatter',
          data: data.map(d => [d[0], d[1]]),
          symbolSize: 8,
          itemStyle: { color: '#1890ff' }
        },
        {
          name: '总收益率(%)',
          type: 'scatter',
          data: data.map(d => [d[0], d[2]]),
          symbolSize: 6,
          itemStyle: { color: '#52c41a' }
        },
        {
          name: '胜率(%)',
          type: 'scatter',
          data: data.map(d => [d[0], d[3]]),
          symbolSize: 6,
          itemStyle: { color: '#faad14' }
        },
        {
          name: '最大回撤(%)',
          type: 'scatter',
          data: data.map(d => [d[0], -d[4]]),
          symbolSize: 6,
          itemStyle: { color: '#ff4d4f' }
        }
      ]
    };
  }, [optimizationResults]);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <SettingOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
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
      <Title level={2}>参数优化</Title>
      <Paragraph>
        通过网格搜索或贝叶斯优化算法，自动寻找策略的最佳参数组合。
        系统会在指定的参数范围内进行搜索，找到使策略表现最优的参数设置。
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="优化配置" icon={<SettingOutlined />}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                method: 'grid',
                optimizeStopLoss: true,
                stopLossMin: 2,
                stopLossMax: 10,
                stopLossStep: 1,
                optimizeTakeProfit: true,
                takeProfitMin: 5,
                takeProfitMax: 25,
                takeProfitStep: 2,
                optimizeMaxHoldDays: false,
                maxHoldDaysMin: 5,
                maxHoldDaysMax: 30,
                maxHoldDaysStep: 5
              }}
            >
              <Form.Item
                name="strategy"
                label="选择策略"
                rules={[{ required: true, message: '请选择要优化的策略' }]}
              >
                <Select
                  placeholder="选择策略"
                  value={selectedStrategy}
                  onChange={setSelectedStrategy}
                >
                  {strategies.map(strategy => (
                    <Option key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="method"
                label={
                  <Space>
                    优化方法
                    <Tooltip title="网格搜索：遍历所有参数组合；贝叶斯优化：智能搜索最优参数">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Radio.Group>
                  <Radio value="grid">网格搜索</Radio>
                  <Radio value="bayesian" disabled>贝叶斯优化</Radio>
                </Radio.Group>
              </Form.Item>

              <Divider>参数范围设置</Divider>

              <Form.Item name="optimizeStopLoss" valuePropName="checked">
                <Space>
                  <input type="checkbox" />
                  <Text strong>优化止损比例</Text>
                </Space>
              </Form.Item>

              <Form.Item dependencies={['optimizeStopLoss']}>
                {({ getFieldValue }) => {
                  const optimizeStopLoss = getFieldValue('optimizeStopLoss');
                  return optimizeStopLoss ? (
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="stopLossMin" label="最小值(%)">
                          <InputNumber min={0.1} max={20} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="stopLossMax" label="最大值(%)">
                          <InputNumber min={0.1} max={20} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="stopLossStep" label="步长(%)">
                          <InputNumber min={0.1} max={5} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item name="optimizeTakeProfit" valuePropName="checked">
                <Space>
                  <input type="checkbox" />
                  <Text strong>优化止盈比例</Text>
                </Space>
              </Form.Item>

              <Form.Item dependencies={['optimizeTakeProfit']}>
                {({ getFieldValue }) => {
                  const optimizeTakeProfit = getFieldValue('optimizeTakeProfit');
                  return optimizeTakeProfit ? (
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="takeProfitMin" label="最小值(%)">
                          <InputNumber min={1} max={50} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="takeProfitMax" label="最大值(%)">
                          <InputNumber min={1} max={50} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="takeProfitStep" label="步长(%)">
                          <InputNumber min={1} max={10} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item name="optimizeMaxHoldDays" valuePropName="checked">
                <Space>
                  <input type="checkbox" />
                  <Text strong>优化最大持有天数</Text>
                </Space>
              </Form.Item>

              <Form.Item dependencies={['optimizeMaxHoldDays']}>
                {({ getFieldValue }) => {
                  const optimizeMaxHoldDays = getFieldValue('optimizeMaxHoldDays');
                  return optimizeMaxHoldDays ? (
                    <Row gutter={8}>
                      <Col span={8}>
                        <Form.Item name="maxHoldDaysMin" label="最小值">
                          <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="maxHoldDaysMax" label="最大值">
                          <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="maxHoldDaysStep" label="步长">
                          <InputNumber min={1} max={10} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStartOptimization}
                    loading={isOptimizing}
                    disabled={isOptimizing}
                    style={{ flex: 1 }}
                  >
                    开始优化
                  </Button>
                  {isOptimizing && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStopOptimization}
                    >
                      停止
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>

            {isOptimizing && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={optimizationProgress}
                  status="active"
                  format={() => `${currentProgress.completed}/${currentProgress.total}`}
                />
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Text type="secondary">
                    已完成: {currentProgress.completed}/{currentProgress.total}
                  </Text>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title={`优化结果 (${optimizationResults.length})`}
            extra={
              optimizationResults.length > 0 && (
                <Text type="secondary">
                  按适应度排序
                </Text>
              )
            }
          >
            {optimizationResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <LineChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">暂无优化结果</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击"开始优化"按钮进行参数优化
                  </Text>
                </div>
              </div>
            ) : (
              <>
                <div style={{ height: '300px', marginBottom: 16 }}>
                  <ReactECharts
                    option={optimizationChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>

                <List
                  dataSource={optimizationResults.slice(0, 10)}
                  renderItem={(result, index) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewResult(result)}
                        >
                          详情
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>#{index + 1} 参数组合</Text>
                            <Tag color={getFitnessColor(result.fitness)}>
                              适应度: {result.fitness.toFixed(2)}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size="small">
                            <Space wrap>
                              {Object.entries(result.parameters).map(([key, value]) => (
                                <Tag key={key}>
                                  {key}: {typeof value === 'number' ? value.toFixed(3) : value}
                                </Tag>
                              ))}
                            </Space>
                            <Space wrap>
                              <Tag color="green">
                                收益: {(result.backtest.totalReturn * 100).toFixed(2)}%
                              </Tag>
                              <Tag color="blue">
                                胜率: {(result.backtest.winRate * 100).toFixed(1)}%
                              </Tag>
                              <Tag color="red">
                                回撤: {(result.backtest.maxDrawdown * 100).toFixed(1)}%
                              </Tag>
                            </Space>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* 优化结果详情弹窗 */}
      <Modal
        title="优化结果详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedResult && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="适应度评分">
                <Tag color={getFitnessColor(selectedResult.fitness)}>
                  {selectedResult.fitness.toFixed(2)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="总收益率">
                <Text style={{ color: selectedResult.backtest.totalReturn >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {(selectedResult.backtest.totalReturn * 100).toFixed(2)}%
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="年化收益率">
                <Text style={{ color: selectedResult.backtest.annualizedReturn >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {(selectedResult.backtest.annualizedReturn * 100).toFixed(2)}%
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="夏普比率">
                {selectedResult.backtest.sharpeRatio.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="最大回撤">
                <Text style={{ color: '#ff4d4f' }}>
                  {(selectedResult.backtest.maxDrawdown * 100).toFixed(2)}%
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="胜率">
                {(selectedResult.backtest.winRate * 100).toFixed(1)}%
              </Descriptions.Item>
              <Descriptions.Item label="总交易次数">
                {selectedResult.backtest.totalTrades}
              </Descriptions.Item>
              <Descriptions.Item label="盈利交易">
                {selectedResult.backtest.profitableTrades}
              </Descriptions.Item>
            </Descriptions>

            <Divider>优化参数</Divider>

            <Row gutter={[16, 16]}>
              {Object.entries(selectedResult.parameters).map(([key, value]) => (
                <Col span={8} key={key}>
                  <Card size="small">
                    <Statistic
                      title={key}
                      value={typeof value === 'number' ? value : String(value)}
                      precision={typeof value === 'number' ? 4 : 0}
                      formatter={(val) => {
                        if (key.includes('Loss') || key.includes('Profit')) {
                          return `${(Number(val) * 100).toFixed(2)}%`;
                        }
                        return String(val);
                      }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OptimizationPage;

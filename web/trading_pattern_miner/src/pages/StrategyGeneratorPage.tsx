import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Form, 
  InputNumber, 
  Progress, 
  List, 
  Tag, 
  Space, 
  Typography,
  Row,
  Col,
  Alert,
  Divider,
  Tooltip,
  Modal,
  Descriptions
} from 'antd';
import { 
  RobotOutlined, 
  PlayCircleOutlined,
  StopOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { EnhancedStockData, TradingStrategy, GeneticIndividual } from '../types';
import { WorkerManager } from '../utils/WorkerManager';

const { Title, Text, Paragraph } = Typography;

interface StrategyGeneratorPageProps {
  data: EnhancedStockData[];
  onStrategyGenerated: (strategy: TradingStrategy) => void;
  setLoading: (loading: boolean) => void;
  workerManager: WorkerManager;
}

const StrategyGeneratorPage: React.FC<StrategyGeneratorPageProps> = ({
  data,
  onStrategyGenerated,
  setLoading,
  workerManager
}) => {
  const [form] = Form.useForm();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [totalGenerations, setTotalGenerations] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [generatedStrategies, setGeneratedStrategies] = useState<TradingStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 开始生成策略
  const handleGenerateStrategies = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (data.length === 0) {
        Modal.error({
          title: '数据不足',
          content: '请先导入股票数据后再生成策略'
        });
        return;
      }

      setIsGenerating(true);
      setLoading(true);
      setGenerationProgress(0);
      setCurrentGeneration(0);
      setTotalGenerations(values.generations);
      setBestFitness(0);
      setGeneratedStrategies([]);

      // 监听进度更新
      const progressHandler = (response: any) => {
        if (response.type === 'GENERATION_PROGRESS') {
          const { generation, totalGenerations, bestFitness } = response.payload;
          setCurrentGeneration(generation);
          setTotalGenerations(totalGenerations);
          setBestFitness(bestFitness);
          setGenerationProgress((generation / totalGenerations) * 100);
        }
      };

      // 临时添加进度监听器
      const originalHandler = workerManager['messageHandlers']['progress'];
      workerManager['messageHandlers']['progress'] = progressHandler;

      const response = await workerManager.sendMessage('strategies', {
        type: 'GENERATE_STRATEGIES',
        payload: {
          data: data,
          populationSize: values.populationSize,
          generations: values.generations,
          mutationRate: values.mutationRate,
          crossoverRate: values.crossoverRate
        },
        id: 'generate_strategies'
      });

      // 恢复原始处理器
      if (originalHandler) {
        workerManager['messageHandlers']['progress'] = originalHandler;
      } else {
        delete workerManager['messageHandlers']['progress'];
      }

      const strategies = response.payload as TradingStrategy[];
      setGeneratedStrategies(strategies);
      
      Modal.success({
        title: '策略生成完成',
        content: `成功生成 ${strategies.length} 个交易策略，请查看结果并选择合适的策略。`
      });

    } catch (error: any) {
      console.error('策略生成失败:', error);
      Modal.error({
        title: '策略生成失败',
        content: error.message || '生成过程中发生未知错误'
      });
    } finally {
      setIsGenerating(false);
      setLoading(false);
      setGenerationProgress(0);
    }
  }, [data, form, setLoading, workerManager]);

  // 停止生成
  const handleStopGeneration = useCallback(() => {
    setIsGenerating(false);
    setLoading(false);
    setGenerationProgress(0);
  }, [setLoading]);

  // 查看策略详情
  const handleViewStrategy = useCallback((strategy: TradingStrategy) => {
    setSelectedStrategy(strategy);
    setDetailModalVisible(true);
  }, []);

  // 保存策略
  const handleSaveStrategy = useCallback((strategy: TradingStrategy) => {
    onStrategyGenerated(strategy);
    Modal.success({
      title: '策略已保存',
      content: `策略 "${strategy.name}" 已添加到策略列表中`
    });
  }, [onStrategyGenerated]);

  // 格式化条件显示
  const formatCondition = (condition: any) => {
    return `${condition.indicator} ${condition.operator} ${condition.value}`;
  };

  // 获取适应度颜色
  const getFitnessColor = (fitness: number) => {
    if (fitness >= 80) return '#52c41a';
    if (fitness >= 60) return '#faad14';
    if (fitness >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <RobotOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
        <Title level={3} style={{ color: '#999', marginTop: '16px' }}>
          暂无数据
        </Title>
        <Text type="secondary">
          请先在"数据导入"页面上传股票数据
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>自动策略生成</Title>
      <Paragraph>
        使用遗传算法自动生成交易策略。系统将基于历史数据评估策略表现，
        通过选择、交叉、变异等操作不断优化策略参数，最终生成表现优秀的交易策略。
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card title="生成参数" icon={<RobotOutlined />}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                populationSize: 50,
                generations: 20,
                mutationRate: 0.1,
                crossoverRate: 0.8
              }}
            >
              <Form.Item
                name="populationSize"
                label={
                  <Space>
                    种群大小
                    <Tooltip title="每一代中个体的数量，数量越大搜索范围越广但计算时间越长">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入种群大小' }]}
              >
                <InputNumber
                  min={10}
                  max={200}
                  style={{ width: '100%' }}
                  placeholder="建议20-100"
                />
              </Form.Item>

              <Form.Item
                name="generations"
                label={
                  <Space>
                    进化代数
                    <Tooltip title="算法运行的代数，代数越多优化效果越好但时间越长">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入进化代数' }]}
              >
                <InputNumber
                  min={5}
                  max={100}
                  style={{ width: '100%' }}
                  placeholder="建议10-50"
                />
              </Form.Item>

              <Form.Item
                name="mutationRate"
                label={
                  <Space>
                    变异率
                    <Tooltip title="个体发生变异的概率，影响算法的探索能力">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入变异率' }]}
              >
                <InputNumber
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  style={{ width: '100%' }}
                  placeholder="建议0.05-0.2"
                />
              </Form.Item>

              <Form.Item
                name="crossoverRate"
                label={
                  <Space>
                    交叉率
                    <Tooltip title="个体进行交叉的概率，影响算法的收敛速度">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入交叉率' }]}
              >
                <InputNumber
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="建议0.6-0.9"
                />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={handleGenerateStrategies}
                    loading={isGenerating}
                    disabled={isGenerating}
                    style={{ flex: 1 }}
                  >
                    开始生成
                  </Button>
                  {isGenerating && (
                    <Button
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStopGeneration}
                    >
                      停止
                    </Button>
                  )}
                </Space>
              </Form.Item>
            </Form>

            {isGenerating && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={generationProgress}
                  status="active"
                  format={() => `${currentGeneration}/${totalGenerations}`}
                />
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Text type="secondary">
                    当前代数: {currentGeneration}/{totalGenerations}
                  </Text>
                  <br />
                  <Text type="secondary">
                    最佳适应度: {bestFitness.toFixed(2)}
                  </Text>
                </div>
              </div>
            )}
          </Card>

          <Card title="算法说明" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text strong>遗传算法流程：</Text>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li>初始化随机策略种群</li>
                <li>评估每个策略的适应度</li>
                <li>选择优秀个体进行繁殖</li>
                <li>通过交叉产生新个体</li>
                <li>对新个体进行变异</li>
                <li>重复2-5步直到达到指定代数</li>
              </ol>
              
              <Divider />
              
              <Text strong>适应度评估标准：</Text>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>总收益率 (40%权重)</li>
                <li>胜率 (30%权重)</li>
                <li>夏普比率 (20%权重)</li>
                <li>最大回撤 (10%权重)</li>
              </ul>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title={`生成的策略 (${generatedStrategies.length})`}
            extra={
              generatedStrategies.length > 0 && (
                <Text type="secondary">
                  按适应度排序
                </Text>
              )
            }
          >
            {generatedStrategies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RobotOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">暂无生成的策略</Text>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    点击"开始生成"按钮创建交易策略
                  </Text>
                </div>
              </div>
            ) : (
              <List
                dataSource={generatedStrategies}
                renderItem={(strategy, index) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewStrategy(strategy)}
                      >
                        详情
                      </Button>,
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => handleSaveStrategy(strategy)}
                      >
                        保存
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>#{index + 1} {strategy.name}</Text>
                          <Tag 
                            color={getFitnessColor(strategy.fitness || 0)}
                          >
                            适应度: {strategy.fitness?.toFixed(2) || 'N/A'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small">
                          <Text type="secondary">{strategy.description}</Text>
                          <Space wrap>
                            <Tag>买入条件: {strategy.buyConditions.length}</Tag>
                            <Tag>卖出条件: {strategy.sellConditions.length}</Tag>
                            {strategy.stopLoss && (
                              <Tag color="red">止损: {(strategy.stopLoss * 100).toFixed(1)}%</Tag>
                            )}
                            {strategy.takeProfit && (
                              <Tag color="green">止盈: {(strategy.takeProfit * 100).toFixed(1)}%</Tag>
                            )}
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 策略详情弹窗 */}
      <Modal
        title={`策略详情 - ${selectedStrategy?.name}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => {
              if (selectedStrategy) {
                handleSaveStrategy(selectedStrategy);
                setDetailModalVisible(false);
              }
            }}
          >
            保存策略
          </Button>
        ]}
        width={800}
      >
        {selectedStrategy && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="策略名称" span={2}>
              {selectedStrategy.name}
            </Descriptions.Item>
            <Descriptions.Item label="适应度评分">
              <Tag color={getFitnessColor(selectedStrategy.fitness || 0)}>
                {selectedStrategy.fitness?.toFixed(2) || 'N/A'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="策略描述" span={2}>
              {selectedStrategy.description}
            </Descriptions.Item>
            <Descriptions.Item label="止损比例">
              {selectedStrategy.stopLoss ? `${(selectedStrategy.stopLoss * 100).toFixed(1)}%` : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="止盈比例">
              {selectedStrategy.takeProfit ? `${(selectedStrategy.takeProfit * 100).toFixed(1)}%` : '无'}
            </Descriptions.Item>
            <Descriptions.Item label="最大持有天数">
              {selectedStrategy.maxHoldDays || '无限制'}
            </Descriptions.Item>
            <Descriptions.Item label="买入条件" span={2}>
              <Space direction="vertical" size="small">
                {selectedStrategy.buyConditions.map((condition, index) => (
                  <Tag key={index} color="blue">
                    {formatCondition(condition)}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="卖出条件" span={2}>
              <Space direction="vertical" size="small">
                {selectedStrategy.sellConditions.map((condition, index) => (
                  <Tag key={index} color="orange">
                    {formatCondition(condition)}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default StrategyGeneratorPage;

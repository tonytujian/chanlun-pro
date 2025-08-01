import React, { useState, useCallback, useMemo } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Slider, 
  List, 
  Progress, 
  Space, 
  Typography,
  Row,
  Col,
  Alert,
  Tag,
  Tooltip,
  Modal,
  InputNumber,
  Form
} from 'antd';
import { 
  SearchOutlined, 
  PlayCircleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { EnhancedStockData, PatternMatch } from '../types';
import { WorkerManager } from '../utils/WorkerManager';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

interface PatternMatchingPageProps {
  data: EnhancedStockData[];
  setLoading: (loading: boolean) => void;
  workerManager: WorkerManager;
}

const PatternMatchingPage: React.FC<PatternMatchingPageProps> = ({
  data,
  setLoading,
  workerManager
}) => {
  const [form] = Form.useForm();
  const [selectedRange, setSelectedRange] = useState<[number, number]>([70, 90]);
  const [isMatching, setIsMatching] = useState(false);
  const [matchProgress, setMatchProgress] = useState(0);
  const [patternMatches, setPatternMatches] = useState<PatternMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PatternMatch | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // 计算选中的数据范围
  const selectedData = useMemo(() => {
    if (data.length === 0) return [];
    
    const startIndex = Math.floor((selectedRange[0] / 100) * data.length);
    const endIndex = Math.floor((selectedRange[1] / 100) * data.length);
    
    return data.slice(startIndex, endIndex);
  }, [data, selectedRange]);

  // 选择区间的图表配置
  const selectionChartOption = useMemo(() => {
    if (data.length === 0) return {};

    const dates = data.map(d => d.date);
    const candleData = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumeData = data.map(d => d.volume);

    // 高亮选中区间
    const markArea = {
      silent: true,
      itemStyle: {
        color: 'rgba(24, 144, 255, 0.1)',
        borderColor: '#1890ff',
        borderWidth: 2
      },
      data: [[
        {
          xAxis: dates[Math.floor((selectedRange[0] / 100) * data.length)]
        },
        {
          xAxis: dates[Math.floor((selectedRange[1] / 100) * data.length)]
        }
      ]]
    };

    return {
      title: {
        text: '选择形态匹配的目标区间',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          top: '15%',
          height: '60%'
        },
        {
          left: '10%',
          right: '8%',
          top: '80%',
          height: '15%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          splitNumber: 20,
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          scale: true,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          splitNumber: 20,
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: candleData,
          itemStyle: {
            color: '#ef232a',
            color0: '#14b143',
            borderColor: '#ef232a',
            borderColor0: '#14b143',
          },
          yAxisIndex: 0,
          markArea: markArea
        },
        {
          name: '成交量',
          type: 'bar',
          data: volumeData,
          yAxisIndex: 1,
          itemStyle: {
            color: function(params: any) {
              const dataIndex = params.dataIndex;
              if (dataIndex < data.length) {
                return data[dataIndex].close >= data[dataIndex].open ? '#ef232a' : '#14b143';
              }
              return '#ccc';
            }
          }
        }
      ]
    };
  }, [data, selectedRange]);

  // 开始形态匹配
  const handleStartMatching = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (selectedData.length < 5) {
        Modal.error({
          title: '选择区间过小',
          content: '请选择至少5个交易日的数据作为目标形态'
        });
        return;
      }

      setIsMatching(true);
      setLoading(true);
      setMatchProgress(0);
      setPatternMatches([]);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setMatchProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await workerManager.sendMessage('patterns', {
        type: 'PATTERN_MATCH',
        payload: {
          targetPattern: selectedData,
          fullData: data,
          maxMatches: values.maxMatches,
          minSimilarity: values.minSimilarity
        },
        id: 'pattern_match'
      });

      clearInterval(progressInterval);
      setMatchProgress(100);

      const matches = response.payload as PatternMatch[];
      setPatternMatches(matches);
      
      Modal.success({
        title: '形态匹配完成',
        content: `找到 ${matches.length} 个相似形态，相似度阈值: ${(values.minSimilarity * 100).toFixed(0)}%`
      });

    } catch (error: any) {
      console.error('形态匹配失败:', error);
      Modal.error({
        title: '形态匹配失败',
        content: error.message || '匹配过程中发生未知错误'
      });
    } finally {
      setIsMatching(false);
      setLoading(false);
      setMatchProgress(0);
    }
  }, [selectedData, data, form, setLoading, workerManager]);

  // 查看匹配详情
  const handleViewMatch = useCallback((match: PatternMatch) => {
    setSelectedMatch(match);
    setDetailModalVisible(true);
  }, []);

  // 获取相似度颜色
  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return '#52c41a';
    if (similarity >= 0.8) return '#73d13d';
    if (similarity >= 0.7) return '#faad14';
    if (similarity >= 0.6) return '#fa8c16';
    return '#ff4d4f';
  };

  // 匹配结果图表配置
  const matchChartOption = useMemo(() => {
    if (!selectedMatch) return {};

    const targetDates = selectedData.map((_, index) => `Day ${index + 1}`);
    const matchDates = selectedMatch.data.map((_, index) => `Day ${index + 1}`);
    
    const targetPrices = selectedData.map(d => d.close);
    const matchPrices = selectedMatch.data.map(d => d.close);

    // 标准化价格数据以便比较
    const normalizeArray = (arr: number[]) => {
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const range = max - min;
      return range === 0 ? arr.map(() => 0) : arr.map(val => (val - min) / range);
    };

    const normalizedTarget = normalizeArray(targetPrices);
    const normalizedMatch = normalizeArray(matchPrices);

    return {
      title: {
        text: '形态对比图',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['目标形态', '匹配形态'],
        top: 30
      },
      grid: {
        left: '10%',
        right: '8%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: targetDates,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: '标准化价格'
      },
      series: [
        {
          name: '目标形态',
          type: 'line',
          data: normalizedTarget,
          smooth: true,
          lineStyle: { color: '#1890ff', width: 3 },
          symbol: 'circle',
          symbolSize: 6
        },
        {
          name: '匹配形态',
          type: 'line',
          data: normalizedMatch,
          smooth: true,
          lineStyle: { color: '#52c41a', width: 2, type: 'dashed' },
          symbol: 'diamond',
          symbolSize: 4
        }
      ]
    };
  }, [selectedMatch, selectedData]);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <SearchOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
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
      <Title level={2}>形态匹配</Title>
      <Paragraph>
        选择一个价格形态作为目标，系统将使用DTW算法在历史数据中寻找相似的形态。
        通过分析相似形态的后续走势，可以预测当前形态的可能发展方向。
      </Paragraph>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="选择目标形态">
            <div style={{ marginBottom: 16 }}>
              <Text strong>数据范围选择：</Text>
              <Slider
                range
                value={selectedRange}
                onChange={setSelectedRange}
                tooltip={{
                  formatter: (value) => {
                    const index = Math.floor((value! / 100) * data.length);
                    return `${data[index]?.date || 'N/A'}`;
                  }
                }}
                style={{ marginTop: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <Text type="secondary">
                  开始: {selectedData[0]?.date || 'N/A'}
                </Text>
                <Text type="secondary">
                  选中 {selectedData.length} 个交易日
                </Text>
                <Text type="secondary">
                  结束: {selectedData[selectedData.length - 1]?.date || 'N/A'}
                </Text>
              </div>
            </div>

            <div style={{ height: '400px' }}>
              <ReactECharts
                option={selectionChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="匹配参数">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                maxMatches: 10,
                minSimilarity: 0.7
              }}
            >
              <Form.Item
                name="maxMatches"
                label={
                  <Space>
                    最大匹配数量
                    <Tooltip title="返回相似度最高的前N个匹配结果">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入最大匹配数量' }]}
              >
                <InputNumber
                  min={1}
                  max={50}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                name="minSimilarity"
                label={
                  <Space>
                    最小相似度
                    <Tooltip title="只返回相似度高于此阈值的匹配结果">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true, message: '请输入最小相似度' }]}
              >
                <InputNumber
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  style={{ width: '100%' }}
                  formatter={(value) => `${((value || 0) * 100).toFixed(0)}%`}
                  parser={(value) => (parseFloat(value?.replace('%', '') || '0') / 100)}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartMatching}
                  loading={isMatching}
                  disabled={isMatching || selectedData.length < 5}
                  block
                >
                  开始匹配
                </Button>
              </Form.Item>
            </Form>

            {isMatching && (
              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={matchProgress}
                  status="active"
                />
                <Text type="secondary" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                  正在搜索相似形态...
                </Text>
              </div>
            )}
          </Card>

          <Card title="算法说明" style={{ marginTop: 16 }}>
            <Space direction="vertical" size="small">
              <Text strong>DTW算法特点：</Text>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>允许时间序列长度不同</li>
                <li>考虑形状相似性而非绝对值</li>
                <li>对噪声具有一定容忍度</li>
                <li>计算复杂度较高但准确性好</li>
              </ul>
              
              <Text strong>相似度计算：</Text>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li>价格形态相似度 (70%)</li>
                <li>成交量形态相似度 (30%)</li>
              </ul>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 匹配结果 */}
      {patternMatches.length > 0 && (
        <Card title={`匹配结果 (${patternMatches.length})`} style={{ marginTop: 24 }}>
          <List
            dataSource={patternMatches}
            renderItem={(match, index) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewMatch(match)}
                  >
                    查看详情
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>#{index + 1} 匹配形态</Text>
                      <Tag color={getSimilarityColor(match.similarity)}>
                        相似度: {(match.similarity * 100).toFixed(1)}%
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        时间范围: {match.startDate} ~ {match.endDate}
                      </Text>
                      <Space wrap>
                        <Tag>相关系数: {match.correlation.toFixed(3)}</Tag>
                        <Tag>DTW距离: {match.dtw_distance.toFixed(2)}</Tag>
                        <Tag>波动率: {(match.features.volatility * 100).toFixed(1)}%</Tag>
                        <Tag>趋势: {(match.features.trend * 100).toFixed(1)}%</Tag>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 匹配详情弹窗 */}
      <Modal
        title="形态匹配详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={1000}
      >
        {selectedMatch && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: getSimilarityColor(selectedMatch.similarity) }}>
                    {(selectedMatch.similarity * 100).toFixed(1)}%
                  </div>
                  <div style={{ color: '#666' }}>相似度</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {selectedMatch.correlation.toFixed(3)}
                  </div>
                  <div style={{ color: '#666' }}>相关系数</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {selectedMatch.dtw_distance.toFixed(2)}
                  </div>
                  <div style={{ color: '#666' }}>DTW距离</div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {selectedMatch.features.duration}
                  </div>
                  <div style={{ color: '#666' }}>持续天数</div>
                </div>
              </Col>
            </Row>

            <div style={{ height: '400px' }}>
              <ReactECharts
                option={matchChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            </div>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" title="形态特征">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>波动率:</span>
                      <span>{(selectedMatch.features.volatility * 100).toFixed(2)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>趋势:</span>
                      <span>{(selectedMatch.features.trend * 100).toFixed(2)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>价格区间:</span>
                      <span>{(selectedMatch.features.price_range * 100).toFixed(2)}%</span>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="收益情况">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>最大涨幅:</span>
                      <span style={{ color: '#52c41a' }}>
                        {(selectedMatch.features.max_gain * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>最大跌幅:</span>
                      <span style={{ color: '#ff4d4f' }}>
                        {(selectedMatch.features.max_loss * 100).toFixed(2)}%
                      </span>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="成交量">
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>成交量趋势:</span>
                      <span>{(selectedMatch.features.volume_trend * 100).toFixed(2)}%</span>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatternMatchingPage;

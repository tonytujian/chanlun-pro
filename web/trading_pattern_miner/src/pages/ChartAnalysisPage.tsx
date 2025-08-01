import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Select, 
  Switch, 
  Typography, 
  Space,
  Slider,
  Button,
  Tooltip
} from 'antd';
import { 
  LineChartOutlined, 
  BarChartOutlined,
  SettingOutlined,
  FullscreenOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { EnhancedStockData, TradingStrategy } from '../types';

const { Option } = Select;
const { Title, Text } = Typography;

interface ChartAnalysisPageProps {
  data: EnhancedStockData[];
  strategies: TradingStrategy[];
}

const ChartAnalysisPage: React.FC<ChartAnalysisPageProps> = ({
  data,
  strategies
}) => {
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['ma20']);
  const [showVolume, setShowVolume] = useState(true);
  const [dateRange, setDateRange] = useState<[number, number]>([0, 100]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');

  // 计算显示的数据范围
  const displayData = useMemo(() => {
    if (data.length === 0) return [];
    
    const startIndex = Math.floor((dateRange[0] / 100) * data.length);
    const endIndex = Math.floor((dateRange[1] / 100) * data.length);
    
    return data.slice(startIndex, endIndex);
  }, [data, dateRange]);

  // K线图配置
  const candlestickOption = useMemo(() => {
    if (displayData.length === 0) return {};

    const dates = displayData.map(d => d.date);
    const candleData = displayData.map(d => [d.open, d.close, d.low, d.high]);
    const volumeData = displayData.map(d => d.volume);

    const series: any[] = [
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
      }
    ];

    // 添加技术指标
    selectedIndicators.forEach(indicator => {
      const indicatorData = displayData.map(d => d.indicators[indicator as keyof typeof d.indicators]);
      
      if (indicatorData.some(val => val !== null && val !== undefined)) {
        series.push({
          name: getIndicatorName(indicator),
          type: 'line',
          data: indicatorData,
          smooth: true,
          lineStyle: { width: 2 },
          yAxisIndex: 0,
        });
      }
    });

    // 添加成交量
    if (showVolume) {
      series.push({
        name: '成交量',
        type: 'bar',
        data: volumeData,
        yAxisIndex: 1,
        itemStyle: {
          color: function(params: any) {
            const dataIndex = params.dataIndex;
            if (dataIndex < displayData.length) {
              return displayData[dataIndex].close >= displayData[dataIndex].open ? '#ef232a' : '#14b143';
            }
            return '#ccc';
          }
        }
      });
    }

    return {
      title: {
        text: '股票价格走势图',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex;
          const item = displayData[dataIndex];
          
          let html = `<div style="margin-bottom: 8px;"><strong>${item.date}</strong></div>`;
          html += `<div>开盘: ${item.open.toFixed(2)}</div>`;
          html += `<div>收盘: ${item.close.toFixed(2)}</div>`;
          html += `<div>最高: ${item.high.toFixed(2)}</div>`;
          html += `<div>最低: ${item.low.toFixed(2)}</div>`;
          html += `<div>成交量: ${item.volume.toLocaleString()}</div>`;
          
          // 添加技术指标信息
          selectedIndicators.forEach(indicator => {
            const value = item.indicators[indicator as keyof typeof item.indicators];
            if (value !== null && value !== undefined) {
              html += `<div>${getIndicatorName(indicator)}: ${value.toFixed(2)}</div>`;
            }
          });
          
          return html;
        }
      },
      legend: {
        data: ['K线', ...selectedIndicators.map(getIndicatorName), ...(showVolume ? ['成交量'] : [])],
        top: 30
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          top: '15%',
          height: showVolume ? '50%' : '70%'
        },
        ...(showVolume ? [{
          left: '10%',
          right: '8%',
          top: '70%',
          height: '20%'
        }] : [])
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
          max: 'dataMax',
          axisPointer: {
            z: 100
          }
        },
        ...(showVolume ? [{
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
        }] : [])
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true
          }
        },
        ...(showVolume ? [{
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }] : [])
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series: series
    };
  }, [displayData, selectedIndicators, showVolume]);

  // 技术指标选项
  const indicatorOptions = [
    { value: 'ma5', label: 'MA5' },
    { value: 'ma10', label: 'MA10' },
    { value: 'ma20', label: 'MA20' },
    { value: 'ma50', label: 'MA50' },
    { value: 'rsi', label: 'RSI' },
    { value: 'macd', label: 'MACD' },
    { value: 'bollingerUpper', label: '布林上轨' },
    { value: 'bollingerMiddle', label: '布林中轨' },
    { value: 'bollingerLower', label: '布林下轨' },
  ];

  // 获取指标显示名称
  function getIndicatorName(indicator: string): string {
    const option = indicatorOptions.find(opt => opt.value === indicator);
    return option ? option.label : indicator;
  }

  // RSI指标图配置
  const rsiOption = useMemo(() => {
    if (displayData.length === 0 || !selectedIndicators.includes('rsi')) return null;

    const dates = displayData.map(d => d.date);
    const rsiData = displayData.map(d => d.indicators.rsi);

    return {
      title: {
        text: 'RSI相对强弱指标',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex;
          const item = displayData[dataIndex];
          return `${item.date}<br/>RSI: ${item.indicators.rsi?.toFixed(2) || 'N/A'}`;
        }
      },
      grid: {
        left: '10%',
        right: '8%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: {
          lineStyle: {
            color: ['#30', '#70']
          }
        }
      },
      series: [
        {
          name: 'RSI',
          type: 'line',
          data: rsiData,
          smooth: true,
          lineStyle: { color: '#5470c6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(84, 112, 198, 0.3)' },
                { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
              ]
            }
          },
          markLine: {
            data: [
              { yAxis: 70, lineStyle: { color: '#ef232a' }, label: { formatter: '超买线 70' } },
              { yAxis: 30, lineStyle: { color: '#14b143' }, label: { formatter: '超卖线 30' } }
            ]
          }
        }
      ]
    };
  }, [displayData, selectedIndicators]);

  // MACD指标图配置
  const macdOption = useMemo(() => {
    if (displayData.length === 0 || !selectedIndicators.includes('macd')) return null;

    const dates = displayData.map(d => d.date);
    const macdData = displayData.map(d => d.indicators.macd);
    const signalData = displayData.map(d => d.indicators.macdSignal);
    const histogramData = displayData.map(d => d.indicators.macdHistogram);

    return {
      title: {
        text: 'MACD指标',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        formatter: function(params: any) {
          const dataIndex = params[0].dataIndex;
          const item = displayData[dataIndex];
          return `${item.date}<br/>
                  MACD: ${item.indicators.macd?.toFixed(4) || 'N/A'}<br/>
                  Signal: ${item.indicators.macdSignal?.toFixed(4) || 'N/A'}<br/>
                  Histogram: ${item.indicators.macdHistogram?.toFixed(4) || 'N/A'}`;
        }
      },
      legend: {
        data: ['MACD', 'Signal', 'Histogram'],
        top: 30
      },
      grid: {
        left: '10%',
        right: '8%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: 'MACD',
          type: 'line',
          data: macdData,
          smooth: true,
          lineStyle: { color: '#5470c6' }
        },
        {
          name: 'Signal',
          type: 'line',
          data: signalData,
          smooth: true,
          lineStyle: { color: '#fc8452' }
        },
        {
          name: 'Histogram',
          type: 'bar',
          data: histogramData,
          itemStyle: {
            color: function(params: any) {
              return params.value >= 0 ? '#ef232a' : '#14b143';
            }
          }
        }
      ]
    };
  }, [displayData, selectedIndicators]);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <LineChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
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
      <Title level={2}>图表分析</Title>
      
      {/* 控制面板 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>技术指标</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="选择技术指标"
                value={selectedIndicators}
                onChange={setSelectedIndicators}
                options={indicatorOptions}
              />
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>显示设置</Text>
              <Space>
                <Switch
                  checked={showVolume}
                  onChange={setShowVolume}
                  checkedChildren="成交量"
                  unCheckedChildren="成交量"
                />
              </Space>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>策略信号</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="选择策略"
                value={selectedStrategy}
                onChange={setSelectedStrategy}
                allowClear
              >
                {strategies.map(strategy => (
                  <Option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space>
              <Tooltip title="全屏显示">
                <Button icon={<FullscreenOutlined />} />
              </Tooltip>
              <Tooltip title="图表设置">
                <Button icon={<SettingOutlined />} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
        
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>数据范围</Text>
              <Slider
                range
                value={dateRange}
                onChange={setDateRange}
                tooltip={{
                  formatter: (value) => `${Math.floor((value! / 100) * data.length)}`
                }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主图表 */}
      <Card title="价格走势图" style={{ marginBottom: 24 }}>
        <div style={{ height: '600px' }}>
          <ReactECharts
            option={candlestickOption}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </Card>

      {/* 技术指标图表 */}
      <Row gutter={[24, 24]}>
        {rsiOption && (
          <Col xs={24} lg={12}>
            <Card title="RSI指标">
              <div style={{ height: '300px' }}>
                <ReactECharts
                  option={rsiOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </Card>
          </Col>
        )}
        
        {macdOption && (
          <Col xs={24} lg={12}>
            <Card title="MACD指标">
              <div style={{ height: '300px' }}>
                <ReactECharts
                  option={macdOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'canvas' }}
                />
              </div>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ChartAnalysisPage;

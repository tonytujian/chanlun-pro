import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { EnhancedStockData, TradingSignal } from '../types';

interface TradingChartProps {
  data: EnhancedStockData[];
  signals?: TradingSignal[];
  indicators?: string[];
  showVolume?: boolean;
  height?: number;
  title?: string;
}

const TradingChart: React.FC<TradingChartProps> = ({
  data,
  signals = [],
  indicators = [],
  showVolume = true,
  height = 400,
  title = '股票走势图'
}) => {
  const option = useMemo(() => {
    if (data.length === 0) return {};

    const dates = data.map(d => d.date);
    const candleData = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumeData = data.map(d => d.volume);

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
    indicators.forEach(indicator => {
      const indicatorData = data.map(d => d.indicators[indicator as keyof typeof d.indicators]);
      
      if (indicatorData.some(val => val !== null && val !== undefined)) {
        const colors: { [key: string]: string } = {
          ma5: '#ff6b6b',
          ma10: '#4ecdc4',
          ma20: '#45b7d1',
          ma50: '#96ceb4',
          rsi: '#feca57',
          macd: '#ff9ff3',
          bollingerUpper: '#54a0ff',
          bollingerMiddle: '#5f27cd',
          bollingerLower: '#00d2d3'
        };

        series.push({
          name: getIndicatorName(indicator),
          type: 'line',
          data: indicatorData,
          smooth: true,
          lineStyle: { 
            width: indicator.startsWith('ma') ? 2 : 1,
            color: colors[indicator] || '#666'
          },
          yAxisIndex: 0,
        });
      }
    });

    // 添加交易信号
    if (signals.length > 0) {
      const buySignals = signals.filter(s => s.type === 'BUY');
      const sellSignals = signals.filter(s => s.type === 'SELL');

      if (buySignals.length > 0) {
        series.push({
          name: '买入信号',
          type: 'scatter',
          data: buySignals.map(signal => {
            const index = dates.indexOf(signal.date);
            return index >= 0 ? [index, signal.price] : null;
          }).filter(Boolean),
          symbol: 'triangle',
          symbolSize: 12,
          itemStyle: { color: '#52c41a' },
          yAxisIndex: 0,
        });
      }

      if (sellSignals.length > 0) {
        series.push({
          name: '卖出信号',
          type: 'scatter',
          data: sellSignals.map(signal => {
            const index = dates.indexOf(signal.date);
            return index >= 0 ? [index, signal.price] : null;
          }).filter(Boolean),
          symbol: 'diamond',
          symbolSize: 12,
          itemStyle: { color: '#ff4d4f' },
          yAxisIndex: 0,
        });
      }
    }

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
            if (dataIndex < data.length) {
              return data[dataIndex].close >= data[dataIndex].open ? '#ef232a' : '#14b143';
            }
            return '#ccc';
          }
        }
      });
    }

    return {
      title: {
        text: title,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function(params: any) {
          if (!params || params.length === 0) return '';
          
          const dataIndex = params[0].dataIndex;
          const item = data[dataIndex];
          
          if (!item) return '';
          
          let html = `<div style="margin-bottom: 8px;"><strong>${item.date}</strong></div>`;
          html += `<div>开盘: ${item.open.toFixed(2)}</div>`;
          html += `<div>收盘: ${item.close.toFixed(2)}</div>`;
          html += `<div>最高: ${item.high.toFixed(2)}</div>`;
          html += `<div>最低: ${item.low.toFixed(2)}</div>`;
          html += `<div>成交量: ${item.volume.toLocaleString()}</div>`;
          
          // 添加技术指标信息
          indicators.forEach(indicator => {
            const value = item.indicators[indicator as keyof typeof item.indicators];
            if (value !== null && value !== undefined) {
              html += `<div>${getIndicatorName(indicator)}: ${value.toFixed(2)}</div>`;
            }
          });
          
          return html;
        }
      },
      legend: {
        data: [
          'K线', 
          ...indicators.map(getIndicatorName), 
          ...(showVolume ? ['成交量'] : []),
          ...(signals.some(s => s.type === 'BUY') ? ['买入信号'] : []),
          ...(signals.some(s => s.type === 'SELL') ? ['卖出信号'] : [])
        ],
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
          xAxisIndex: showVolume ? [0, 1] : [0],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: showVolume ? [0, 1] : [0],
          type: 'slider',
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series: series
    };
  }, [data, signals, indicators, showVolume, title]);

  // 获取指标显示名称
  function getIndicatorName(indicator: string): string {
    const nameMap: { [key: string]: string } = {
      ma5: 'MA5',
      ma10: 'MA10',
      ma20: 'MA20',
      ma50: 'MA50',
      rsi: 'RSI',
      macd: 'MACD',
      macdSignal: 'MACD信号',
      macdHistogram: 'MACD柱',
      bollingerUpper: '布林上轨',
      bollingerMiddle: '布林中轨',
      bollingerLower: '布林下轨'
    };
    return nameMap[indicator] || indicator;
  }

  return (
    <div style={{ height: `${height}px` }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default TradingChart;

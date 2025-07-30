import React from 'react';
import { Card, Row, Col, Statistic, Progress, Space, Typography, Tag, Alert } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, WarningOutlined } from '@ant-design/icons';
import { Position } from '../types';

const { Title, Text } = Typography;

interface GreekMonitorProps {
  positions: Position[];
  underlyingPrice?: number;
}

interface PortfolioGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  totalValue: number;
}

const GreekMonitor: React.FC<GreekMonitorProps> = ({ positions, underlyingPrice = 3000 }) => {
  // 计算组合希腊字母
  const calculatePortfolioGreeks = (): PortfolioGreeks => {
    return positions.reduce((acc, position) => {
      const multiplier = position.position_type === 'long' ? 1 : -1;
      const quantity = position.quantity;
      
      return {
        delta: acc.delta + position.delta * multiplier * quantity,
        gamma: acc.gamma + position.gamma * multiplier * quantity,
        theta: acc.theta + position.theta * multiplier * quantity,
        vega: acc.vega + position.vega * multiplier * quantity,
        totalValue: acc.totalValue + position.market_value * multiplier,
      };
    }, { delta: 0, gamma: 0, theta: 0, vega: 0, totalValue: 0 });
  };

  // 获取希腊字母风险等级
  const getRiskLevel = (greek: string, value: number): { level: string; color: string } => {
    const absValue = Math.abs(value);
    
    switch (greek) {
      case 'delta':
        if (absValue < 0.1) return { level: '低', color: 'green' };
        if (absValue < 0.3) return { level: '中', color: 'orange' };
        return { level: '高', color: 'red' };
      
      case 'gamma':
        if (absValue < 0.01) return { level: '低', color: 'green' };
        if (absValue < 0.05) return { level: '中', color: 'orange' };
        return { level: '高', color: 'red' };
      
      case 'theta':
        if (absValue < 0.05) return { level: '低', color: 'green' };
        if (absValue < 0.15) return { level: '中', color: 'orange' };
        return { level: '高', color: 'red' };
      
      case 'vega':
        if (absValue < 0.1) return { level: '低', color: 'green' };
        if (absValue < 0.3) return { level: '中', color: 'orange' };
        return { level: '高', color: 'red' };
      
      default:
        return { level: '未知', color: 'default' };
    }
  };

  // 计算价格敏感性
  const calculatePriceSensitivity = (delta: number, gamma: number): { 
    priceChange1: number; 
    priceChange5: number; 
    priceChange10: number; 
  } => {
    const change1 = delta * (underlyingPrice * 0.01) + 0.5 * gamma * Math.pow(underlyingPrice * 0.01, 2);
    const change5 = delta * (underlyingPrice * 0.05) + 0.5 * gamma * Math.pow(underlyingPrice * 0.05, 2);
    const change10 = delta * (underlyingPrice * 0.10) + 0.5 * gamma * Math.pow(underlyingPrice * 0.10, 2);
    
    return {
      priceChange1: change1,
      priceChange5: change5,
      priceChange10: change10,
    };
  };

  // 计算时间衰减
  const calculateTimeDecay = (theta: number): { daily: number; weekly: number; monthly: number } => {
    return {
      daily: theta,
      weekly: theta * 7,
      monthly: theta * 30,
    };
  };

  const portfolioGreeks = calculatePortfolioGreeks();
  const priceSensitivity = calculatePriceSensitivity(portfolioGreeks.delta, portfolioGreeks.gamma);
  const timeDecay = calculateTimeDecay(portfolioGreeks.theta);

  // 风险警告
  const getRiskWarnings = (): string[] => {
    const warnings: string[] = [];
    
    if (Math.abs(portfolioGreeks.delta) > 0.5) {
      warnings.push(`Delta风险较高 (${portfolioGreeks.delta.toFixed(4)})，标的价格变动对组合影响较大`);
    }
    
    if (Math.abs(portfolioGreeks.gamma) > 0.1) {
      warnings.push(`Gamma风险较高 (${portfolioGreeks.gamma.toFixed(4)})，Delta变化较快`);
    }
    
    if (portfolioGreeks.theta < -0.2) {
      warnings.push(`Theta风险较高 (${portfolioGreeks.theta.toFixed(4)})，时间衰减较快`);
    }
    
    if (Math.abs(portfolioGreeks.vega) > 0.5) {
      warnings.push(`Vega风险较高 (${portfolioGreeks.vega.toFixed(4)})，波动率敏感性较高`);
    }
    
    return warnings;
  };

  const riskWarnings = getRiskWarnings();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={4}>希腊字母监控</Title>
      
      {/* 风险警告 */}
      {riskWarnings.length > 0 && (
        <Alert
          message="风险提示"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {riskWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          }
          type="warning"
          icon={<WarningOutlined />}
          showIcon
        />
      )}

      {/* 希腊字母总览 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Delta (价格敏感性)"
              value={portfolioGreeks.delta}
              precision={4}
              valueStyle={{ 
                color: portfolioGreeks.delta >= 0 ? '#cf1322' : '#389e0d',
                fontSize: '20px'
              }}
              prefix={portfolioGreeks.delta >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix={
                <Tag color={getRiskLevel('delta', portfolioGreeks.delta).color} style={{ marginLeft: 8 }}>
                  {getRiskLevel('delta', portfolioGreeks.delta).level}风险
                </Tag>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                标的价格每变动1元，组合价值变动约{(portfolioGreeks.delta * 1).toFixed(2)}元
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="Gamma (Delta敏感性)"
              value={portfolioGreeks.gamma}
              precision={4}
              valueStyle={{ 
                color: portfolioGreeks.gamma >= 0 ? '#cf1322' : '#389e0d',
                fontSize: '20px'
              }}
              suffix={
                <Tag color={getRiskLevel('gamma', portfolioGreeks.gamma).color} style={{ marginLeft: 8 }}>
                  {getRiskLevel('gamma', portfolioGreeks.gamma).level}风险
                </Tag>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                标的价格每变动1元，Delta变动约{(portfolioGreeks.gamma * 1).toFixed(4)}
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="Theta (时间衰减)"
              value={portfolioGreeks.theta}
              precision={4}
              valueStyle={{ 
                color: portfolioGreeks.theta >= 0 ? '#cf1322' : '#389e0d',
                fontSize: '20px'
              }}
              suffix={
                <Tag color={getRiskLevel('theta', portfolioGreeks.theta).color} style={{ marginLeft: 8 }}>
                  {getRiskLevel('theta', portfolioGreeks.theta).level}风险
                </Tag>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                每过一天，组合价值因时间衰减约{portfolioGreeks.theta.toFixed(2)}元
              </Text>
            </div>
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="Vega (波动率敏感性)"
              value={portfolioGreeks.vega}
              precision={4}
              valueStyle={{ 
                color: portfolioGreeks.vega >= 0 ? '#cf1322' : '#389e0d',
                fontSize: '20px'
              }}
              suffix={
                <Tag color={getRiskLevel('vega', portfolioGreeks.vega).color} style={{ marginLeft: 8 }}>
                  {getRiskLevel('vega', portfolioGreeks.vega).level}风险
                </Tag>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                隐含波动率每变动1%，组合价值变动约{(portfolioGreeks.vega * 0.01).toFixed(2)}元
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 价格敏感性分析 */}
      <Card title="价格敏感性分析" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={`标的价格上涨1% (${(underlyingPrice * 1.01).toFixed(2)})`}
                value={priceSensitivity.priceChange1}
                precision={2}
                valueStyle={{ color: priceSensitivity.priceChange1 >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={`标的价格上涨5% (${(underlyingPrice * 1.05).toFixed(2)})`}
                value={priceSensitivity.priceChange5}
                precision={2}
                valueStyle={{ color: priceSensitivity.priceChange5 >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title={`标的价格上涨10% (${(underlyingPrice * 1.10).toFixed(2)})`}
                value={priceSensitivity.priceChange10}
                precision={2}
                valueStyle={{ color: priceSensitivity.priceChange10 >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 时间衰减分析 */}
      <Card title="时间衰减分析" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="每日时间衰减"
                value={timeDecay.daily}
                precision={2}
                valueStyle={{ color: timeDecay.daily >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="每周时间衰减"
                value={timeDecay.weekly}
                precision={2}
                valueStyle={{ color: timeDecay.weekly >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="每月时间衰减"
                value={timeDecay.monthly}
                precision={2}
                valueStyle={{ color: timeDecay.monthly >= 0 ? '#cf1322' : '#389e0d' }}
                suffix="元"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 风险度量 */}
      <Card title="风险度量" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Delta中性度</Text>
              <Progress
                percent={Math.min(100, Math.abs(portfolioGreeks.delta) * 100)}
                status={Math.abs(portfolioGreeks.delta) > 0.3 ? 'exception' : 'normal'}
                format={() => `${Math.abs(portfolioGreeks.delta).toFixed(4)}`}
              />
            </div>
            <div>
              <Text strong>Gamma风险</Text>
              <Progress
                percent={Math.min(100, Math.abs(portfolioGreeks.gamma) * 1000)}
                status={Math.abs(portfolioGreeks.gamma) > 0.05 ? 'exception' : 'normal'}
                format={() => `${Math.abs(portfolioGreeks.gamma).toFixed(4)}`}
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>时间衰减风险</Text>
              <Progress
                percent={Math.min(100, Math.abs(portfolioGreeks.theta) * 500)}
                status={portfolioGreeks.theta < -0.1 ? 'exception' : 'normal'}
                format={() => `${Math.abs(portfolioGreeks.theta).toFixed(4)}`}
              />
            </div>
            <div>
              <Text strong>波动率风险</Text>
              <Progress
                percent={Math.min(100, Math.abs(portfolioGreeks.vega) * 200)}
                status={Math.abs(portfolioGreeks.vega) > 0.3 ? 'exception' : 'normal'}
                format={() => `${Math.abs(portfolioGreeks.vega).toFixed(4)}`}
              />
            </div>
          </Col>
        </Row>
      </Card>
    </Space>
  );
};

export default GreekMonitor;

import React from 'react';
import { Table, Checkbox, Typography, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TQuoteRow, OptionContract, SelectedContract } from '../types';

const { Text } = Typography;

interface TQuoteTableProps {
  data: TQuoteRow[];
  underlyingPrice: number;
  selectedContracts: SelectedContract[];
  onContractSelect: (contract: OptionContract, selected: boolean) => void;
}

const TQuoteTable: React.FC<TQuoteTableProps> = ({
  data,
  underlyingPrice,
  selectedContracts,
  onContractSelect,
}) => {
  // 检查合约是否被选中
  const isContractSelected = (contractCode: string): boolean => {
    return selectedContracts.some(c => c.contract_code === contractCode);
  };

  // 格式化价格显示
  const formatPrice = (price: number): string => {
    return price.toFixed(4);
  };

  // 格式化希腊字母显示
  const formatGreek = (value: number): string => {
    return value.toFixed(4);
  };

  // 获取价格颜色
  const getPriceColor = (price: number, strikePrice: number, isCall: boolean): string => {
    if (isCall) {
      return underlyingPrice > strikePrice ? '#cf1322' : '#666';
    } else {
      return underlyingPrice < strikePrice ? '#cf1322' : '#666';
    }
  };

  // 渲染期权合约单元格
  const renderOptionCell = (contract: OptionContract, isCall: boolean) => {
    const isSelected = isContractSelected(contract.contract_code);
    const priceColor = getPriceColor(contract.last_price, contract.strike_price, isCall);
    
    return (
      <div style={{ 
        padding: '8px', 
        backgroundColor: isCall ? '#fff2e8' : '#f6ffed',
        border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
      onClick={() => onContractSelect(contract, !isSelected)}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <Checkbox 
              checked={isSelected}
              onChange={(e) => onContractSelect(contract, e.target.checked)}
            />
            <Text strong style={{ fontSize: '12px' }}>
              {contract.contract_name}
            </Text>
          </Space>
          
          <Space direction="vertical" size={0}>
            <Text style={{ color: priceColor, fontWeight: 'bold' }}>
              {formatPrice(contract.last_price)}
            </Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              买: {formatPrice(contract.bid_price)} 卖: {formatPrice(contract.ask_price)}
            </Text>
          </Space>
          
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              量: {contract.volume} 持: {contract.open_interest}
            </Text>
            <Text style={{ fontSize: '11px', color: '#666' }}>
              IV: {(contract.implied_volatility * 100).toFixed(1)}%
            </Text>
          </Space>
          
          <Space wrap size={4}>
            <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>
              Δ: {formatGreek(contract.delta)}
            </Tag>
            <Tag color="green" style={{ fontSize: '10px', margin: 0 }}>
              Γ: {formatGreek(contract.gamma)}
            </Tag>
            <Tag color="orange" style={{ fontSize: '10px', margin: 0 }}>
              Θ: {formatGreek(contract.theta)}
            </Tag>
            <Tag color="purple" style={{ fontSize: '10px', margin: 0 }}>
              V: {formatGreek(contract.vega)}
            </Tag>
          </Space>
        </Space>
      </div>
    );
  };

  const columns: ColumnsType<TQuoteRow> = [
    {
      title: '看涨期权 (Call)',
      dataIndex: 'call',
      key: 'call',
      width: 280,
      render: (contract: OptionContract) => renderOptionCell(contract, true),
    },
    {
      title: '行权价',
      dataIndex: 'strike_price',
      key: 'strike_price',
      width: 100,
      align: 'center',
      render: (strikePrice: number) => (
        <div style={{ 
          padding: '16px 8px',
          backgroundColor: '#f9f9f9',
          fontWeight: 'bold',
          fontSize: '14px',
          color: Math.abs(strikePrice - underlyingPrice) < 50 ? '#1890ff' : '#666'
        }}>
          {strikePrice}
        </div>
      ),
    },
    {
      title: '看跌期权 (Put)',
      dataIndex: 'put',
      key: 'put',
      width: 280,
      render: (contract: OptionContract) => renderOptionCell(contract, false),
    },
  ];

  return (
    <div>
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f0f2f5', 
        textAlign: 'center',
        marginBottom: '16px',
        borderRadius: '8px'
      }}>
        <Text strong style={{ fontSize: '16px' }}>
          标的价格: <span style={{ color: '#1890ff', fontSize: '18px' }}>{underlyingPrice.toFixed(2)}</span>
        </Text>
      </div>
      
      <Table
        columns={columns}
        dataSource={data}
        rowKey="strike_price"
        pagination={false}
        size="small"
        scroll={{ y: 600 }}
        className="t-quote-table"
      />
    </div>
  );
};

export default TQuoteTable;

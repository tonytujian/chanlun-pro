import React, { useState } from 'react';
import { Modal, Form, Input, Select, Table, Button, message, Space, Typography, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { SelectedContract } from '../types';
import { optionApi } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

interface PortfolioSaveModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  selectedContracts: SelectedContract[];
  underlyingSymbol: string;
  underlyingName: string;
  expiryMonth: string;
  onUpdateContract: (contractCode: string, updates: Partial<SelectedContract>) => void;
  onRemoveContract: (contractCode: string) => void;
}

const PortfolioSaveModal: React.FC<PortfolioSaveModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  selectedContracts,
  underlyingSymbol,
  underlyingName,
  expiryMonth,
  onUpdateContract,
  onRemoveContract,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const portfolioData = {
        portfolio_name: values.portfolio_name,
        underlying_symbol: underlyingSymbol,
        underlying_name: underlyingName,
        expiry_month: expiryMonth,
        description: values.description || '',
        selected_contracts: selectedContracts,
      };

      const response = await optionApi.createPortfolio(portfolioData);
      
      if (response.code === 0) {
        message.success('期权组合保存成功！');
        form.resetFields();
        onSuccess();
      } else {
        message.error(response.message || '保存失败');
      }
    } catch (error) {
      console.error('Save portfolio error:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // 更新合约的持仓方向
  const handlePositionTypeChange = (contractCode: string, positionType: 'long' | 'short') => {
    onUpdateContract(contractCode, { position_type: positionType });
  };

  // 更新合约的数量
  const handleQuantityChange = (contractCode: string, quantity: number) => {
    onUpdateContract(contractCode, { quantity });
  };

  // 计算组合总价值
  const calculateTotalValue = (): number => {
    return selectedContracts.reduce((total, contract) => {
      const value = contract.last_price * contract.quantity;
      return total + (contract.position_type === 'long' ? value : -value);
    }, 0);
  };

  // 计算组合希腊字母
  const calculatePortfolioGreeks = () => {
    const greeks = selectedContracts.reduce((acc, contract) => {
      const multiplier = contract.position_type === 'long' ? 1 : -1;
      const quantity = contract.quantity;
      
      return {
        delta: acc.delta + (contract.delta || 0) * multiplier * quantity,
        gamma: acc.gamma + (contract.gamma || 0) * multiplier * quantity,
        theta: acc.theta + (contract.theta || 0) * multiplier * quantity,
        vega: acc.vega + (contract.vega || 0) * multiplier * quantity,
      };
    }, { delta: 0, gamma: 0, theta: 0, vega: 0 });

    return greeks;
  };

  const columns: ColumnsType<SelectedContract> = [
    {
      title: '合约',
      dataIndex: 'contract_name',
      key: 'contract_name',
      width: 200,
      render: (name: string, record: SelectedContract) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '12px' }}>{name}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {record.option_type === 'C' ? '看涨' : '看跌'} | 行权价: {record.strike_price}
          </Text>
        </Space>
      ),
    },
    {
      title: '方向',
      dataIndex: 'position_type',
      key: 'position_type',
      width: 100,
      render: (positionType: string, record: SelectedContract) => (
        <Select
          size="small"
          value={positionType}
          onChange={(value) => handlePositionTypeChange(record.contract_code, value)}
          style={{ width: '100%' }}
        >
          <Option value="long">买入</Option>
          <Option value="short">卖出</Option>
        </Select>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (quantity: number, record: SelectedContract) => (
        <Input
          size="small"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => handleQuantityChange(record.contract_code, parseInt(e.target.value) || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '价格',
      dataIndex: 'last_price',
      key: 'last_price',
      width: 80,
      render: (price: number) => (
        <Text>{price.toFixed(4)}</Text>
      ),
    },
    {
      title: '价值',
      key: 'value',
      width: 100,
      render: (_, record: SelectedContract) => {
        const value = record.last_price * record.quantity;
        const displayValue = record.position_type === 'long' ? value : -value;
        return (
          <Text style={{ color: displayValue >= 0 ? '#cf1322' : '#389e0d' }}>
            {displayValue.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 60,
      render: (_, record: SelectedContract) => (
        <Button
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemoveContract(record.contract_code)}
          danger
        />
      ),
    },
  ];

  const portfolioGreeks = calculatePortfolioGreeks();
  const totalValue = calculateTotalValue();

  return (
    <Modal
      title="保存期权组合"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSave}
      confirmLoading={saving}
      width={800}
      okText="保存组合"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="portfolio_name"
          label="组合名称"
          rules={[{ required: true, message: '请输入组合名称' }]}
        >
          <Input placeholder="请输入组合名称" />
        </Form.Item>

        <Form.Item name="description" label="组合描述">
          <TextArea rows={3} placeholder="请输入组合描述（可选）" />
        </Form.Item>
      </Form>

      <div style={{ marginBottom: 16 }}>
        <Text strong>标的信息：</Text>
        <Text>{underlyingName} ({underlyingSymbol}) - {expiryMonth}</Text>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Text strong>已选合约 ({selectedContracts.length})：</Text>
      </div>

      <Table
        columns={columns}
        dataSource={selectedContracts}
        rowKey="contract_code"
        pagination={false}
        size="small"
        scroll={{ y: 300 }}
      />

      <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>组合统计：</Text>
          <Space wrap>
            <Tag color="blue">总价值: {totalValue.toFixed(2)}</Tag>
            <Tag color="green">Delta: {portfolioGreeks.delta.toFixed(4)}</Tag>
            <Tag color="orange">Gamma: {portfolioGreeks.gamma.toFixed(4)}</Tag>
            <Tag color="red">Theta: {portfolioGreeks.theta.toFixed(4)}</Tag>
            <Tag color="purple">Vega: {portfolioGreeks.vega.toFixed(4)}</Tag>
          </Space>
        </Space>
      </div>
    </Modal>
  );
};

export default PortfolioSaveModal;

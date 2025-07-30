import React, { useState, useEffect } from 'react';
import { Select, Space, Typography } from 'antd';
import { optionApi } from '../services/api';
import { Underlying, ExpiryMonth } from '../types';

const { Option } = Select;
const { Text } = Typography;

interface UnderlyingSelectorProps {
  onUnderlyingChange: (underlying: string, underlyingName: string) => void;
  onExpiryMonthChange: (expiryMonth: string) => void;
  selectedUnderlying?: string;
  selectedExpiryMonth?: string;
}

const UnderlyingSelector: React.FC<UnderlyingSelectorProps> = ({
  onUnderlyingChange,
  onExpiryMonthChange,
  selectedUnderlying,
  selectedExpiryMonth,
}) => {
  const [underlyings, setUnderlyings] = useState<Underlying[]>([]);
  const [expiryMonths, setExpiryMonths] = useState<ExpiryMonth[]>([]);
  const [loadingUnderlyings, setLoadingUnderlyings] = useState(false);
  const [loadingExpiryMonths, setLoadingExpiryMonths] = useState(false);

  // 加载标的物列表
  useEffect(() => {
    const loadUnderlyings = async () => {
      setLoadingUnderlyings(true);
      try {
        const response = await optionApi.getUnderlyings();
        if (response.code === 0 && response.data) {
          setUnderlyings(response.data);
          // 如果没有选中的标的物，默认选择第一个
          if (!selectedUnderlying && response.data.length > 0) {
            const firstUnderlying = response.data[0];
            onUnderlyingChange(firstUnderlying.code, firstUnderlying.name);
          }
        }
      } catch (error) {
        console.error('Failed to load underlyings:', error);
      } finally {
        setLoadingUnderlyings(false);
      }
    };

    loadUnderlyings();
  }, []);

  // 当标的物改变时，加载对应的到期月份
  useEffect(() => {
    if (selectedUnderlying) {
      const loadExpiryMonths = async () => {
        setLoadingExpiryMonths(true);
        try {
          const response = await optionApi.getExpiryMonths(selectedUnderlying);
          if (response.code === 0 && response.data) {
            setExpiryMonths(response.data);
            // 如果没有选中的到期月份，默认选择第一个
            if (!selectedExpiryMonth && response.data.length > 0) {
              onExpiryMonthChange(response.data[0].value);
            }
          }
        } catch (error) {
          console.error('Failed to load expiry months:', error);
        } finally {
          setLoadingExpiryMonths(false);
        }
      };

      loadExpiryMonths();
    }
  }, [selectedUnderlying]);

  const handleUnderlyingChange = (value: string) => {
    const underlying = underlyings.find(u => u.code === value);
    if (underlying) {
      onUnderlyingChange(underlying.code, underlying.name);
      // 清空到期月份选择
      onExpiryMonthChange('');
    }
  };

  const handleExpiryMonthChange = (value: string) => {
    onExpiryMonthChange(value);
  };

  return (
    <Space size="large" align="center">
      <Space>
        <Text strong>标的物：</Text>
        <Select
          style={{ width: 200 }}
          placeholder="请选择标的物"
          loading={loadingUnderlyings}
          value={selectedUnderlying}
          onChange={handleUnderlyingChange}
        >
          {underlyings.map(underlying => (
            <Option key={underlying.code} value={underlying.code}>
              {underlying.name}
            </Option>
          ))}
        </Select>
      </Space>

      <Space>
        <Text strong>到期月份：</Text>
        <Select
          style={{ width: 150 }}
          placeholder="请选择到期月份"
          loading={loadingExpiryMonths}
          value={selectedExpiryMonth}
          onChange={handleExpiryMonthChange}
          disabled={!selectedUnderlying}
        >
          {expiryMonths.map(month => (
            <Option key={month.value} value={month.value}>
              {month.label}
            </Option>
          ))}
        </Select>
      </Space>
    </Space>
  );
};

export default UnderlyingSelector;

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Spin, message, Badge } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import UnderlyingSelector from '../components/UnderlyingSelector';
import TQuoteTable from '../components/TQuoteTable';
import PortfolioSaveModal from '../components/PortfolioSaveModal';
import { optionApi } from '../services/api';
import { TQuoteData, OptionContract, SelectedContract } from '../types';

const { Title } = Typography;

const OptionPortfolioPage: React.FC = () => {
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>('');
  const [selectedUnderlyingName, setSelectedUnderlyingName] = useState<string>('');
  const [selectedExpiryMonth, setSelectedExpiryMonth] = useState<string>('');
  const [quoteData, setQuoteData] = useState<TQuoteData | null>(null);
  const [selectedContracts, setSelectedContracts] = useState<SelectedContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  // 加载期权合约数据
  const loadOptionContracts = async () => {
    if (!selectedUnderlying || !selectedExpiryMonth) return;

    setLoading(true);
    try {
      const response = await optionApi.getOptionContracts(selectedUnderlying, selectedExpiryMonth);
      if (response.code === 0 && response.data) {
        setQuoteData(response.data);
      } else {
        message.error('加载期权数据失败');
      }
    } catch (error) {
      console.error('Failed to load option contracts:', error);
      message.error('加载期权数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 当标的物或到期月份改变时，重新加载数据
  useEffect(() => {
    if (selectedUnderlying && selectedExpiryMonth) {
      loadOptionContracts();
      // 清空已选合约
      setSelectedContracts([]);
    }
  }, [selectedUnderlying, selectedExpiryMonth]);

  // 处理标的物改变
  const handleUnderlyingChange = (underlying: string, underlyingName: string) => {
    setSelectedUnderlying(underlying);
    setSelectedUnderlyingName(underlyingName);
  };

  // 处理到期月份改变
  const handleExpiryMonthChange = (expiryMonth: string) => {
    setSelectedExpiryMonth(expiryMonth);
  };

  // 处理期权合约选择
  const handleContractSelect = (contract: OptionContract, selected: boolean) => {
    if (selected) {
      // 添加到选中列表
      const selectedContract: SelectedContract = {
        contract_code: contract.contract_code,
        contract_name: contract.contract_name,
        option_type: contract.option_type,
        strike_price: contract.strike_price,
        last_price: contract.last_price,
        position_type: 'long', // 默认买入
        quantity: 1, // 默认数量1
        delta: contract.delta,
        gamma: contract.gamma,
        theta: contract.theta,
        vega: contract.vega,
        implied_volatility: contract.implied_volatility,
      };
      setSelectedContracts(prev => [...prev, selectedContract]);
    } else {
      // 从选中列表中移除
      setSelectedContracts(prev => 
        prev.filter(c => c.contract_code !== contract.contract_code)
      );
    }
  };

  // 更新选中合约的属性
  const handleUpdateContract = (contractCode: string, updates: Partial<SelectedContract>) => {
    setSelectedContracts(prev =>
      prev.map(contract =>
        contract.contract_code === contractCode
          ? { ...contract, ...updates }
          : contract
      )
    );
  };

  // 移除选中的合约
  const handleRemoveContract = (contractCode: string) => {
    setSelectedContracts(prev =>
      prev.filter(contract => contract.contract_code !== contractCode)
    );
  };

  // 处理保存成功
  const handleSaveSuccess = () => {
    setSaveModalVisible(false);
    setSelectedContracts([]);
    message.success('期权组合保存成功！');
  };

  // 刷新数据
  const handleRefresh = () => {
    loadOptionContracts();
  };

  return (
    <div className="option-portfolio-container">
      <Card className="portfolio-header">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={2} style={{ margin: 0 }}>期权组合配置</Title>
          
          <UnderlyingSelector
            onUnderlyingChange={handleUnderlyingChange}
            onExpiryMonthChange={handleExpiryMonthChange}
            selectedUnderlying={selectedUnderlying}
            selectedExpiryMonth={selectedExpiryMonth}
          />

          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => setSaveModalVisible(true)}
              disabled={selectedContracts.length === 0}
            >
              <Badge count={selectedContracts.length} offset={[10, 0]}>
                保存期权组合
              </Badge>
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              disabled={!selectedUnderlying || !selectedExpiryMonth}
            >
              刷新数据
            </Button>
          </Space>
        </Space>
      </Card>

      <Card className="t-quote-container">
        <div className="t-quote-header">
          <Title level={4} style={{ margin: 0 }}>T型报价</Title>
          <div className="selected-count">
            已选择 {selectedContracts.length} 个合约
          </div>
        </div>

        <div className="t-quote-table">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
            </div>
          ) : quoteData ? (
            <TQuoteTable
              data={quoteData.contracts}
              underlyingPrice={quoteData.underlying_price}
              selectedContracts={selectedContracts}
              onContractSelect={handleContractSelect}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
              请选择标的物和到期月份以加载期权数据
            </div>
          )}
        </div>
      </Card>

      <PortfolioSaveModal
        visible={saveModalVisible}
        onCancel={() => setSaveModalVisible(false)}
        onSuccess={handleSaveSuccess}
        selectedContracts={selectedContracts}
        underlyingSymbol={selectedUnderlying}
        underlyingName={selectedUnderlyingName}
        expiryMonth={selectedExpiryMonth}
        onUpdateContract={handleUpdateContract}
        onRemoveContract={handleRemoveContract}
      />
    </div>
  );
};

export default OptionPortfolioPage;

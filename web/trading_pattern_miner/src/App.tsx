import React, { useState, useCallback, useEffect } from 'react';
import { Layout, Menu, Spin, message } from 'antd';
import {
  UploadOutlined,
  LineChartOutlined,
  RobotOutlined,
  SearchOutlined,
  BarChartOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// 页面组件
import DataImportPage from './pages/DataImportPage';
import ChartAnalysisPage from './pages/ChartAnalysisPage';
import StrategyGeneratorPage from './pages/StrategyGeneratorPage';
import PatternMatchingPage from './pages/PatternMatchingPage';
import BacktestPage from './pages/BacktestPage';
import OptimizationPage from './pages/OptimizationPage';

// 类型和工具
import { SystemState, EnhancedStockData, TradingStrategy, BacktestResult } from './types';
import { WorkerManager } from './utils/WorkerManager';

import './App.css';

const { Header, Sider, Content } = Layout;

// 主应用组件
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 系统状态
  const [systemState, setSystemState] = useState<SystemState>({
    isLoading: false,
    currentData: [],
    strategies: [],
    backtestResults: {},
    patternMatches: [],
    optimizationResults: [],
  });

  const [collapsed, setCollapsed] = useState(false);
  const [workerManager] = useState(() => new WorkerManager());

  // 初始化Worker管理器
  useEffect(() => {
    workerManager.initialize();
    return () => workerManager.terminate();
  }, [workerManager]);

  // 更新系统状态的辅助函数
  const updateSystemState = useCallback((updates: Partial<SystemState>) => {
    setSystemState(prev => ({ ...prev, ...updates }));
  }, []);

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    updateSystemState({ isLoading: loading });
  }, [updateSystemState]);

  // 更新股票数据
  const updateStockData = useCallback((data: EnhancedStockData[]) => {
    updateSystemState({ currentData: data });
    message.success(`成功加载 ${data.length} 条数据记录`);
  }, [updateSystemState]);

  // 添加策略
  const addStrategy = useCallback((strategy: TradingStrategy) => {
    setSystemState(prev => ({
      ...prev,
      strategies: [...prev.strategies, strategy]
    }));
    message.success(`策略 "${strategy.name}" 已添加`);
  }, []);

  // 更新策略
  const updateStrategy = useCallback((strategyId: string, updates: Partial<TradingStrategy>) => {
    setSystemState(prev => ({
      ...prev,
      strategies: prev.strategies.map(s => 
        s.id === strategyId ? { ...s, ...updates } : s
      )
    }));
  }, []);

  // 删除策略
  const removeStrategy = useCallback((strategyId: string) => {
    setSystemState(prev => ({
      ...prev,
      strategies: prev.strategies.filter(s => s.id !== strategyId),
      backtestResults: Object.fromEntries(
        Object.entries(prev.backtestResults).filter(([id]) => id !== strategyId)
      )
    }));
    message.success('策略已删除');
  }, []);

  // 更新回测结果
  const updateBacktestResult = useCallback((strategyId: string, result: BacktestResult) => {
    setSystemState(prev => ({
      ...prev,
      backtestResults: {
        ...prev.backtestResults,
        [strategyId]: result
      }
    }));
  }, []);

  // 菜单项配置
  const menuItems = [
    {
      key: '/data-import',
      icon: <UploadOutlined />,
      label: '数据导入',
    },
    {
      key: '/chart-analysis',
      icon: <LineChartOutlined />,
      label: '图表分析',
    },
    {
      key: '/strategy-generator',
      icon: <RobotOutlined />,
      label: '策略生成',
    },
    {
      key: '/pattern-matching',
      icon: <SearchOutlined />,
      label: '形态匹配',
    },
    {
      key: '/backtest',
      icon: <BarChartOutlined />,
      label: '策略回测',
    },
    {
      key: '/optimization',
      icon: <SettingOutlined />,
      label: '参数优化',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
        width={250}
      >
        <div className="logo">
          <h2 style={{ color: 'white', textAlign: 'center', margin: '16px 0' }}>
            {collapsed ? 'TPM' : '交易规律挖掘'}
          </h2>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#1890ff' }}>
              股票交易规律挖掘系统
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {systemState.currentData.length > 0 && (
                <span style={{ color: '#52c41a' }}>
                  数据: {systemState.currentData.length} 条
                </span>
              )}
              {systemState.strategies.length > 0 && (
                <span style={{ color: '#1890ff' }}>
                  策略: {systemState.strategies.length} 个
                </span>
              )}
              {systemState.isLoading && <Spin size="small" />}
            </div>
          </div>
        </Header>
        
        <Content style={{ margin: '24px', background: '#fff', borderRadius: '8px' }}>
          <div style={{ padding: '24px', minHeight: 'calc(100vh - 112px)' }}>
            <Routes>
              <Route 
                path="/data-import" 
                element={
                  <DataImportPage 
                    onDataLoaded={updateStockData}
                    setLoading={setLoading}
                    workerManager={workerManager}
                  />
                } 
              />
              <Route 
                path="/chart-analysis" 
                element={
                  <ChartAnalysisPage 
                    data={systemState.currentData}
                    strategies={systemState.strategies}
                  />
                } 
              />
              <Route 
                path="/strategy-generator" 
                element={
                  <StrategyGeneratorPage 
                    data={systemState.currentData}
                    onStrategyGenerated={addStrategy}
                    setLoading={setLoading}
                    workerManager={workerManager}
                  />
                } 
              />
              <Route 
                path="/pattern-matching" 
                element={
                  <PatternMatchingPage 
                    data={systemState.currentData}
                    setLoading={setLoading}
                    workerManager={workerManager}
                  />
                } 
              />
              <Route 
                path="/backtest" 
                element={
                  <BacktestPage 
                    data={systemState.currentData}
                    strategies={systemState.strategies}
                    backtestResults={systemState.backtestResults}
                    onBacktestComplete={updateBacktestResult}
                    onStrategyUpdate={updateStrategy}
                    onStrategyRemove={removeStrategy}
                    setLoading={setLoading}
                    workerManager={workerManager}
                  />
                } 
              />
              <Route 
                path="/optimization" 
                element={
                  <OptimizationPage 
                    data={systemState.currentData}
                    strategies={systemState.strategies}
                    onOptimizationComplete={(results) => 
                      updateSystemState({ optimizationResults: results })
                    }
                    setLoading={setLoading}
                    workerManager={workerManager}
                  />
                } 
              />
              <Route path="/" element={<DataImportPage onDataLoaded={updateStockData} setLoading={setLoading} workerManager={workerManager} />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;

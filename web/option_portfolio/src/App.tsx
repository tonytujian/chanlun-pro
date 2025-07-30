import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import OptionPortfolioPage from './pages/OptionPortfolioPage';
import TradingDashboard from './pages/TradingDashboard';

const { Content } = Layout;

function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Content>
          <Routes>
            <Route path="/" element={<OptionPortfolioPage />} />
            <Route path="/portfolio" element={<OptionPortfolioPage />} />
            <Route path="/dashboard" element={<TradingDashboard />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;

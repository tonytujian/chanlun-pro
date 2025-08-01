import React, { useState, useEffect } from 'react';
import { Card, Progress, Typography, Space, Alert, Button } from 'antd';
import { 
  MonitorOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ReloadOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  workerStatus: { [key: string]: 'active' | 'idle' | 'error' };
  taskQueue: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  workerManager?: any;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ workerManager }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
    workerStatus: {},
    taskQueue: 0,
    lastUpdate: Date.now()
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // 获取内存使用情况
  const getMemoryUsage = (): number => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  };

  // 模拟CPU使用率（实际应用中可能需要更复杂的计算）
  const getCPUUsage = (): number => {
    // 这里使用一个简单的启发式方法
    const start = performance.now();
    let iterations = 0;
    const maxTime = 5; // 5ms测试时间
    
    while (performance.now() - start < maxTime) {
      iterations++;
    }
    
    // 基于迭代次数估算CPU负载（这是一个简化的方法）
    const baselineIterations = 100000; // 基准迭代次数
    const usage = Math.max(0, Math.min(100, (baselineIterations - iterations) / baselineIterations * 100));
    return usage;
  };

  // 获取Worker状态
  const getWorkerStatus = (): { [key: string]: 'active' | 'idle' | 'error' } => {
    if (!workerManager) return {};
    
    const workers = workerManager.workers || {};
    const status: { [key: string]: 'active' | 'idle' | 'error' } = {};
    
    Object.keys(workers).forEach(workerName => {
      const worker = workers[workerName];
      if (worker) {
        // 简单的状态检测
        status[workerName] = 'idle'; // 默认为空闲状态
      } else {
        status[workerName] = 'error';
      }
    });
    
    return status;
  };

  // 更新性能指标
  const updateMetrics = () => {
    const newMetrics: PerformanceMetrics = {
      memoryUsage: getMemoryUsage(),
      cpuUsage: getCPUUsage(),
      workerStatus: getWorkerStatus(),
      taskQueue: Object.keys(workerManager?.messageHandlers || {}).length,
      lastUpdate: Date.now()
    };
    
    setMetrics(newMetrics);
  };

  // 开始/停止监控
  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  // 定期更新指标
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isMonitoring) {
      interval = setInterval(updateMetrics, 2000); // 每2秒更新一次
      updateMetrics(); // 立即更新一次
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isMonitoring, workerManager]);

  // 获取状态颜色
  const getStatusColor = (status: 'active' | 'idle' | 'error'): string => {
    switch (status) {
      case 'active': return '#1890ff';
      case 'idle': return '#52c41a';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取状态文本
  const getStatusText = (status: 'active' | 'idle' | 'error'): string => {
    switch (status) {
      case 'active': return '运行中';
      case 'idle': return '空闲';
      case 'error': return '错误';
      default: return '未知';
    }
  };

  // 获取性能等级
  const getPerformanceLevel = (usage: number): { level: string; color: string } => {
    if (usage < 30) return { level: '良好', color: '#52c41a' };
    if (usage < 60) return { level: '一般', color: '#faad14' };
    if (usage < 80) return { level: '较高', color: '#fa8c16' };
    return { level: '过高', color: '#ff4d4f' };
  };

  const memoryLevel = getPerformanceLevel(metrics.memoryUsage);
  const cpuLevel = getPerformanceLevel(metrics.cpuUsage);

  return (
    <Card 
      title={
        <Space>
          <MonitorOutlined />
          <span>性能监控</span>
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          onClick={toggleMonitoring}
          type={isMonitoring ? 'primary' : 'default'}
        >
          {isMonitoring ? '停止监控' : '开始监控'}
        </Button>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 内存使用情况 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text>内存使用率</Text>
            <Space>
              <Text style={{ color: memoryLevel.color }}>
                {memoryLevel.level}
              </Text>
              <Text type="secondary">
                {metrics.memoryUsage.toFixed(1)}%
              </Text>
            </Space>
          </div>
          <Progress
            percent={metrics.memoryUsage}
            strokeColor={memoryLevel.color}
            showInfo={false}
            size="small"
          />
        </div>

        {/* CPU使用情况 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text>CPU负载</Text>
            <Space>
              <Text style={{ color: cpuLevel.color }}>
                {cpuLevel.level}
              </Text>
              <Text type="secondary">
                {metrics.cpuUsage.toFixed(1)}%
              </Text>
            </Space>
          </div>
          <Progress
            percent={metrics.cpuUsage}
            strokeColor={cpuLevel.color}
            showInfo={false}
            size="small"
          />
        </div>

        {/* Worker状态 */}
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Worker状态
          </Text>
          <Space wrap>
            {Object.entries(metrics.workerStatus).map(([name, status]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(status)
                  }}
                />
                <Text style={{ fontSize: '12px' }}>
                  {name}: {getStatusText(status)}
                </Text>
              </div>
            ))}
          </Space>
        </div>

        {/* 任务队列 */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Text>待处理任务</Text>
          <Text type="secondary">{metrics.taskQueue}</Text>
        </div>

        {/* 性能警告 */}
        {(metrics.memoryUsage > 80 || metrics.cpuUsage > 80) && (
          <Alert
            message="性能警告"
            description={
              <div>
                {metrics.memoryUsage > 80 && <div>• 内存使用率过高，建议刷新页面</div>}
                {metrics.cpuUsage > 80 && <div>• CPU负载过高，建议减少并发任务</div>}
              </div>
            }
            type="warning"
            icon={<WarningOutlined />}
            showIcon
            size="small"
          />
        )}

        {/* 系统状态 */}
        {isMonitoring && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                监控中
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              更新: {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </Text>
          </div>
        )}

        {/* 性能建议 */}
        <div>
          <Text strong style={{ fontSize: '12px' }}>性能建议：</Text>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: '12px' }}>
            <li>大数据处理时使用Web Workers避免UI阻塞</li>
            <li>启用虚拟滚动处理大量列表数据</li>
            <li>定期清理不需要的计算结果缓存</li>
            <li>避免同时运行多个密集计算任务</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default PerformanceMonitor;

import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Upload, 
  Button, 
  Select, 
  Form, 
  Table, 
  message, 
  Progress, 
  Space, 
  Typography,
  Row,
  Col,
  Alert,
  Divider
} from 'antd';
import { 
  UploadOutlined, 
  FileExcelOutlined, 
  CheckCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import Papa from 'papaparse';
import { EnhancedStockData, DataImportConfig } from '../types';
import { WorkerManager } from '../utils/WorkerManager';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface DataImportPageProps {
  onDataLoaded: (data: EnhancedStockData[]) => void;
  setLoading: (loading: boolean) => void;
  workerManager: WorkerManager;
}

const DataImportPage: React.FC<DataImportPageProps> = ({
  onDataLoaded,
  setLoading,
  workerManager
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // 文件上传处理
  const handleFileUpload: UploadProps['customRequest'] = useCallback((options) => {
    const { file, onSuccess } = options;
    
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        
        // 使用Papa Parse解析CSV
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              message.error('CSV文件解析失败: ' + results.errors[0].message);
              return;
            }
            
            const data = results.data as any[];
            const cols = Object.keys(data[0] || {});
            
            setCsvData(data);
            setColumns(cols);
            setPreviewData(data.slice(0, 10)); // 显示前10行预览
            
            // 自动检测列映射
            autoDetectColumns(cols);
            
            message.success(`成功解析 ${data.length} 行数据`);
            onSuccess?.(file);
          },
          error: (error) => {
            message.error('文件读取失败: ' + error.message);
          }
        });
      };
      
      reader.onerror = () => {
        message.error('文件读取失败');
      };
      
      reader.readAsText(file);
    }
  }, []);

  // 自动检测列映射
  const autoDetectColumns = useCallback((cols: string[]) => {
    const mapping: any = {};
    
    // 常见的列名映射
    const columnMappings = {
      date: ['date', 'time', '日期', '时间', 'datetime'],
      open: ['open', '开盘价', '开盘', 'o'],
      high: ['high', '最高价', '最高', 'h'],
      low: ['low', '最低价', '最低', 'l'],
      close: ['close', '收盘价', '收盘', 'c'],
      volume: ['volume', '成交量', '量', 'vol', 'v']
    };
    
    Object.entries(columnMappings).forEach(([key, patterns]) => {
      const matchedCol = cols.find(col => 
        patterns.some(pattern => 
          col.toLowerCase().includes(pattern.toLowerCase())
        )
      );
      if (matchedCol) {
        mapping[key + 'Column'] = matchedCol;
      }
    });
    
    // 设置默认分隔符和日期格式
    mapping.delimiter = ',';
    mapping.dateFormat = 'YYYY-MM-DD';
    
    form.setFieldsValue(mapping);
  }, [form]);

  // 处理数据导入
  const handleImport = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (csvData.length === 0) {
        message.error('请先上传CSV文件');
        return;
      }
      
      setIsProcessing(true);
      setImportProgress(0);
      setLoading(true);
      
      // 数据转换和验证
      const stockData = csvData.map((row, index) => {
        setImportProgress((index / csvData.length) * 50); // 前50%进度用于数据转换
        
        const dateStr = row[values.dateColumn];
        const open = parseFloat(row[values.openColumn]);
        const high = parseFloat(row[values.highColumn]);
        const low = parseFloat(row[values.lowColumn]);
        const close = parseFloat(row[values.closeColumn]);
        const volume = parseFloat(row[values.volumeColumn]) || 0;
        
        // 数据验证
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          throw new Error(`第 ${index + 1} 行数据格式错误`);
        }
        
        if (high < Math.max(open, close) || low > Math.min(open, close)) {
          console.warn(`第 ${index + 1} 行数据可能有误: 最高价或最低价不合理`);
        }
        
        return {
          date: dateStr,
          open,
          high,
          low,
          close,
          volume,
          timestamp: new Date(dateStr).getTime()
        };
      }).filter(item => !isNaN(item.timestamp)) // 过滤无效日期
        .sort((a, b) => a.timestamp - b.timestamp); // 按日期排序
      
      if (stockData.length === 0) {
        throw new Error('没有有效的数据记录');
      }
      
      message.info('开始计算技术指标...');
      
      // 使用Worker计算技术指标
      const response = await workerManager.sendMessage('indicators', {
        type: 'CALCULATE_INDICATORS',
        payload: { data: stockData },
        id: 'calculate_indicators'
      });
      
      setImportProgress(100);
      
      const enhancedData = response.payload as EnhancedStockData[];
      onDataLoaded(enhancedData);
      
      message.success(`成功导入 ${enhancedData.length} 条数据记录`);
      
    } catch (error: any) {
      console.error('数据导入失败:', error);
      message.error('数据导入失败: ' + error.message);
    } finally {
      setIsProcessing(false);
      setLoading(false);
      setImportProgress(0);
    }
  }, [csvData, form, onDataLoaded, setLoading, workerManager]);

  // 上传配置
  const uploadProps: UploadProps = {
    fileList,
    customRequest: handleFileUpload,
    onChange: ({ fileList: newFileList }) => setFileList(newFileList),
    onRemove: () => {
      setCsvData([]);
      setColumns([]);
      setPreviewData([]);
      form.resetFields();
    },
    accept: '.csv,.txt',
    maxCount: 1,
  };

  // 预览表格列配置
  const previewColumns = columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    width: 120,
    ellipsis: true,
  }));

  return (
    <div>
      <Title level={2}>数据导入</Title>
      <Paragraph>
        上传股票历史数据CSV文件，系统将自动计算技术指标并为后续分析做准备。
      </Paragraph>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="文件上传" icon={<UploadOutlined />}>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽CSV文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持CSV格式文件，包含日期、开盘价、最高价、最低价、收盘价、成交量等字段
              </p>
            </Dragger>
            
            {csvData.length > 0 && (
              <Alert
                message={`已解析 ${csvData.length} 行数据`}
                type="success"
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="数据格式要求" icon={<InfoCircleOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>CSV文件应包含以下列：</Text>
              <ul>
                <li><Text code>日期</Text> - 交易日期 (YYYY-MM-DD格式)</li>
                <li><Text code>开盘价</Text> - 当日开盘价格</li>
                <li><Text code>最高价</Text> - 当日最高价格</li>
                <li><Text code>最低价</Text> - 当日最低价格</li>
                <li><Text code>收盘价</Text> - 当日收盘价格</li>
                <li><Text code>成交量</Text> - 当日成交量</li>
              </ul>
              
              <Divider />
              
              <Text strong>示例数据格式：</Text>
              <pre style={{ background: '#f5f5f5', padding: '8px', fontSize: '12px' }}>
{`date,open,high,low,close,volume
2023-01-01,100.0,102.5,99.5,101.2,1000000
2023-01-02,101.2,103.0,100.8,102.5,1200000`}
              </pre>
            </Space>
          </Card>
        </Col>
      </Row>
      
      {columns.length > 0 && (
        <Card title="列映射配置" style={{ marginTop: 24 }}>
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="dateColumn"
                  label="日期列"
                  rules={[{ required: true, message: '请选择日期列' }]}
                >
                  <Select placeholder="选择日期列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="openColumn"
                  label="开盘价列"
                  rules={[{ required: true, message: '请选择开盘价列' }]}
                >
                  <Select placeholder="选择开盘价列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="highColumn"
                  label="最高价列"
                  rules={[{ required: true, message: '请选择最高价列' }]}
                >
                  <Select placeholder="选择最高价列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="lowColumn"
                  label="最低价列"
                  rules={[{ required: true, message: '请选择最低价列' }]}
                >
                  <Select placeholder="选择最低价列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="closeColumn"
                  label="收盘价列"
                  rules={[{ required: true, message: '请选择收盘价列' }]}
                >
                  <Select placeholder="选择收盘价列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="volumeColumn"
                  label="成交量列"
                  rules={[{ required: true, message: '请选择成交量列' }]}
                >
                  <Select placeholder="选择成交量列">
                    {columns.map(col => (
                      <Option key={col} value={col}>{col}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="delimiter"
                  label="分隔符"
                  initialValue=","
                >
                  <Select>
                    <Option value=",">逗号 (,)</Option>
                    <Option value=";">分号 (;)</Option>
                    <Option value="\t">制表符 (\t)</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Form.Item
                  name="dateFormat"
                  label="日期格式"
                  initialValue="YYYY-MM-DD"
                >
                  <Select>
                    <Option value="YYYY-MM-DD">YYYY-MM-DD</Option>
                    <Option value="MM/DD/YYYY">MM/DD/YYYY</Option>
                    <Option value="DD/MM/YYYY">DD/MM/YYYY</Option>
                    <Option value="YYYY/MM/DD">YYYY/MM/DD</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item>
              <Button 
                type="primary" 
                size="large"
                onClick={handleImport}
                loading={isProcessing}
                disabled={csvData.length === 0}
              >
                开始导入数据
              </Button>
            </Form.Item>
          </Form>
          
          {isProcessing && (
            <div style={{ marginTop: 16 }}>
              <Progress 
                percent={importProgress} 
                status="active"
                format={(percent) => `${percent?.toFixed(0)}%`}
              />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                正在处理数据并计算技术指标...
              </Text>
            </div>
          )}
        </Card>
      )}
      
      {previewData.length > 0 && (
        <Card title="数据预览" style={{ marginTop: 24 }}>
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            显示前10行数据预览
          </Text>
          <Table
            columns={previewColumns}
            dataSource={previewData}
            pagination={false}
            scroll={{ x: true }}
            size="small"
            rowKey={(record, index) => index?.toString() || '0'}
          />
        </Card>
      )}
    </div>
  );
};

export default DataImportPage;

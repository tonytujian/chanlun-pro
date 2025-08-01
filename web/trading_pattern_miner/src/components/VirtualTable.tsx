import React, { useMemo } from 'react';
import { Table } from 'antd';
import { FixedSizeList as List } from 'react-window';
import type { ColumnsType } from 'antd/es/table';

interface VirtualTableProps<T = any> {
  columns: ColumnsType<T>;
  dataSource: T[];
  height?: number;
  itemHeight?: number;
  rowKey?: string | ((record: T) => string);
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLTableRowElement>;
  loading?: boolean;
  pagination?: false | object;
}

const VirtualTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  height = 400,
  itemHeight = 54,
  rowKey = 'key',
  onRow,
  loading = false,
  pagination = false
}: VirtualTableProps<T>) => {
  // 计算表格总宽度
  const totalWidth = useMemo(() => {
    return columns.reduce((total, col) => {
      const width = col.width as number;
      return total + (width || 100);
    }, 0);
  }, [columns]);

  // 虚拟化行渲染器
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = dataSource[index];
    if (!record) return null;

    const rowProps = onRow ? onRow(record, index) : {};

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff'
        }}
        {...rowProps}
      >
        {columns.map((col, colIndex) => {
          const key = col.key || col.dataIndex;
          const value = record[col.dataIndex as string];
          const width = (col.width as number) || 100;

          let displayValue = value;
          if (col.render) {
            displayValue = col.render(value, record, index);
          }

          return (
            <div
              key={key || colIndex}
              style={{
                width: `${width}px`,
                padding: '8px 16px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                ...(col.align === 'center' && { justifyContent: 'center' }),
                ...(col.align === 'right' && { justifyContent: 'flex-end' })
              }}
            >
              {displayValue}
            </div>
          );
        })}
      </div>
    );
  };

  // 表头渲染
  const TableHeader = () => (
    <div
      style={{
        display: 'flex',
        backgroundColor: '#fafafa',
        borderBottom: '2px solid #f0f0f0',
        fontWeight: 600,
        fontSize: '14px'
      }}
    >
      {columns.map((col, index) => {
        const width = (col.width as number) || 100;
        return (
          <div
            key={col.key || col.dataIndex || index}
            style={{
              width: `${width}px`,
              padding: '12px 16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              ...(col.align === 'center' && { justifyContent: 'center' }),
              ...(col.align === 'right' && { justifyContent: 'flex-end' })
            }}
          >
            {col.title}
          </div>
        );
      })}
    </div>
  );

  // 如果数据量不大，使用普通表格
  if (dataSource.length <= 100) {
    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        onRow={onRow}
        loading={loading}
        pagination={pagination}
        scroll={{ y: height }}
        size="small"
      />
    );
  }

  // 大数据量使用虚拟滚动
  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: '6px',
        overflow: 'hidden'
      }}
    >
      <TableHeader />
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <div style={{ width: `${totalWidth}px` }}>
          <List
            height={height - 45} // 减去表头高度
            itemCount={dataSource.length}
            itemSize={itemHeight}
            width={totalWidth}
          >
            {Row}
          </List>
        </div>
      </div>
      
      {/* 数据统计信息 */}
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: '#fafafa',
          borderTop: '1px solid #f0f0f0',
          fontSize: '12px',
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <span>共 {dataSource.length} 条记录</span>
        <span>使用虚拟滚动优化</span>
      </div>
    </div>
  );
};

// 虚拟化列表组件
interface VirtualListProps<T = any> {
  dataSource: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number;
  itemHeight?: number;
  loading?: boolean;
  emptyText?: string;
}

export const VirtualList = <T extends any>({
  dataSource,
  renderItem,
  height = 400,
  itemHeight = 60,
  loading = false,
  emptyText = '暂无数据'
}: VirtualListProps<T>) => {
  const ListItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = dataSource[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #f0f0f0',
          borderRadius: '6px'
        }}
      >
        加载中...
      </div>
    );
  }

  if (dataSource.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          color: '#999'
        }}
      >
        {emptyText}
      </div>
    );
  }

  // 小数据量直接渲染
  if (dataSource.length <= 50) {
    return (
      <div
        style={{
          height,
          overflow: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: '6px'
        }}
      >
        {dataSource.map((item, index) => (
          <div key={index}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // 大数据量使用虚拟滚动
  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: '6px',
        overflow: 'hidden'
      }}
    >
      <List
        height={height}
        itemCount={dataSource.length}
        itemSize={itemHeight}
        width="100%"
      >
        {ListItem}
      </List>
      
      <div
        style={{
          padding: '8px 16px',
          backgroundColor: '#fafafa',
          borderTop: '1px solid #f0f0f0',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}
      >
        共 {dataSource.length} 条记录 (虚拟滚动)
      </div>
    </div>
  );
};

export default VirtualTable;

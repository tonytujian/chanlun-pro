import React, { useState, useEffect } from 'react';
import { Layout, Grid, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;
const { Header, Sider, Content } = Layout;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sider?: React.ReactNode;
  header?: React.ReactNode;
  headerHeight?: number;
  siderWidth?: number;
  collapsedWidth?: number;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sider,
  header,
  headerHeight = 64,
  siderWidth = 250,
  collapsedWidth = 80
}) => {
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);

  // 判断是否为移动设备
  const isMobile = !screens.md;

  // 响应式处理
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  // 移动端侧边栏
  const MobileSider = () => (
    <Drawer
      title="菜单"
      placement="left"
      onClose={() => setMobileDrawerVisible(false)}
      open={mobileDrawerVisible}
      bodyStyle={{ padding: 0 }}
      width={siderWidth}
    >
      {sider}
    </Drawer>
  );

  // 桌面端侧边栏
  const DesktopSider = () => (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={siderWidth}
      collapsedWidth={collapsedWidth}
      theme="dark"
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100
      }}
    >
      {sider}
    </Sider>
  );

  // 响应式Header
  const ResponsiveHeader = () => (
    <Header
      style={{
        position: 'fixed',
        top: 0,
        zIndex: 1000,
        width: '100%',
        height: headerHeight,
        padding: isMobile ? '0 16px' : `0 24px`,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        marginLeft: isMobile ? 0 : (collapsed ? collapsedWidth : siderWidth)
      }}
    >
      {isMobile && (
        <MenuOutlined
          style={{ fontSize: '18px', marginRight: '16px', cursor: 'pointer' }}
          onClick={() => setMobileDrawerVisible(true)}
        />
      )}
      {header}
    </Header>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      {sider && (
        <>
          {isMobile ? <MobileSider /> : <DesktopSider />}
        </>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? collapsedWidth : siderWidth),
          transition: 'margin-left 0.2s'
        }}
      >
        {/* 头部 */}
        {header && <ResponsiveHeader />}

        {/* 内容区域 */}
        <Content
          style={{
            marginTop: header ? headerHeight : 0,
            padding: isMobile ? '16px' : '24px',
            background: '#f0f2f5',
            minHeight: `calc(100vh - ${header ? headerHeight : 0}px)`
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              minHeight: '100%'
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

// 响应式网格组件
interface ResponsiveGridProps {
  children: React.ReactNode;
  gutter?: [number, number];
  minColWidth?: number;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  gutter = [16, 16],
  minColWidth = 300
}) => {
  const screens = useBreakpoint();
  
  // 根据屏幕大小计算列数
  const getColumns = () => {
    if (screens.xxl) return 4;
    if (screens.xl) return 3;
    if (screens.lg) return 2;
    if (screens.md) return 2;
    return 1;
  };

  const columns = getColumns();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gutter[1]}px ${gutter[0]}px`,
        width: '100%'
      }}
    >
      {children}
    </div>
  );
};

// 响应式卡片组件
interface ResponsiveCardProps {
  children: React.ReactNode;
  title?: string;
  extra?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({
  children,
  title,
  extra,
  className,
  style
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div
      className={className}
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: isMobile ? '16px' : '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        ...style
      }}
    >
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            gap: isMobile ? '8px' : '16px'
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 600
              }}
            >
              {title}
            </h3>
          )}
          {extra && (
            <div style={{ flexShrink: 0 }}>
              {extra}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

// 响应式表格容器
interface ResponsiveTableProps {
  children: React.ReactNode;
  scroll?: { x?: number; y?: number };
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  scroll
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div
      style={{
        overflow: 'auto',
        width: '100%',
        ...(isMobile && {
          fontSize: '12px'
        })
      }}
    >
      {React.cloneElement(children as React.ReactElement, {
        scroll: {
          x: isMobile ? 800 : scroll?.x,
          y: scroll?.y
        },
        size: isMobile ? 'small' : 'middle',
        pagination: isMobile ? { 
          simple: true, 
          pageSize: 5,
          showSizeChanger: false 
        } : undefined
      })}
    </div>
  );
};

// 响应式统计卡片
interface ResponsiveStatCardProps {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: string;
}

export const ResponsiveStatCard: React.FC<ResponsiveStatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  color
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <ResponsiveCard>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: isMobile ? '12px' : '14px',
            color: '#666',
            marginBottom: '8px'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: isMobile ? '20px' : '28px',
            fontWeight: 'bold',
            color: color || '#1890ff',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          {prefix}
          {value}
          {suffix && <span style={{ fontSize: '14px' }}>{suffix}</span>}
        </div>
        {trend && trendValue && (
          <div
            style={{
              fontSize: '12px',
              color: trend === 'up' ? '#52c41a' : '#ff4d4f'
            }}
          >
            {trend === 'up' ? '↗' : '↘'} {trendValue}
          </div>
        )}
      </div>
    </ResponsiveCard>
  );
};

export default ResponsiveLayout;

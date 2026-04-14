import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, ConfigProvider } from 'antd';
import { LayoutDashboard, Archive, Box, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon } from 'lucide-react'; // 补充引入一个图标
import './i18n';

// 引入页面组件
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cabinets from './pages/Cabinets';
import Assets from './pages/Assets';
import Users from './pages/Users';

const { Header, Sider, Content } = Layout;

const AuthGuard = ({ children }) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem('quickman_token')) {
      navigate('/login');
    }
  }, [navigate]);
  if (!localStorage.getItem('quickman_token')) return null;
  return children;
};

// 🌟 需要登录的布局壳子
const MainLayout = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('quickman_token');
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
          {collapsed ? 'QM' : 'QUICKMAN'}
        </div>
        <Menu theme="dark" mode="inline" defaultSelectedKeys={[window.location.pathname]}>
          <Menu.Item key="/" icon={<LayoutDashboard size={16}/>}><Link to="/">{t('dashboard')}</Link></Menu.Item>
          <Menu.Item key="/cabinets" icon={<Archive size={16}/>}><Link to="/cabinets">{t('cabinets')}</Link></Menu.Item>
          <Menu.Item key="/assets" icon={<Box size={16}/>}><Link to="/assets">{t('assets')}</Link></Menu.Item>
          <Menu.Item key="/users" icon={<UsersIcon size={16}/>}><Link to="/users">{t('users')}</Link></Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <Button type="text" icon={<Globe size={18} />} onClick={toggleLanguage}>
            {i18n.language === 'zh' ? 'English' : '中文'}
          </Button>
          <Button type="text" danger icon={<LogOut size={18} />} onClick={handleLogout}>
            {t('logout')}
          </Button>
        </Header>
        <Content style={{ margin: '24px', padding: 24, background: '#fff', borderRadius: 8 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default function App() {
  return (
    <ConfigProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><MainLayout><Dashboard /></MainLayout></AuthGuard>} />
          <Route path="/cabinets" element={<AuthGuard><MainLayout><Cabinets /></MainLayout></AuthGuard>} />
          <Route path="/assets" element={<AuthGuard><MainLayout><Assets /></MainLayout></AuthGuard>} />
          <Route path="/users" element={<AuthGuard><MainLayout><Users /></MainLayout></AuthGuard>} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { User, Lock } from 'lucide-react';
import api from '../api';

export default function Login() {
  const onFinish = async (values) => {
    try {
      const res = await api.post('/login', values);
      
      if (res.data.success) {
        // 🌟 核心拦截机制：检查后端返回的角色信息
        if (res.data.user.role !== 'admin') {
          message.error('⛔ 权限不足：Web 看板仅限管理员登录！普通员工请使用 App。');
          return; // 拦截下来，绝对不保存 Token，也不跳转
        }

        // 只有 admin 才会走到这里
        localStorage.setItem('quickman_token', res.data.token);
        localStorage.setItem('quickman_username', res.data.user.username); // 顺便存个名字
        message.success('Quickman, 欢迎回来指挥中心！');
        window.location.href = '/';
      }
    } catch (err) {
      // 显示后端返回的具体错误（比如密码错误、账号不存在）
      message.error(err.response?.data?.error || '账号或密码错误');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
      <Card title="Quickman Dashboard" style={{ width: 400, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: 24, color: '#666' }}>管理员登录中心</div>
        <Form onFinish={onFinish}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<User size={16} />} placeholder="管理员账号 (Admin)" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<Lock size={16} />} placeholder="密码" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">进入指挥中心</Button>
        </Form>
      </Card>
    </div>
  );
}
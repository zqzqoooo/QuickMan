import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function Users() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setData(res.data.data);
    } catch (e) {
      message.error("获取用户数据失败");
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({ ...record, password: '' }); // 编辑时不显示老密码
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '危险操作',
      content: '删除后该账号将无法再登录系统，确认删除？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await api.delete(`/users/${id}`);
          if (res.data.success) {
            message.success("删除成功");
            fetchUsers();
          }
        } catch (e) {
          message.error(e.response?.data?.error || "删除失败");
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/users/${editingId}`, values);
        message.success("修改成功！");
      } else {
        await api.post('/users', values);
        message.success("新增成功！");
      }
      setIsModalVisible(false);
      fetchUsers();
    } catch (e) {
      if (e.errorFields) {
        return;
      }
      if (e.response?.data?.error) {
        message.error(e.response.data.error);
      }
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: t('username'), dataIndex: 'username', key: 'username' },
    { 
      title: t('role'), 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'purple' : 'blue'}>
          {role === 'admin' ? 'Super Admin' : 'Staff'}
        </Tag>
      )
    },
    { title: t('time'), dataIndex: 'created_at', render: (t) => new Date(t).toLocaleString() },
    { 
      title: t('action'), 
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" icon={<Edit2 size={14} />} onClick={() => handleEdit(record)}>{t('edit')}</Button>
          <Button type="link" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record.id)}>{t('delete')}</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>{t('users')}</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>{t('add')}</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />

      {/* 🌟 用户管理弹窗 */}
      <Modal 
        title={editingId ? `✏️ ${t('edit')}账号` : `➕ ${t('add')}账号`} 
        open={isModalVisible} 
        onOk={handleModalOk} 
        onCancel={() => { form.resetFields(); setIsModalVisible(false); }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="username" label={t('username')} rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="输入登录账号" disabled={!!editingId} />
          </Form.Item>
          
          <Form.Item 
            name="password" 
            label="密码" 
            rules={[{ required: !editingId, message: '请设置登录密码' }]}
            extra={editingId ? "如果不修改密码，请留空" : ""}
          >
            <Input.Password placeholder="输入密码" />
          </Form.Item>

          <Form.Item name="role" label={t('role')} rules={[{ required: true }]} initialValue="staff">
            <Select>
              <Select.Option value="admin">管理员 (Admin)</Select.Option>
              <Select.Option value="staff">普通员工 (Staff)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
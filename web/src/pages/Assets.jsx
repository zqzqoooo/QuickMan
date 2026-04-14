import React, { useState, useEffect } from 'react';
import { List, Card, Button, Tag, message, Modal, Form, Input, Select, Space } from 'antd';
import { Plus, Info, Edit2, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import AssetDetailModal from '../components/AssetDetailModal';

const IMG_BASE = 'https://api.heshanws.top';

export default function Assets() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets');
      setAssets(res.data.data || []);
    } catch (e) { message.error(t('getAssetFailed')); }
    setLoading(false);
  };

  const fetchCabinets = async () => {
    try {
      const res = await api.get('/cabinets');
      setCabinets(res.data.data || []);
    } catch (e) {}
  };

  useEffect(() => { 
    fetchAssets(); 
    fetchCabinets();
  }, []);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchText || 
      asset.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      asset.code?.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'inStock' && asset.item_status === 0) ||
      (statusFilter === 'borrowed' && asset.item_status === 1);
    return matchesSearch && matchesStatus;
  });

  const showAssetDetail = (asset) => {
    setCurrentAsset(asset);
    setAssetModalOpen(true);
  };

  const handleStatusChange = async (asset, newStatus) => {
    try {
      const action = newStatus === 0 ? 'IN' : 'OUT';
      await api.post('/transactions', {
        asset_id: asset.id,
        action_type: action,
        operator_id: 1,
        remarks: newStatus === 0 ? t('returned') : t('borrowed')
      });
      message.success(newStatus === 0 ? t('returnSuccess') : t('borrowSuccess'));
      fetchAssets();
    } catch (e) {
      message.error(t('statusChangeFailed'));
    }
  };

  const handleAssetStatusChange = () => {
    fetchAssets();
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (asset) => {
    setEditingId(asset.id);
    form.setFieldsValue(asset);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: t('dangerOperation'),
      content: t('confirmDeleteAsset'),
      okText: t('confirmDelete'),
      okType: 'danger',
      cancelText: t('cancel'),
      onOk: async () => {
        try {
          await api.delete(`/assets/${id}`);
          message.success(t('deleteSuccess'));
          fetchAssets();
        } catch (e) { message.error(t('deleteFailed')); }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/assets/${editingId}`, values);
        message.success(t('editSuccess'));
      } else {
        await api.post('/assets', values);
        message.success(t('addSuccess'));
      }
      setIsModalVisible(false);
      fetchAssets();
    } catch (e) {}
  };

  const getImageUrl = (uri) => {
    if (!uri) return null;
    return uri.startsWith('http') ? uri : `${IMG_BASE}${uri}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{t('assets')}</h2>
        <Space wrap>
          <Input 
            placeholder={t('search')} 
            prefix={<Search size={16} />} 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select 
            value={statusFilter} 
            onChange={setStatusFilter}
            style={{ width: 150 }}
          >
            <Select.Option value="all">{t('all')}</Select.Option>
            <Select.Option value="inStock">{t('inStock')}</Select.Option>
            <Select.Option value="borrowed">{t('borrowed')}</Select.Option>
          </Select>
          <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>{t('add')}</Button>
        </Space>
      </div>

      <List
        grid={{ gutter: 16, column: 4 }}
        dataSource={filteredAssets}
        loading={loading}
        locale={{ emptyText: searchText || statusFilter !== 'all' ? t('noResults') : t('noData') }}
        renderItem={item => (
          <List.Item>
            <Card 
              hoverable
              style={{ minWidth: 280 }}
              actions={[
                <Button type="text" icon={<Info size={16} />} onClick={() => showAssetDetail(item)} />,
                <Button type="text" icon={<Edit2 size={16} />} onClick={() => handleEdit(item)} />,
                <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDelete(item.id)} />
              ]}
              cover={
                <div style={{ height: 180, backgroundColor: '#f0f2f5', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                  {item.photo_uri ? (
                    <img src={getImageUrl(item.photo_uri)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : <span style={{ color: '#999' }}>{t('noImage')}</span>}
                </div>
              }
            >
              <Card.Meta 
                title={item.name} 
                description={
                  <div style={{ paddingBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, wordBreak: 'break-all' }}>{t('code')}: {item.code}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#888', wordBreak: 'break-all' }}>{item.cabinet_name || item.cabinet_id || '-'}</p>
                    <Space style={{ marginTop: 8, flexWrap: 'wrap' }}>
                      <Tag color={item.item_status === 0 ? 'success' : 'error'}>
                        {item.item_status === 0 ? t('inStock') : t('borrowed')}
                      </Tag>
                      <Button 
                        size="small" 
                        icon={<ArrowUpDown size={12} />}
                        onClick={() => handleStatusChange(item, item.item_status === 0 ? 1 : 0)}
                      >
                        {item.item_status === 0 ? t('borrow') : t('return')}
                      </Button>
                    </Space>
                  </div>
                } 
              />
            </Card>
          </List.Item>
        )}
      />

      <Modal title={editingId ? `✏️ ${t('edit')}` : `➕ ${t('add')}`} open={isModalVisible} onOk={handleModalOk} onCancel={() => setIsModalVisible(false)} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="code" label={t('code')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label={t('name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label={t('category')}><Input /></Form.Item>
          <Form.Item name="cabinet_id" label={t('belongCabinet')} rules={[{ required: true }]}>
            <Select>
              {cabinets.map(cab => <Select.Option key={cab.id} value={cab.id}>{cab.name}</Select.Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <AssetDetailModal
        asset={currentAsset}
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onStatusChange={handleAssetStatusChange}
      />
    </div>
  );
}

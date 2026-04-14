import React, { useState, useEffect } from 'react';
import { Collapse, Button, Space, Tag, Modal, Form, Input, Row, Col, message, Card, Descriptions } from 'antd';
import { Plus, Edit2, Trash2, MapPin, Box, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import AssetDetailModal from '../components/AssetDetailModal';

const { Panel } = Collapse;

export default function Cabinets() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cabinetAssets, setCabinetAssets] = useState({});
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [activeKey, setActiveKey] = useState(null);

  const fetchCabinets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cabinets');
      setData(res.data.data);
    } catch (e) {
      message.error(t('getDataFailed'));
    }
    setLoading(false);
  };

  const fetchCabinetAssets = async (cabinetId) => {
    if (cabinetAssets[cabinetId]) return;
    try {
      const res = await api.get(`/cabinets/${cabinetId}/assets`);
      if (res.data.success) {
        setCabinetAssets(prev => ({ ...prev, [cabinetId]: res.data.data }));
      }
    } catch (e) {}
  };

  useEffect(() => { fetchCabinets(); }, []);

  useEffect(() => {
    if (activeKey) {
      fetchCabinetAssets(activeKey);
    }
  }, [activeKey]);

  const handleAssetStatusChange = () => {
    if (activeKey) {
      setCabinetAssets(prev => ({ ...prev, [activeKey]: null }));
      fetchCabinetAssets(activeKey);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/cabinets/${editingId}`, values);
        message.success(t('editSuccess'));
      } else {
        await api.post('/cabinets', values);
        message.success(t('addSuccess'));
      }
      setIsModalVisible(false);
      fetchCabinets();
    } catch (e) {}
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: t('dangerOperation'),
      content: t('confirmDeleteCabinet'),
      okText: t('confirmDelete'),
      okType: 'danger',
      cancelText: t('cancel'),
      onOk: async () => {
        try {
          await api.delete(`/cabinets/${id}`);
          message.success(t('deleteSuccess'));
          fetchCabinets();
        } catch (e) { message.error(t('deleteFailed')); }
      }
    });
  };

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
    setAssetModalOpen(true);
  };

  const renderPanelHeader = (record) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
      <Space wrap>
        <span><strong>{record.name}</strong></span>
        <Tag icon={<MapPin size={12}/>} color="blue">{record.code}</Tag>
        {record.gps_lat && record.gps_lng && (
          <Tag color="geekblue">{record.gps_lat}, {record.gps_lng}</Tag>
        )}
      </Space>
      <Space onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <Button type="text" icon={<Edit2 size={14} />} onClick={() => handleEdit(record)} />
        <Button type="text" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record.id)} />
      </Space>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{t('cabinets')}</h2>
        <Button type="primary" icon={<Plus size={16} />} onClick={handleAdd}>{t('add')}</Button>
      </div>

      <Collapse 
        activeKey={activeKey}
        onChange={(key) => {
          setActiveKey(key || null);
        }}
        loading={loading}
        expandIcon={({ isActive }) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
            <ChevronDown size={16} style={{ transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
          </div>
        )}
      >
        {data.map(cabinet => (
          <Panel 
            key={cabinet.id} 
            header={renderPanelHeader(cabinet)}
          >
            <Row gutter={16}>
              <Col xs={24} lg={8}>
                <Card size="small" title={t('locationInfo')} style={{ marginBottom: 16 }}>
                  {cabinet.gps_lat && cabinet.gps_lng ? (
                    <>
                      <iframe
                        title="location"
                        width="100%"
                        height="180"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${cabinet.gps_lng - 0.005},${cabinet.gps_lat - 0.005},${cabinet.gps_lng + 0.005},${cabinet.gps_lat + 0.005}&layer=mapnik&marker=${cabinet.gps_lat},${cabinet.gps_lng}`}
                        style={{ borderRadius: 8 }}
                      />
                      <p style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 0 }}>
                        <MapPin size={12} style={{ marginRight: 4, flexShrink: 0 }} />
                        {t('gpsLng')}: {cabinet.gps_lng}, {t('gpsLat')}: {cabinet.gps_lat}
                      </p>
                    </>
                  ) : (
                    <p style={{ color: '#999', margin: 0 }}>{t('noLocationInfo')}</p>
                  )}
                </Card>
                <Card size="small" title={t('cabinetDetail')}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={t('code')}>{cabinet.code}</Descriptions.Item>
                    <Descriptions.Item label={t('name')}>{cabinet.name}</Descriptions.Item>
                    {cabinet.gps_lat && cabinet.gps_lng && (
                      <Descriptions.Item label={t('locationInfo')}>{cabinet.gps_lat}, {cabinet.gps_lng}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} lg={16}>
                <Card size="small" title={<><Box size={16} style={{ marginRight: 8 }} />{t('cabinetList')} ({cabinetAssets[cabinet.id]?.length || 0})</>}>
                  <div style={{ overflowY: 'auto' }}>
                    {(cabinetAssets[cabinet.id] || []).map(asset => (
                      <Card 
                        key={asset.id} 
                        size="small" 
                        style={{ marginBottom: 4 }}
                        bodyStyle={{ padding: '8px 12px' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <Space onClick={() => handleAssetClick(asset)} style={{ cursor: 'pointer', flex: 1, minWidth: 0 }}>
                            <span style={{ fontWeight: 500 }}>{asset.name}</span>
                            <Tag>{asset.code}</Tag>
                            <Tag color={asset.item_status === 0 ? 'green' : 'red'}>
                              {asset.item_status === 0 ? t('inStock') : t('borrowed')}
                            </Tag>
                          </Space>
                          <Button 
                            type="text" 
                            icon={<Edit2 size={14} />} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAsset(asset);
                              setAssetModalOpen(true);
                            }}
                          />
                        </div>
                      </Card>
                    ))}
                    {cabinetAssets[cabinet.id]?.length === 0 && (
                      <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>{t('noData')}</p>
                    )}
                  </div>
                </Card>
              </Col>
            </Row>
          </Panel>
        ))}
      </Collapse>

      <Modal title={editingId ? t('edit') : t('add')} open={isModalVisible} onOk={handleModalOk} onCancel={() => setIsModalVisible(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="code" label={t('code')} rules={[{required: true}]}><Input /></Form.Item>
          <Form.Item name="name" label={t('name')} rules={[{required: true}]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="gps_lat" label={t('latitude')}><Input type="number" step="0.000001"/></Form.Item></Col>
            <Col span={12}><Form.Item name="gps_lng" label={t('longitude')}><Input type="number" step="0.000001"/></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <AssetDetailModal
        asset={selectedAsset}
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onStatusChange={handleAssetStatusChange}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Image, Row, Col, Button, message } from 'antd';
import { ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const IMG_BASE = 'https://api.heshanws.top';

export default function AssetDetailModal({ asset, open, onClose, onStatusChange }) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (asset?.id && open) {
      setLoading(true);
      api.get(`/transactions?asset_id=${asset.id}`)
        .then(res => {
          const data = res.data.data || res.data || [];
          setTransactions([...data].sort((a, b) => new Date(b.action_time) - new Date(a.action_time)));
        })
        .catch(() => setTransactions([]))
        .finally(() => setLoading(false));
    }
  }, [asset?.id, open]);

  const handleStatusChange = async () => {
    if (!asset) return;
    try {
      const newStatus = asset.item_status === 0 ? 1 : 0;
      const action = newStatus === 0 ? 'IN' : 'OUT';
      await api.post('/transactions', {
        asset_id: asset.id,
        action_type: action,
        operator_id: 1,
        remarks: newStatus === 0 ? t('returned') : t('borrowed')
      });
      message.success(newStatus === 0 ? t('returnSuccess') : t('borrowSuccess'));
      if (onStatusChange) onStatusChange();
      onClose();
    } catch (e) {
      message.error(t('statusChangeFailed'));
    }
  };

  const getImageUrl = (uri) => {
    if (!uri) return null;
    return uri.startsWith('http') ? uri : `${IMG_BASE}${uri}`;
  };

  if (!asset) return null;

  return (
    <Modal
      title={asset.name}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      {asset.photo_uri && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Image 
            src={getImageUrl(asset.photo_uri)} 
            style={{ maxHeight: 200, borderRadius: 8, objectFit: 'cover' }} 
          />
        </div>
      )}
      
      <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <p style={{ margin: 0 }}><strong>{t('code')}:</strong> {asset.code}</p>
        </Col>
        <Col span={12}>
          <p style={{ margin: 0 }}><strong>{t('category')}:</strong> {asset.category || '-'}</p>
        </Col>
        <Col span={12}>
          <p style={{ margin: 0 }}><strong>{t('belongCabinet')}:</strong> {asset.cabinet_name || asset.cabinet_id || '-'}</p>
        </Col>
        <Col span={12}>
          <p style={{ margin: 0 }}>
            <strong>{t('status')}:</strong> {' '}
            <Tag color={asset.item_status === 0 ? 'green' : 'red'}>
              {asset.item_status === 0 ? t('inStock') : t('borrowed')}
            </Tag>
          </p>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Button 
          type={asset.item_status === 0 ? 'primary' : 'default'}
          icon={<ArrowUpDown size={14} />}
          onClick={handleStatusChange}
          style={{ width: '100%' }}
        >
          {asset.item_status === 0 ? t('borrow') : t('return')}
        </Button>
      </div>

      <h4 style={{ marginBottom: 12 }}>{t('transactionHistory')}</h4>
      <Table 
        dataSource={transactions} 
        columns={[
          { 
            title: t('actionType'), 
            dataIndex: 'action_type', 
            width: 80,
            render: (val) => val === 'OUT' 
              ? <Tag color="red">{t('out')}</Tag> 
              : <Tag color="green">{t('in')}</Tag> 
          },
          { title: t('operator'), dataIndex: 'operator_id', width: 80 },
          { title: t('time'), dataIndex: 'action_time', width: 140, render: (time) => time ? new Date(time).toLocaleString() : '-' },
          { title: t('remarks'), dataIndex: 'remarks', ellipsis: true }
        ]} 
        rowKey="id" 
        pagination={{ pageSize: 5 }} 
        size="small"
        loading={loading}
        scroll={{ x: true }}
      />
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag } from 'antd';
import { Package, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

const Dashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState({ assets: [], stats: {}, transactions: [] });
  const [transactionLoading, setTransactionLoading] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/sync/pull');
      if (res.data.success) {
        const allAssets = res.data.data.assets.filter(a => !a.is_deleted);
        const inStock = allAssets.filter(a => a.item_status === 0).length;
        const total = allAssets.length;
        const inStockRate = total > 0 ? ((inStock / total) * 100).toFixed(1) : 0;

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const overdueAssets = allAssets.filter(a => 
          a.item_status === 1 && a.updated_at < sevenDaysAgo
        );

        setData(prev => ({ ...prev, assets: allAssets, overdue: overdueAssets, stats: { total, inStock, inStockRate } }));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  const loadTransactions = async () => {
    setTransactionLoading(true);
    try {
      const [txRes, assetRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/assets')
      ]);
      const txData = txRes.data.data || txRes.data || [];
      const assets = assetRes.data.data || assetRes.data || [];
      const assetMap = {};
      assets.forEach(a => { assetMap[a.id] = a; });
      
      const enriched = txData.map(tx => ({
        ...tx,
        asset_name: assetMap[tx.asset_id]?.name || tx.asset_id,
        asset_code: assetMap[tx.asset_id]?.code || '-'
      }));
      
      const sorted = [...enriched].sort((a, b) => new Date(b.action_time) - new Date(a.action_time));
      setData(prev => ({ ...prev, transactions: sorted.slice(0, 10) }));
    } catch (e) {
      console.error('Failed to load transactions', e);
    }
    setTransactionLoading(false);
  };

  useEffect(() => { 
    loadData(); 
    loadTransactions();
  }, []);

  const transactionColumns = [
    { title: t('name'), dataIndex: 'asset_name', key: 'asset_name', width: 150, ellipsis: true },
    { title: t('code'), dataIndex: 'asset_code', key: 'asset_code', width: 100, ellipsis: true },
    { 
      title: t('actionType'), 
      dataIndex: 'action_type', 
      key: 'action_type',
      width: 80,
      render: (val) => val === 'OUT' 
        ? <Tag color="red">{t('out')}</Tag> 
        : <Tag color="green">{t('in')}</Tag> 
    },
    { title: t('operator'), dataIndex: 'operator_id', key: 'operator_id', width: 80 },
    { title: t('time'), dataIndex: 'action_time', key: 'action_time', width: 150, render: (time) => time ? new Date(time).toLocaleString() : '-' },
  ];

  const overdueColumns = [
    { title: t('name'), dataIndex: 'name', key: 'name', width: 150, ellipsis: true },
    { title: t('code'), dataIndex: 'code', key: 'code', width: 100, ellipsis: true },
    { title: t('borrower'), dataIndex: 'operator_id', key: 'operator_id', width: 80 },
    { title: t('borrowTime'), dataIndex: 'updated_at', key: 'updated_at', width: 150, render: (time) => time ? new Date(time).toLocaleString() : '-' },
    { title: t('status'), key: 'status', width: 100, render: () => <Tag color="error">{t('severeOverdue')}</Tag> }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable>
            <Statistic title={t('totalAssets')} value={data.stats.total || 0} prefix={<Package size={20} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable>
            <Statistic title={t('currentInStock')} value={data.stats.inStock || 0} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable>
            <Statistic title={t('inStockRate')} value={data.stats.inStockRate || 0} suffix="%" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} hoverable>
            <Statistic title={t('overdue')} value={data.overdue?.length || 0} valueStyle={{ color: '#cf1322' }} prefix={<AlertCircle size={20} />} />
          </Card>
        </Col>
      </Row>

      <Card title={t('attention')} style={{ marginTop: 24 }}>
        <Table 
          dataSource={data.overdue} 
          columns={overdueColumns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 580 }}
        />
      </Card>

      <Card title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} />{t('recentTransactions')}</span>} style={{ marginTop: 24 }}>
        <Table 
          dataSource={data.transactions} 
          columns={transactionColumns}
          rowKey="id"
          loading={transactionLoading}
          pagination={false}
          scroll={{ x: 580 }}
          locale={{ emptyText: t('noData') }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;

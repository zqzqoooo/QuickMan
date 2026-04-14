import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Card } from 'antd';
import { MapPin, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import AssetDetailModal from './AssetDetailModal';

export default function CabinetDetailModal({ cabinet, open, onClose }) {
  const { t } = useTranslation();
  const [innerAssets, setInnerAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  useEffect(() => {
    if (cabinet?.id && open) {
      api.get(`/cabinets/${cabinet.id}/assets`)
        .then(res => {
          if (res.data.success) setInnerAssets(res.data.data);
        })
        .catch(() => setInnerAssets([]));
    }
  }, [cabinet?.id, open]);

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
    setAssetModalOpen(true);
  };

  if (!cabinet) return null;

  return (
    <>
      <Modal
        title={cabinet.name}
        open={open}
        onCancel={onClose}
        footer={null}
        width={600}
        centered
      >
        <Card 
          size="small" 
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} /> {t('locationInfo')}
            </span>
          }
          style={{ marginBottom: 16 }}
        >
          {cabinet.gps_lat && cabinet.gps_lng ? (
            <>
              <iframe
                title="location"
                width="100%"
                height="200"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${cabinet.gps_lng - 0.005},${cabinet.gps_lat - 0.005},${cabinet.gps_lng + 0.005},${cabinet.gps_lat + 0.005}&layer=mapnik&marker=${cabinet.gps_lat},${cabinet.gps_lng}`}
                style={{ borderRadius: 8 }}
              />
              <p style={{ fontSize: 12, color: '#666', marginTop: 8, marginBottom: 0 }}>
                <MapPin size={12} style={{ marginRight: 4 }} />
                {t('gpsLng')}: {cabinet.gps_lng}, {t('gpsLat')}: {cabinet.gps_lat}
              </p>
            </>
          ) : (
            <p style={{ color: '#999', margin: 0 }}>{t('noLocationInfo')}</p>
          )}
        </Card>

        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
          <Box size={18} /> {t('cabinetList')} ({innerAssets.length})
        </h3>
        <Table 
          size="small"
          dataSource={innerAssets}
          columns={[
            { 
              title: t('name'), 
              dataIndex: 'name', 
              render: (text, record) => <a onClick={() => handleAssetClick(record)}>{text}</a> 
            },
            { title: t('code'), dataIndex: 'code' },
            { 
              title: t('status'), 
              dataIndex: 'item_status', 
              render: s => s === 0 
                ? <Tag color="green">{t('inStock')}</Tag> 
                : <Tag color="red">{t('borrowed')}</Tag>
            }
          ]}
          rowKey="id"
          pagination={false}
          onRow={(record) => ({ onClick: () => handleAssetClick(record) })}
        />
      </Modal>

      <AssetDetailModal 
        asset={selectedAsset} 
        open={assetModalOpen} 
        onClose={() => setAssetModalOpen(false)} 
      />
    </>
  );
}

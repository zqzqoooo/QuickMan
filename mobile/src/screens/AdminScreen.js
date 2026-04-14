import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, FlatList, TextInput,
  TouchableOpacity, Alert, Modal, Image, ActivityIndicator, ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteService } from '../services/SQLiteService';
import { LocationService } from '../services/LocationService';
import { ImageService } from '../services/ImageService';
import { PrinterService } from '../services/PrinterService';
import QRScanner from '../components/QRScanner';

const STATUS_TEXT = { 0: 'In Stock', 1: 'Checked Out' };
const STATUS_COLOR = { 0: '#4CAF50', 1: '#F44336' };

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState('cabinets');
  const [cabinets, setCabinets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailType, setDetailType] = useState(null);
  const [cabinetAssetList, setCabinetAssetList] = useState([]);
  const [transactionList, setTransactionList] = useState([]);
  const [formData, setFormData] = useState({});
  const [formPhoto, setFormPhoto] = useState(null);
  const [formCabinetId, setFormCabinetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  const loadData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const [cabs, asts] = await Promise.all([
        SQLiteService.getCabinets(),
        SQLiteService.getAssets()
      ]);
      setCabinets(cabs);
      setAssets(asts);
      const t = await AsyncStorage.getItem('@last_sync_time');
      if (t) setLastSyncTime(Number(t));
    } catch (e) {
      console.error('Load failed', e);
    } finally {
      if (showIndicator) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(true); }, [loadData]);

  useEffect(() => {
    const initPrinter = async () => {
      try {
        await PrinterService.init();
        const lastPrinter = await AsyncStorage.getItem('last_printer');
        if (lastPrinter) {
          await PrinterService.connect(lastPrinter);
          setPrinterConnected(true);
          setPrinterName(lastPrinter);
        }
      } catch (e) {
        setPrinterConnected(false);
        setPrinterName('');
      }
    };
    initPrinter();
  }, []);

  // ---------- Gen ID ----------
  const generateCode = (type) => {
    if (type === 'asset') {
      const codes = assets.map(a => {
        const m = a.code.match(/^DEV-(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      });
      const max = codes.length ? Math.max(...codes) : 1000;
      return `DEV-${max + 1}`;
    } else {
      const codes = cabinets.map(c => {
        const m = c.code.match(/^LOC_(\d+)$/);
        return m ? parseInt(m[1]) : 0;
      });
      const max = codes.length ? Math.max(...codes) : 0;
      return `LOC_${String(max + 1).padStart(3, '0')}`;
    }
  };

  const getSyncText = () => {
    if (!lastSyncTime) return 'Never Synced';
    const diff = Math.floor((Date.now() - lastSyncTime) / 60000);
    if (diff < 1) return 'Just Synced';
    if (diff < 60) return `${diff} mins ago`;
    return `${Math.floor(diff / 60)} hrs ago`;
  };

  const handleSync = async () => {
    const { SyncService } = require('../services/SyncService');
    setIsSyncing(true);
    try {
      const res = await SyncService.runSync();
      if (res.success) {
        const t = await AsyncStorage.getItem('@last_sync_time');
        setLastSyncTime(t ? Number(t) : Date.now());
        await loadData(false);
      }
    } catch (e) {
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------- Scan ----------
  const handleScanResult = async (code) => {
    setScannerVisible(false);
    const trimmed = code.trim();
    if (trimmed.startsWith('DEV-')) {
      const asset = assets.find(a => a.code === trimmed);
      if (asset) {
        setDetailData(asset);
        setDetailType('asset');
        setCabinetAssetList([]);
        setDetailModalVisible(true);
      } else {
        Alert.alert('Not found', `No asset found with ID ${trimmed} `);
      }
    } else {
      const cab = cabinets.find(c => c.code === trimmed);
      if (cab) {
        setDetailData(cab);
        setDetailType('cabinet');
        const asts = await SQLiteService.getAssetsByCabinet(cab.id);
        setCabinetAssetList(asts);
        setDetailModalVisible(true);
      } else {
        Alert.alert('Not found', `Unrecognized code，请Confirm是否为有效(DEV-xxx)或Cabinet ID`);
      }
    }
  };

  // ---------- Open detail ----------
  const openDetail = async (item, type) => {
    setDetailData(item);
    setDetailType(type);
    setCabinetAssetList([]);
    setTransactionList([]);
    if (type === 'cabinet') {
      const asts = await SQLiteService.getAssetsByCabinet(item.id);
      setCabinetAssetList(asts);
    } else {
      const txs = await SQLiteService.getTransactionsByAssetId(item.id);
      setTransactionList(txs);
    }
    setDetailModalVisible(true);
  };

  // ---------- Open nested（Tap asset） ----------
  const openNestedDetail = async (item) => {
    setDetailData(item);
    setDetailType('asset');
    setCabinetAssetList([]);
    const txs = await SQLiteService.getTransactionsByAssetId(item.id);
    setTransactionList(txs);
    setDetailModalVisible(true);
  };

  // ---------- Open edit ----------
  const openEdit = (item, type) => {
    setDetailModalVisible(false);
    setFormData({ ...item });
    setFormPhoto(item.photo_uri || null);
    setFormCabinetId(item.cabinet_id || '');
    setDetailType(type);
    setEditModalVisible(true);
  };

  // ---------- Open add ----------
  const openAdd = (type) => {
    const newCode = generateCode(type);
    setFormData({ code: newCode, name: '' });
    setFormPhoto(null);
    setFormCabinetId('');
    setDetailType(type);
    setAddModalVisible(true);
  };

  // ---------- Save edit ----------
  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      if (detailType === 'cabinet') {
        await SQLiteService.updateCabinet(formData.id, {
          code: formData.code,
          name: formData.name,
          gps_lat: formData.gps_lat,
          gps_lng: formData.gps_lng,
          label_status: 2,
        });
      } else {
        await SQLiteService.updateAsset(formData.id, {
          code: formData.code,
          name: formData.name,
          category: formData.category,
          cabinet_id: formCabinetId || null,
          photo_uri: formPhoto || null,
          item_status: Number(formData.item_status) || 0,
          label_status: 2,
        });
      }
      setEditModalVisible(false);
      loadData(false);
    } catch (e) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- GPS Loc ----------
  const handleGpsLocation = async () => {
    try {
      Alert.alert('Tip', 'Getting high-precision location, please wait...');
      const coords = await LocationService.getCurrentPosition();
      setFormData({
        ...formData,
        gps_lat: coords.latitude,
        gps_lng: coords.longitude
      });
      Alert.alert('Success', 'Location updated');
    } catch (e) {
      Alert.alert('Loc failed', e.message);
    }
  };

  // ---------- Save add ----------
  const handleAdd = async () => {
    if (!formData.code || !formData.name) {
      return Alert.alert('Tip', 'ID and Name cannot be empty');
    }
    setSaving(true);
    try {
      if (detailType === 'cabinet') {
        const id = await SQLiteService.addCabinet(formData.code, formData.name);
        if (formData.gps_lat && formData.gps_lng) {
          await SQLiteService.updateCabinet(id, { gps_lat: formData.gps_lat, gps_lng: formData.gps_lng });
        }
      } else {
        await SQLiteService.addAsset(formData.code, formData.name, formData.category || 'Uncategorized', formCabinetId || null, formPhoto);
      }
      setAddModalVisible(false);
      loadData(false);
    } catch (e) {
      Alert.alert('Add failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (item, type) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${item.name} ?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'cabinet') {
                await SQLiteService.deleteCabinet(item.id);
              } else {
                await SQLiteService.deleteAsset(item.id);
              }
              setDetailModalVisible(false);
              loadData(false);
            } catch (e) {
              Alert.alert('Delete失败', e.message);
            }
          }
        }
      ]
    );
  };

  // ---------- Toggle status ----------
  const handleToggleStatus = async (item) => {
    const newStatus = item.item_status === 0 ? 1 : 0;
    const remarks = newStatus === 1 ? 'Admin manualChecked Out' : 'Admin manual return';
    const operator = await AsyncStorage.getItem('quickman_username') || 'admin';
    await SQLiteService.updateAsset(item.id, { item_status: newStatus });
    await SQLiteService.recordTransaction(item.id, newStatus === 1 ? 'OUT' : 'IN', operator, remarks);
    loadData(false);
    const updated = assets.find(a => a.id === item.id);
    if (updated) {
      const txs = await SQLiteService.getTransactionsByAssetId(item.id);
      setTransactionList(txs);
      setDetailData({ ...updated, item_status: newStatus });
    } else {
      setDetailModalVisible(false);
    }
  };

  // ---------- Print label ----------
  const handlePrintLabel = async () => {
    if (!detailData) return;
    try {
      const connected = await AsyncStorage.getItem('last_printer');
      if (!connected) {
        Alert.alert('Tip', 'Please connect printer in Settings first');
        return;
      }
      const isCabinet = detailType === 'cabinet';
      
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateTimeStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
      
      const elements = isCabinet ? [
        { type: 'qrcode', x: 2, y: 2, size: 16, text: String(detailData.code || '') },
        { type: 'text', x: 20, y: 2, width: 19, height: 6, text: `${detailData.name || ''}`, fontSize: 3.5 },
        { type: 'text', x: 20, y: 8, width: 19, height: 5, text: `ID: ${detailData.code || ''}`, fontSize: 2.5 },
        { type: 'text', x: 20, y: 13, width: 19, height: 5, text: `${dateTimeStr}`, fontSize: 2.5 }
      ] : [
        { type: 'qrcode', x: 2, y: 2, size: 16, text: String(detailData.code || '') },
        { type: 'text', x: 20, y: 2, width: 19, height: 6, text: `${detailData.name || ''}`, fontSize: 3.5 },
        { type: 'text', x: 20, y: 8, width: 19, height: 5, text: `ID: ${detailData.code || ''}`, fontSize: 2.5 },
        { type: 'text', x: 20, y: 13, width: 19, height: 5, text: `${dateTimeStr}`, fontSize: 2.5 }
      ];
      
      // 不论打印指令Success与否，Pre-update
      try {
        if (detailType === 'cabinet') {
          await SQLiteService.updateCabinet(detailData.id, { label_status: 1 });
        } else {
          await SQLiteService.updateAsset(detailData.id, { label_status: 1 });
        }
        setDetailData(prev => ({ ...(prev || {}), label_status: 1 }));
        loadData(false);
      } catch (dbErr) {
        console.error('DB fail', dbErr);
      }

      await PrinterService.printTemplate({ width: 40, height: 20 }, elements, 1);
      
      Alert.alert('Success', 'Print command sent');
    } catch (e) {
      console.error('HandlePrintLabel Error:', e);
      Alert.alert('Tip', 'Status updated, but printer error occurred: ' + (e?.message || 'Unknown err'));
    }
  };

  // ---------- Photo ----------
  const handleTakePhoto = async () => {
    const res = await ImageService.takePhoto();
    if (res.success) setFormPhoto(res.uri);
  };

  // ---------- Render asset ----------
  const renderAssetCard = (item, compact = false) => {
    const img = item.photo_uri || item.remote_photo_uri;
    const needsAttention = item.label_status === 0 || item.label_status === 2 || item.sync_status > 0;
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.assetCard, compact && styles.assetCardCompact, needsAttention && !compact && styles.assetCardAttention]}
        onPress={() => openNestedDetail(item)}
      >
        {img ? (
          <Image source={{ uri: img }} style={compact ? styles.assetImgSmall : styles.assetImg} />
        ) : (
          <View style={[styles.assetImgPlaceholder, compact && styles.assetImgSmall]}><Text style={{ fontSize: compact ? 16 : 22 }}>📦</Text></View>
        )}
        <View style={styles.assetInfo}>
          <Text style={styles.assetName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.assetSub}>ID: {item.code}</Text>
          {needsAttention && (
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
              {item.label_status === 0 && <Text style={{ color: '#F44336', fontSize: 10 }}>📋Not Printed</Text>}
              {item.label_status === 2 && <Text style={{ color: '#FF9800', fontSize: 10 }}>📋Pending Update</Text>}
              {item.sync_status > 0 && <Text style={{ color: '#9C27B0', fontSize: 10 }}>☁️Pending Sync</Text>}
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.item_status] }]}>
          <Text style={styles.statusText}>{STATUS_TEXT[item.item_status]}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- Render cabinet ----------
  const renderCabinetCard = (item) => {
    const needsAttention = item.label_status === 0 || item.label_status === 2 || item.sync_status > 0;
    return (
      <TouchableOpacity key={item.id} style={[styles.cabinetCard, needsAttention && styles.cabinetCardAttention]} onPress={() => openDetail(item, 'cabinet')}>
        <View style={styles.cabinetLeft}>
          <Text style={{ fontSize: 28 }}>🗄️</Text>
          <View style={styles.cabinetInfo}>
            <Text style={styles.cabinetName}>{item.name}</Text>
            <Text style={styles.cabinetCode}>ID:  {item.code}</Text>
          </View>
        </View>
        <View style={styles.cabinetRight}>
          {needsAttention && (
            <View style={styles.alertBadges}>
              {item.label_status === 0 && <View style={[styles.alertDot, { backgroundColor: '#F44336' }]}><Text style={styles.alertDotText}>📋</Text></View>}
              {item.label_status === 2 && <View style={[styles.alertDot, { backgroundColor: '#FF9800' }]}><Text style={styles.alertDotText}>📋</Text></View>}
              {item.sync_status > 0 && <View style={[styles.alertDot, { backgroundColor: '#9C27B0' }]}><Text style={styles.alertDotText}>☁️</Text></View>}
            </View>
          )}
          <View style={[styles.syncBadge, { backgroundColor: item.sync_status > 0 ? '#FF9800' : '#4CAF50' }]}>
            <Text style={styles.syncText}>{item.sync_status > 0 ? 'Pending Sync' : 'Synced'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ---------- Render details ----------
  const renderDetailModal = () => {
    if (!detailData) return null;
    const isCabinet = detailType === 'cabinet';

    return (
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 36 }}>{isCabinet ? '🗄️' : '📦'}</Text>
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={styles.modalTitle}>{detailData.name}</Text>
                <Text style={styles.modalSub}>{isCabinet ? 'Cabinet' : 'Asset'} | {detailData.code}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={{ color: '#666', fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 15 }}>
              {isCabinet ? (
                <>
                  <DetailRow label="Cabinet ID" value={detailData.code} />
                  <DetailRow label="Cabinet Name" value={detailData.name} />
                  <DetailRow label="GPS Coordinates" value={detailData.gps_lat && detailData.gps_lng ? `${detailData.gps_lat}, ${detailData.gps_lng}` : 'Not set'} />
                  <DetailRow
                    label="Label Status"
                    value={
                      detailData.label_status === 0 ? 'Not Printed' :
                      detailData.label_status === 2 ? 'Pending Update' :
                      detailData.last_printed_at ? `Printed ${new Date(detailData.last_printed_at).toLocaleDateString()}` : 'Printed'
                    }
                    color={
                      detailData.label_status === 0 ? '#F44336' :
                      detailData.label_status === 2 ? '#FF9800' : '#4CAF50'
                    }
                  />
                  <DetailRow label="Sync Status" value={detailData.sync_status > 0 ? 'Pending Sync' : 'Synced'} />
                  {detailData.updated_at && <DetailRow label="Updated At" value={new Date(detailData.updated_at).toLocaleString()} />}

                  <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 }}>
                    <Text style={{ color: '#32D74B', fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
                      <Ionicons name="cube-outline" size={14} /> Assets in Cabinet ({cabinetAssetList.length})
                    </Text>
                    {cabinetAssetList.length === 0 ? (
                      <Text style={{ color: '#555', textAlign: 'center', marginVertical: 10 }}>No assets</Text>
                    ) : (
                      cabinetAssetList.map(a => renderAssetCard(a, true))
                    )}
                  </View>
                </>
              ) : (
                <>
                  {detailData.photo_uri || detailData.remote_photo_uri ? (
                    <Image
                      source={{ uri: detailData.photo_uri || detailData.remote_photo_uri }}
                      style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 15 }}
                    />
                  ) : null}
                  <DetailRow label="Asset Name" value={detailData.name} />
                  <DetailRow label="Asset ID" value={detailData.code} />
                  <DetailRow label="Asset Category" value={detailData.category || 'Uncategorized'} />
                  <DetailRow label="Current Status" value={STATUS_TEXT[detailData.item_status]} color={STATUS_COLOR[detailData.item_status]} />
                  <DetailRow label="Belongs to Cabinet" value={detailData.cabinet_name || detailData.cabinet_id || 'Unassigned'} />
                  <DetailRow
                    label="Label Status"
                    value={
                      detailData.label_status === 0 ? 'Not Printed' :
                      detailData.label_status === 2 ? 'Pending Update' :
                      detailData.last_printed_at ? `Printed ${new Date(detailData.last_printed_at).toLocaleDateString()}` : 'Printed'
                    }
                    color={
                      detailData.label_status === 0 ? '#F44336' :
                      detailData.label_status === 2 ? '#FF9800' : '#4CAF50'
                    }
                  />
                  <DetailRow label="Sync Status" value={detailData.sync_status > 0 ? 'Pending Sync' : 'Synced'} />
                  {detailData.updated_at && <DetailRow label="Updated At" value={new Date(detailData.updated_at).toLocaleString()} />}

                  <View style={{ marginTop: 15, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 }}>
                    <Text style={{ color: '#32D74B', fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>
                      ⏱ Transaction Log ({transactionList.length})
                    </Text>
                    {transactionList.length === 0 ? (
                      <Text style={{ color: '#555', textAlign: 'center', marginVertical: 8 }}>No records</Text>
                    ) : (
                      transactionList.slice(0, 10).map((tx, idx) => (
                        <View key={idx} style={txStyles.record}>
                          <View style={txStyles.recordLeft}>
                            <Text style={txStyles.recordIcon}>{tx.action_type === 'OUT' ? '📤' : '📥'}</Text>
                            <View>
                              <Text style={txStyles.recordType}>{tx.action_type === 'OUT' ? 'Checked Out' : 'Return'}</Text>
                              <Text style={txStyles.recordTime}>{new Date(tx.action_time).toLocaleString()}</Text>
                              {tx.remarks ? <Text style={txStyles.recordRemarks}>Remark: {tx.remarks}</Text> : null}
                            </View>
                          </View>
                          <Text style={txStyles.recordOp}>{tx.operator_id || 'System'}</Text>
                        </View>
                      ))
                    )}
                    {transactionList.length > 10 && (
                      <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 4 }}>Showing last 10 records</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.actionBar}>
              {!isCabinet && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: detailData.item_status === 0 ? '#FF9800' : '#4CAF50' }]}
                  onPress={() => handleToggleStatus(detailData)}
                >
                  <Text style={styles.actionBtnText}>
                    {detailData.item_status === 0 ? 'Borrow' : 'Return'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#009688' }]}
                onPress={handlePrintLabel}
              >
                <Text style={styles.actionBtnText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={() => openEdit(detailData, detailType)}>
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F44336' }]} onPress={() => handleDelete(detailData, detailType)}>
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ---------- Render edit ----------
  const renderEditModal = () => {
    if (!formData.id) return null;
    const isCabinet = detailType === 'cabinet';

    return (
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {isCabinet ? '✏️ Edit Cabinet' : '✏️ Edit Asset'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: '#666', fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 15 }}>
              <FormField label="ID" value={formData.code} onChangeText={v => setFormData({ ...formData, code: v })} />
              <FormField label="Name" value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} />

              {isCabinet && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>GPS Coordinates</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={formData.gps_lat ? String(formData.gps_lat) : ''}
                      onChangeText={v => setFormData({ ...formData, gps_lat: parseFloat(v) || null })}
                      placeholder="Lat"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={formData.gps_lng ? String(formData.gps_lng) : ''}
                      onChangeText={v => setFormData({ ...formData, gps_lng: parseFloat(v) || null })}
                      placeholder="Lng"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.gpsBtn} onPress={handleGpsLocation}>
                      <Text style={{ color: '#32D74B', fontSize: 20 }}>📍</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Click 📍 to relocate device coordinates</Text>
                </View>
              )}

              {!isCabinet && (
                <>
                  <FormField label="Category" value={formData.category} onChangeText={v => setFormData({ ...formData, category: v })} />
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Belongs to Cabinet</Text>
                    <View style={styles.cabinetPicker}>
                      <TouchableOpacity style={[styles.chip, formCabinetId === '' && styles.chipActive]} onPress={() => setFormCabinetId('')}>
                        <Text style={{ color: formCabinetId === '' ? '#00E676' : '#888', fontSize: 12 }}>Unassigned</Text>
                      </TouchableOpacity>
                      {cabinets.map(c => (
                        <TouchableOpacity key={c.id} style={[styles.chip, formCabinetId === c.id && styles.chipActive]} onPress={() => setFormCabinetId(c.id)}>
                          <Text style={{ color: formCabinetId === c.code ? '#00E676' : '#888', fontSize: 12 }}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>In Stock/Checked Out</Text>
                    <View style={styles.statusPicker}>
                      {[0, 1].map(s => (
                        <TouchableOpacity key={s} style={[styles.chip, Number(formData.item_status) === s && { backgroundColor: STATUS_COLOR[s] }]} onPress={() => setFormData({ ...formData, item_status: s })}>
                          <Text style={{ color: Number(formData.item_status) === s ? '#fff' : '#888', fontSize: 12 }}>{STATUS_TEXT[s]}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Asset Photo</Text>
                    <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                      <Text style={{ color: '#32D74B' }}>📸 {formPhoto ? 'Retake Photo' : 'Take Photo'}</Text>
                    </TouchableOpacity>
                    {formPhoto && <Image source={{ uri: formPhoto }} style={{ width: 80, height: 80, borderRadius: 6, marginTop: 8 }} />}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.actionBar}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: saving ? '#666' : '#4CAF50' }]} onPress={handleSaveEdit} disabled={saving}>
                <Text style={styles.actionBtnText}>{saving ? 'Saving...' : '✅ Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ---------- Render add ----------
  const renderAddModal = () => {
    const isCabinet = detailType === 'cabinet';
    return (
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {isCabinet ? '➕ Add Cabinet' : '➕ Add Asset'}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={{ color: '#666', fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 15 }}>
              <FormField label="ID (Auto-generated)" value={formData.code} onChangeText={v => setFormData({ ...formData, code: v })} />
              <FormField label="Name" value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} placeholder={isCabinet ? 'e.g., Zone A Cabinet' : 'e.g., Digital Multimeter'} />

              {isCabinet && (
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>GPS Coordinates</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={formData.gps_lat ? String(formData.gps_lat) : ''}
                      onChangeText={v => setFormData({ ...formData, gps_lat: parseFloat(v) || null })}
                      placeholder="Lat"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      value={formData.gps_lng ? String(formData.gps_lng) : ''}
                      onChangeText={v => setFormData({ ...formData, gps_lng: parseFloat(v) || null })}
                      placeholder="Lng"
                      placeholderTextColor="#555"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity style={styles.gpsBtn} onPress={handleGpsLocation}>
                      <Text style={{ color: '#32D74B', fontSize: 20 }}>📍</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#555', fontSize: 11, marginTop: 4 }}>Click 📍 to relocate device coordinates</Text>
                </View>
              )}

              {!isCabinet && (
                <>
                  <FormField label="Category" value={formData.category} onChangeText={v => setFormData({ ...formData, category: v })} placeholder="e.g., Testing Equipment" />
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Belongs to Cabinet</Text>
                    <View style={styles.cabinetPicker}>
                      <TouchableOpacity style={[styles.chip, formCabinetId === '' && styles.chipActive]} onPress={() => setFormCabinetId('')}>
                        <Text style={{ color: formCabinetId === '' ? '#00E676' : '#888', fontSize: 12 }}>Unassigned</Text>
                      </TouchableOpacity>
                      {cabinets.map(c => (
                        <TouchableOpacity key={c.id} style={[styles.chip, formCabinetId === c.id && styles.chipActive]} onPress={() => setFormCabinetId(c.id)}>
                          <Text style={{ color: formCabinetId === c.code ? '#00E676' : '#888', fontSize: 12 }}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Asset Photo</Text>
                    <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                      <Text style={{ color: '#32D74B' }}>📸 {formPhoto ? 'Retake Photo' : 'Take Photo'}</Text>
                    </TouchableOpacity>
                    {formPhoto && <Image source={{ uri: formPhoto }} style={{ width: 80, height: 80, borderRadius: 6, marginTop: 8 }} />}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.actionBar}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: saving ? '#666' : '#4CAF50' }]} onPress={handleAdd} disabled={saving}>
                <Text style={styles.actionBtnText}>{saving ? 'Adding...' : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /> Confirm Add</>}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color="#00E676" size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Asset Library</Text>
          <View style={styles.printerStatus}>
            <Text style={{ color: printerConnected ? '#4CAF50' : '#F44336', fontSize: 11 }}>
              {printerConnected ? <Text><Ionicons name="print" size={11} color="#4CAF50"/> {printerName}</Text> : <Text><Ionicons name="print-outline" size={11} color="#F44336"/> Not Connected</Text>}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSync} disabled={isSyncing} style={styles.syncArea}>
          <Text style={styles.syncTimeText}>{getSyncText()}</Text>
          <Text style={{ color: isSyncing ? '#666' : '#00E676', fontSize: 18 }}>{isSyncing ? <Ionicons name="sync-outline" size={18} /> : <Ionicons name="sync" size={18} />}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scanBar}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScannerVisible(true)}>
          <Text style={styles.scanBtnText}><Ionicons name="scan" size={14} color="#32D74B" /> Scan & Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => openAdd(activeTab === 'cabinets' ? 'cabinet' : 'asset')}>
          <Text style={styles.addBtnText}><Ionicons name="add" size={14} color="#32D74B" /> {activeTab === 'cabinets' ? 'Cabinet' : 'Asset'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'cabinets' && styles.tabActive]} onPress={() => setActiveTab('cabinets')}>
          <Text style={[styles.tabText, activeTab === 'cabinets' && styles.tabTextActive]}><Ionicons name="server-outline" size={14} /> Cabinets ({cabinets.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'assets' && styles.tabActive]} onPress={() => setActiveTab('assets')}>
          <Text style={[styles.tabText, activeTab === 'assets' && styles.tabTextActive]}><Ionicons name="cube-outline" size={14} /> Assets ({assets.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cabinets' ? (
        <FlatList
          data={cabinets}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderCabinetCard(item)}
          contentContainer={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No cabinets data</Text>}
        />
      ) : (
        <FlatList
          data={assets}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderAssetCard(item)}
          contentContainer={{ padding: 15 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No assets data</Text>}
        />
      )}

      <QRScanner visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleScanResult} />
      {renderDetailModal()}
      {renderEditModal()}
      {renderAddModal()}
    </SafeAreaView>
  );
}

// ---------- Helpers ----------
const DetailRow = ({ label, value, color }) => (
  <View style={detailStyles.row}>
    <Text style={detailStyles.label}>{label}</Text>
    <Text style={[detailStyles.value, color ? { color } : null]}>{value || '-'}</Text>
  </View>
);

const FormField = ({ label, value, onChangeText, placeholder }) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      style={styles.formInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#555"
    />
  </View>
);

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  label: { color: '#888', fontSize: 13 },
  value: { color: '#fff', fontSize: 13, fontWeight: 'bold' }
});

const txStyles = StyleSheet.create({
  record: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  recordLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  recordIcon: { fontSize: 18, marginRight: 10 },
  recordType: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  recordTime: { color: '#666', fontSize: 11, marginTop: 2 },
  recordRemarks: { color: '#888', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  recordOp: { color: '#888', fontSize: 11 }
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  headerLeft: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  printerStatus: { marginTop: 4 },
  syncArea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncTimeText: { color: '#666', fontSize: 12 },
  scanBar: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 10, gap: 10 },
  scanBtn: { flex: 1, backgroundColor: '#2C2C2E', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  scanBtnText: { color: '#32D74B', fontWeight: 'bold', fontSize: 14 },
  addBtn: { backgroundColor: '#2C2C2E', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', minWidth: 90 },
  addBtnText: { color: '#32D74B', fontWeight: 'bold', fontSize: 14 },
  tabBar: { flexDirection: 'row', marginHorizontal: 15, backgroundColor: '#1C1C1E', borderRadius: 8, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#2C2C2E' },
  tabText: { color: '#666', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#32D74B' },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 40, fontSize: 14 },
  cabinetCard: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 20, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cabinetCardAttention: { borderWidth: 1, borderColor: '#FF453A' },
  cabinetLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cabinetInfo: { marginLeft: 16, flex: 1 },
  cabinetName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cabinetCode: { color: '#8E8E93', fontSize: 13, marginTop: 4 },
  cabinetRight: { alignItems: 'flex-end', gap: 8 },
  alertBadges: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  alertDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  alertDotText: { fontSize: 11 },
  syncBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  syncText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  assetCard: { backgroundColor: '#2C2C2E', padding: 14, borderRadius: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  assetCardCompact: { backgroundColor: '#1C1C1E', padding: 12, borderRadius: 14 },
  assetCardAttention: { borderWidth: 1, borderColor: '#FF453A' },
  assetImg: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#3A3A3C' },
  assetImgSmall: { width: 42, height: 42, borderRadius: 8 },
  assetImgPlaceholder: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#3A3A3C', justifyContent: 'center', alignItems: 'center' },
  assetInfo: { flex: 1, marginLeft: 16 },
  assetName: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  assetSub: { color: '#8E8E93', fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#222', paddingBottom: 15 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  modalSub: { color: '#666', fontSize: 12, marginTop: 2 },
  actionBar: { flexDirection: 'row', gap: 8, marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#222' },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  formField: { marginBottom: 15 },
  formLabel: { color: '#888', fontSize: 12, marginBottom: 6 },
  formInput: { backgroundColor: '#2C2C2E', color: '#fff', padding: 12, borderRadius: 8, fontSize: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#333' },
  chipActive: { borderColor: '#32D74B', backgroundColor: 'rgba(0,230,118,0.1)' },
  cabinetPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPicker: { flexDirection: 'row', gap: 10 },
  photoBtn: { padding: 12, backgroundColor: '#2C2C2E', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  gpsBtn: { width: 48, height: 48, backgroundColor: '#2C2C2E', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' }
});
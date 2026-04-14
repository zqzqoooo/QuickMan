import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  Modal, Alert, ActivityIndicator, FlatList, ScrollView, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRScanner from '../components/QRScanner';
import { SQLiteService } from '../services/SQLiteService';
import { FeedbackService } from '../services/FeedbackService';

const STATUS_TEXT = { 0: 'In Stock', 1: 'Checked Out' };
const STATUS_COLOR = { 0: '#4CAF50', 1: '#F44336' };

export default function MainScreen() {
  const [scannerMode, setScannerMode] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [recentOps, setRecentOps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [returnFlow, setReturnFlow] = useState(null);

  useEffect(() => {
    const load = async () => {
      const name = await AsyncStorage.getItem('quickman_username');
      setUsername(name || 'Staff');
      const saved = await AsyncStorage.getItem('recent_ops');
      if (saved) setRecentOps(JSON.parse(saved));
    };
    load();
  }, []);

  const addRecentOp = async (asset, action) => {
    const op = {
      id: Date.now(),
      assetName: asset.name,
      assetCode: asset.code,
      action,
      time: new Date().toLocaleString(),
      cabinetCode: asset.cabinet_id || null
    };
    const updated = [op, ...recentOps].slice(0, 20);
    setRecentOps(updated);
    await AsyncStorage.setItem('recent_ops', JSON.stringify(updated));
  };

  const handleScan = (code) => {
    setScannerVisible(false);
    if (!code) return;
    const trimmed = code.trim();
    // Delay exec iOS Modal Anim block，Anti freeze
    setTimeout(() => {
      processCode(trimmed);
    }, 500);
  };

  const processCode = async (code) => {
    setLoading(true);
    try {
      const asset = await SQLiteService.getAssetByCode(code);
      if (!asset) {
        FeedbackService.playError();
        Alert.alert('Not found', `System内不存在ID为 ${code} 的Asset`);
        return;
      }
      setConfirmData({ ...asset, targetStatus: scannerMode === 'out' ? 1 : 0 });
    } catch (e) {
      FeedbackService.playError();
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!confirmData) return;
    const { id, code, name, targetStatus, cabinet_id, cabinet_name } = confirmData;
    const actionType = targetStatus === 1 ? 'OUT' : 'IN';
    const actionText = targetStatus === 1 ? 'Checked Out' : 'Return';
    const remarks = targetStatus === 1 ? 'Scan to Check Out' : `Scan to ReturnTo ${cabinet_name || "Unknown"}`;
    const operator = username;

    try {
      await SQLiteService.updateAsset(id, { item_status: targetStatus });
      await SQLiteService.recordTransaction(id, actionType, operator, remarks);
      FeedbackService.playBeep();
      addRecentOp({ name, code, cabinet_id }, actionText);
      Alert.alert('Success', `${name} 已${actionText}`, [{ text: 'OK', onPress: () => setConfirmData(null) }]);
      setConfirmData(null);
    } catch (e) {
      FeedbackService.playError();
      Alert.alert('失败', e.message);
    }
  };

  const handleReturnScan = async (code) => {
    setScannerVisible(false);
    if (!code || !returnFlow) return;
    const trimmed = code.trim();

    setTimeout(async () => {
      setLoading(true);
      try {
        if (returnFlow.target === 'asset') {
          if (trimmed.startsWith('DEV-')) {
            const asset = await SQLiteService.getAssetByCode(trimmed);
            if (!asset) {
              FeedbackService.playError();
              Alert.alert('Not found', `System内不存在ID为 ${trimmed} 的Asset`);
              setReturnFlow({ ...returnFlow, isScanning: false });
              return;
            }
            if (asset.item_status === 0) {
               Alert.alert('Tip', '该Asset当前已In Stock，可能无需Return');
            }
            setReturnFlow({ ...returnFlow, asset, isScanning: false });
          } else {
            FeedbackService.playError();
            Alert.alert('操作Error', '请扫描Asset二维码(DEV-Starts with)');
            setReturnFlow({ ...returnFlow, isScanning: false });
          }
        } else if (returnFlow.target === 'cabinet') {
          const cabinets = await SQLiteService.getCabinets();
          const cabinet = cabinets.find(c => c.code === trimmed);
          if (!cabinet) {
            FeedbackService.playError();
            Alert.alert('Not found', `System内找不到ID为 ${trimmed}  cabinet`);
            setReturnFlow({ ...returnFlow, isScanning: false });
            return;
          }
          setReturnFlow({ ...returnFlow, cabinet, isScanning: false });
        }
      } catch (e) {
        FeedbackService.playError();
        Alert.alert('Error', e.message);
        setReturnFlow({ ...returnFlow, isScanning: false });
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const submitReturn = async () => {
    if (!returnFlow || !returnFlow.asset || !returnFlow.cabinet) return;
    try {
      const { asset, cabinet } = returnFlow;
      const cachedUsername = await AsyncStorage.getItem('quickman_username') || 'Unknown user';
      await SQLiteService.updateAsset(asset.id, { item_status: 0, cabinet_id: cabinet.id });
      await SQLiteService.recordTransaction(asset.id, 'IN', cachedUsername, `Scan to ReturnTo ${cabinet.code}`);
      FeedbackService.playBeep();
      Alert.alert('Success', `${asset.name} 已ReturnTo ${cabinet.name}`, [{ text: 'OK', onPress: () => setReturnFlow(null) }]);
      addRecentOp({ name: asset.name, code: asset.code, cabinet_id: cabinet.id }, 'Return');
    } catch (e) {
      FeedbackService.playError();
      Alert.alert('失败', e.message);
    }
  };

  const renderRecentCard = ({ item }) => (
    <View style={styles.recentCard}>
      <View style={styles.recentLeft}>
        <Ionicons name={item.action === 'Checked Out' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={24} color={item.action === 'Checked Out' ? '#F44336' : '#4CAF50'} style={{marginRight: 12}} />
        <View>
          <Text style={styles.recentName} numberOfLines={1}>{item.assetName}</Text>
          <Text style={styles.recentCode}>{item.assetCode}</Text>
          <Text style={styles.recentTime}>{item.time}</Text>
        </View>
      </View>
      <View style={[styles.recentBadge, { backgroundColor: item.action === 'Checked Out' ? '#F44336' : '#4CAF50' }]}>
        <Text style={styles.recentBadgeText}>{item.action}</Text>
      </View>
    </View>
  );

  const renderReturnPage = () => {
    if (!returnFlow) return null;
    
    const { asset, cabinet, isScanning } = returnFlow;
    const canSubmit = !!asset && !!cabinet;

    return (
      <Modal visible={!!returnFlow && !isScanning} transparent animationType="slide">
        <View style={styles.returnOverlay}>
          <View style={styles.returnPage}>
            <View style={styles.returnHeader}>
              <TouchableOpacity onPress={() => setReturnFlow(null)}>
                <Text style={{ color: '#666', fontSize: 28 }}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.returnTitle}>📥 扫码双重ConfirmReturn</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.returnBody}>
               
               <View style={styles.formSection}>
                 <Text style={styles.formSectionTitle}>📦 1. ReturnAsset信息</Text>                   
                   {asset && (asset.photo_uri || asset.remote_photo_uri) && (
                     <View style={{ alignItems: 'center', marginBottom: 15 }}>
                       <Image 
                         source={{ uri: asset.photo_uri || asset.remote_photo_uri }} 
                         style={{ width: 120, height: 120, borderRadius: 8, backgroundColor: '#333' }}
                       />
                     </View>
                   )}
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Asset名称</Text>
                   <Text style={styles.formValue}>{asset ? asset.name : '-'}</Text>
                 </View>
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>AssetID</Text>
                   <Text style={styles.formValue}>{asset ? asset.code : '-'}</Text>
                 </View>
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Asset分类</Text>
                   <Text style={styles.formValue}>{asset ? (asset.category || '-') : '-'}</Text>
                 </View>
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Status</Text>
                   {asset ? (
                     <Text style={[styles.formValue, { color: STATUS_COLOR[asset.item_status] }]}>
                       {STATUS_TEXT[asset.item_status]}
                     </Text>
                   ) : (
                     <Text style={styles.formValue}>-</Text>
                   )}
                 </View>
                 <TouchableOpacity style={styles.formScanBtn} onPress={() => { setReturnFlow({ ...returnFlow, target: 'asset', isScanning: true }); setScannerVisible(true); }}>
                    <Text style={styles.formScanBtnText}>{asset ? '🔄 重新扫描Asset(DEV)' : '📷 扫描Asset二维码'}</Text>
                 </TouchableOpacity>
               </View>

               <View style={styles.formSection}>
                 <Text style={styles.formSectionTitle}>🗄️ 2. Cabinet Info (Target)</Text>                   
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Cabinet Name</Text>
                   <Text style={styles.formValue}>{cabinet ? cabinet.name : '-'}</Text>
                 </View>
                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Cabinet ID</Text>
                   <Text style={styles.formValue}>{cabinet ? cabinet.code : '-'}</Text>
                 </View>
                 
                 <TouchableOpacity style={styles.formScanBtn} onPress={() => { setReturnFlow({ ...returnFlow, target: 'cabinet', isScanning: true }); setScannerVisible(true); }}>
                    <Text style={styles.formScanBtnText}>{cabinet ? <><Ionicons name="refresh" size={14} /> Rescan Cabinet</> : '📷 Scan Cabinet'}</Text>
                 </TouchableOpacity>
               </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmBtn, !canSubmit && styles.confirmBtnDisabled]}
              onPress={submitReturn}
              disabled={!canSubmit}
            >
              <Text style={styles.confirmBtnText}>{canSubmit ? <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /> Confirm ReturnCheck In</> : '请扫描Asset和机柜二维码'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}><Ionicons name="hand-right-outline" size={20} color="#fff" /> {username}</Text>
          <Text style={styles.subtitle}>Workspace</Text>
        </View>
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.scanSection}>
        <TouchableOpacity
          style={[styles.scanBtn, styles.scanBtnOut]}
          onPress={() => { setScannerMode('out'); setScannerVisible(true); }}
        >
          <Ionicons name="arrow-up-circle-outline" size={36} color="#F44336" style={{marginBottom: 8}} />
          <Text style={styles.scanBtnText}>Check Out</Text>
          <Text style={styles.scanBtnHint}>Scan asset QR code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scanBtn, styles.scanBtnIn]}
          onPress={() => { setReturnFlow({ asset: null, cabinet: null, target: 'asset', isScanning: true }); setScannerVisible(true); }}
        >
          <Ionicons name="arrow-down-circle-outline" size={36} color="#4CAF50" style={{marginBottom: 8}} />
          <Text style={styles.scanBtnText}>Return</Text>
          <Text style={styles.scanBtnHint}>Scan QR to confirm returning</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}><Ionicons name="list" size={12} color="#888" /> Recent Activity</Text>
        {recentOps.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity</Text>
        ) : (
          <FlatList
            data={recentOps}
            keyExtractor={item => String(item.id)}
            renderItem={renderRecentCard}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <QRScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={returnFlow ? handleReturnScan : handleScan}
      />

      <Modal visible={!!confirmData} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}><Ionicons name="clipboard-outline" size={20} color="#fff" /> Confirm{confirmData?.targetStatus === 1 ? 'Checked Out' : 'Return'}</Text>

            {confirmData && (
              <View style={styles.assetPreview}>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetName}>{confirmData.name}</Text>
                  <Text style={styles.assetCode}>ID: {confirmData.code}</Text>
                  <Text style={styles.assetCategory}>{confirmData.category || 'Uncategorized'}</Text>
                  {confirmData.cabinet_id && (
                    <Text style={styles.assetCabinet}><Ionicons name="location" size={12} color="#888" /> {confirmData.cabinet_name || "Unknown Cabinet"}</Text>
                  )}
                </View>
                <View style={[styles.statusPreview, { backgroundColor: STATUS_COLOR[confirmData.item_status] }]}>
                  <Text style={styles.statusPreviewText}>{STATUS_TEXT[confirmData.item_status]}</Text>
                </View>
              </View>
            )}

            <View style={styles.arrowSection}>
              <Ionicons name="arrow-down-outline" size={24} color="#fff" style={{marginBottom: 8}} />
              <View style={[styles.targetStatus, { backgroundColor: STATUS_COLOR[confirmData?.targetStatus] }]}>
                <Text style={styles.targetStatusText}>
                  {confirmData?.targetStatus === 1 ? '📤 Status: Checked Out' : '📥 Status: In Stock'}
                </Text>
              </View>
            </View>

            <View style={styles.actionBar}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={() => setConfirmData(null)}>
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: STATUS_COLOR[confirmData?.targetStatus] }]} onPress={confirmAction}>
                <Text style={styles.actionBtnText}><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /> Confirm{confirmData?.targetStatus === 1 ? 'Checked Out' : 'Return'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderReturnPage()}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#00E676" size="large" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#666', fontSize: 13, marginTop: 2 },
  date: { color: '#666', fontSize: 13 },
  scanSection: { flexDirection: 'row', paddingHorizontal: 15, gap: 12, marginBottom: 20 },
  scanBtn: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center' },
  scanBtnOut: { backgroundColor: 'rgba(244, 67, 54, 0.15)', borderWidth: 1, borderColor: '#F44336' },
  scanBtnIn: { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderWidth: 1, borderColor: '#4CAF50' },
  scanBtnIcon: { fontSize: 36, marginBottom: 8 },
  scanBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scanBtnHint: { color: '#666', fontSize: 11, marginTop: 4 },
  recentSection: { flex: 1, paddingHorizontal: 15 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 10, letterSpacing: 1 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 40, fontSize: 14 },
  recentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 14, borderRadius: 10, marginBottom: 8 },
  recentLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  recentIcon: { fontSize: 24, marginRight: 12 },
  recentName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  recentCode: { color: '#666', fontSize: 11, marginTop: 1 },
  recentTime: { color: '#555', fontSize: 10, marginTop: 1 },
  recentBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  recentBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  assetPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 12, marginBottom: 16 },
  assetInfo: { flex: 1 },
  assetName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  assetCode: { color: '#32D74B', fontSize: 13, marginTop: 4 },
  assetCategory: { color: '#666', fontSize: 12, marginTop: 2 },
  assetCabinet: { color: '#888', fontSize: 12, marginTop: 2 },
  statusPreview: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  statusPreviewText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  arrowSection: { alignItems: 'center', marginBottom: 20 },
  targetStatus: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  targetStatusText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  actionBar: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  returnOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  returnPage: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  returnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  returnTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  returnBody: { marginBottom: 20 },
  formSection: { backgroundColor: '#1C1C1E', borderRadius: 20, padding: 16, marginBottom: 16 },
  formSectionTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#252525' },
  formLabel: { color: '#666', fontSize: 13 },
  formValue: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  formScanBtn: { marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#2C2C2E', alignItems: 'center', borderWidth: 1, borderColor: '#32D74B' },
  formScanBtnCabinet: { borderColor: '#32D74B' },
  formScanBtnFilled: { backgroundColor: 'rgba(0,230,118,0.1)' },
  formScanBtnText: { color: '#32D74B', fontWeight: 'bold', fontSize: 14 },
  confirmBtn: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  confirmBtnDisabled: { backgroundColor: '#333' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  returnPromptCard: { backgroundColor: '#1a3a2a', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#32D74B' },
  returnPromptText: { color: '#32D74B', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  returnPromptHint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: 4 }
});
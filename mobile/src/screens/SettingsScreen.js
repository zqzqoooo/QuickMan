import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, Switch, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncService } from '../services/SyncService';
import { PrinterService } from '../services/PrinterService';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState({ username: '', role: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState(null);
  const [foundPrinters, setFoundPrinters] = useState([]);
  const [showPrinterList, setShowPrinterList] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 🌟 Init：Read user & printer
  useEffect(() => {
    const init = async () => {
      const name = await AsyncStorage.getItem('quickman_username');
      const role = await AsyncStorage.getItem('quickman_role');
      const savedPrinter = await AsyncStorage.getItem('last_printer');
      const savedPrinterEnabled = await AsyncStorage.getItem('printer_enabled');

      setUser({ username: name || 'Unknown', role: role || 'staff' });
      if (savedPrinter) {
        setConnectedPrinter(savedPrinter);
      }
      if (savedPrinterEnabled === 'true') {
        setPrinterEnabled(true);
      }
    };
    init();
  }, []);

  // 🌟 Switch logic
  const handleTogglePrinter = async (value) => {
    setPrinterEnabled(value);
    await AsyncStorage.setItem('printer_enabled', value.toString());

    if (!value) {
      setConnectedPrinter(null);
      setShowPrinterList(false);
      return;
    }

    if (value && !isInitialized) {
      try {
        await PrinterService.init();
        setIsInitialized(true);
      } catch (e) {
        Alert.alert('Initialization Failed', 'Printer modInitialization Failed: ' + e.message);
        setPrinterEnabled(false);
        await AsyncStorage.setItem('printer_enabled', 'false');
        return;
      }
    }

    if (value && !connectedPrinter) {
      setShowPrinterList(true);
      await handleScanPrinters();
    }
  };

  const handleScanPrinters = async () => {
    if (isSearching) return;
    setIsSearching(true);
    setFoundPrinters([]);
    
    try {
      const list = await PrinterService.scan();
      setFoundPrinters([...new Set(list)]);

      if (list.length === 0) {
        Alert.alert('Tip', 'No printer found. Please ensure it is turned on.');
        return;
      }
    } catch (e) {
      Alert.alert('Scan Failed', e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConnectPrinter = async (printerName) => {
    if (isConnecting) return;
    setIsConnecting(true);
    
    try {
      await PrinterService.connect(printerName);
      setConnectedPrinter(printerName);
      
      // 🌟 Core fix：ManualConnected，Save name！
      await AsyncStorage.setItem('last_printer', printerName);
      
      setShowPrinterList(false);
      Alert.alert('Connected', `Remembered and connected to: ${printerName}`);
    } catch (e) {
      Alert.alert('Connection Failed', e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    PrinterService.disconnect();
    setConnectedPrinter(null);
    setShowPrinterList(false);
    await AsyncStorage.removeItem('last_printer'); // ManualDisconnectClear save
    Alert.alert('Disconnected', 'Printer DisconnectConnected');
  };

  const handlePrintTest = async () => {
    if (!connectedPrinter) return Alert.alert('Tip', 'Please connect printer first');
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dateTimeStr = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
      
      const elements = [
        { type: 'qrcode', x: 2, y: 2, size: 16, text: 'GEARSTACK-OK' },
        { type: 'text', x: 20, y: 2, width: 19, height: 6, text: 'Test Asset', fontSize: 3.5 },
        { type: 'text', x: 20, y: 8, width: 19, height: 5, text: 'ID: GEARSTACK', fontSize: 2.5 },
        { type: 'text', x: 20, y: 13, width: 19, height: 5, text: `${dateTimeStr}`, fontSize: 2.5 }
      ];
      await PrinterService.printTemplate({ width: 40, height: 20 }, elements, 1);
      Alert.alert('Success', 'Test label print command sent');
    } catch (e) {
      Alert.alert('Print failed', e.message);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const res = await SyncService.runSync();
    setIsSyncing(false);
    res.success ? Alert.alert("Sync Successful") : Alert.alert("Sync Failed", res.error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView padding={20}>
        <Text style={styles.header}>Settings</Text>

        <View style={styles.card}>
          <Text style={{ color: '#888' }}>Current Operator</Text>
          <Text style={styles.val}><Ionicons name="person-circle-outline" size={16} color="#32D74B" /> {user.username} ({user.role})</Text>
        </View>

        <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={isSyncing}>
          <Text style={styles.btnText}>{isSyncing ? "Syncing..." : <><Ionicons name="cloud-upload-outline" size={16} color="#000" /> Sync Cloud Data</>}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>Enable Printer Module</Text>
            <Switch value={printerEnabled} onValueChange={handleTogglePrinter} trackColor={{ false: '#333', true: '#00E676' }}/>
          </View>

          {printerEnabled && (
            <View style={{ marginTop: 15, borderTopWidth: 1, borderColor: '#222', paddingTop: 15 }}>
              <View style={styles.printerStatus}>
                <Text style={{ color: '#888', fontSize: 14 }}>Printer Status</Text>
                {connectedPrinter ? (
                  <View style={styles.connectedInfo}>
                    <Text style={styles.connectedText}><Ionicons name="print" size={14} color="#32D74B" /> {connectedPrinter}</Text>
                    <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                      <Text style={{ color: '#ff5252', fontSize: 12 }}>Disconnect</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.disconnectedText}><Ionicons name="print-outline" size={14} color="#666" /> Not Connected</Text>
                )}
              </View>

              {showPrinterList && (
                <View style={styles.printerListContainer}>
                  <View style={styles.printerListHeader}>
                    <Text style={{ color: '#32D74B', fontSize: 14 }}>Nearby Devices</Text>
                    <TouchableOpacity onPress={handleScanPrinters} disabled={isSearching}>
                      <Text style={{ color: isSearching ? '#666' : '#00E676' }}>
                        {isSearching ? 'Searching...' : <><Ionicons name="refresh" size={14} /> Rescan</>}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isSearching && <ActivityIndicator color="#00E676" style={{ marginVertical: 10 }} />}

                  {!isSearching && foundPrinters.length === 0 && (
                    <Text style={{ color: '#666', textAlign: 'center', marginVertical: 10 }}>No devices found</Text>
                  )}

                  {!isSearching && foundPrinters.length > 0 && (
                    <FlatList
                      data={foundPrinters}
                      keyExtractor={(item) => item}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.printerItem} 
                          onPress={() => handleConnectPrinter(item)}
                          disabled={isConnecting}
                        >
                          <Ionicons name="print-outline" size={20} color="#fff" style={{marginRight: 10}} />
                          <Text style={styles.printerName}>{item}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                  {isConnecting && <ActivityIndicator color="#00E676" style={{marginTop: 10}}/>}
                </View>
              )}

              {!connectedPrinter && !showPrinterList && (
                <TouchableOpacity style={styles.outlineBtn} onPress={() => { setShowPrinterList(true); handleScanPrinters(); }}>
                  <Text style={{ color: '#32D74B' }}><Ionicons name="radio-outline" size={14} color="#32D74B" /> Scan Nearby Printers</Text>
                </TouchableOpacity>
              )}

              {connectedPrinter && (
                <TouchableOpacity style={styles.printBtn} onPress={handlePrintTest}>
                  <Text style={styles.printBtnText}><Ionicons name="document-text-outline" size={15} color="#fff" /> Print Test Label</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={async () => {
          await AsyncStorage.clear();
          navigation.replace('Login');
        }}>
          <Text style={{ color: '#ff5252', fontWeight: 'bold' }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#1C1C1E', padding: 20, borderRadius: 12, marginBottom: 15 },
  val: { color: '#32D74B', fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  syncBtn: { backgroundColor: '#32D74B', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  outlineBtn: { borderWidth: 1, borderColor: '#00E676', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  logoutBtn: { marginTop: 40, padding: 18, backgroundColor: '#222', borderRadius: 12, alignItems: 'center' },
  printerStatus: { marginBottom: 12 },
  connectedInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  connectedText: { color: '#32D74B', fontSize: 14, fontWeight: 'bold' },
  disconnectedText: { color: '#666', fontSize: 14, marginTop: 4 },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#ff5252' },
  printerListContainer: { marginTop: 10, borderTopWidth: 1, borderColor: '#222', paddingTop: 12 },
  printerListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  printerItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', padding: 12, borderRadius: 8, marginBottom: 8 },
  printerIcon: { fontSize: 20, marginRight: 10 },
  printerName: { color: '#fff', fontSize: 14 },
  printBtn: { backgroundColor: '#009688', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  printBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});
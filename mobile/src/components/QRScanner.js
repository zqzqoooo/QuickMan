import React, { useRef, useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';

export default function QRScanner({ visible, onClose, onScanned }) {
  const lastScannedMap = useRef(new Map());

  const handleBarCodeScanned = ({ data }) => {
    const now = Date.now();
    const lastTime = lastScannedMap.current.get(data) || 0;
    if (now - lastTime < 1500) return;

    lastScannedMap.current.set(data, now);
    onScanned(data);
  };

  useEffect(() => { if (visible) lastScannedMap.current.clear(); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide">
      <CameraView 
        style={StyleSheet.absoluteFillObject} 
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={{color:'white', fontWeight:'bold'}}>Close</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 100 },
  closeBtn: { backgroundColor: 'rgba(255,0,0,0.8)', padding: 15, borderRadius: 30, width: 120, alignItems: 'center' }
});
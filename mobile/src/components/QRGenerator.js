import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRGenerator({ value, size = 150 }) {
  if (!value) return null;

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode value={value} size={size} backgroundColor='white' color='black' />
      </View>
      <Text style={styles.valueText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 15 },
  qrWrapper: { padding: 10, backgroundColor: 'white', borderRadius: 8 },
  valueText: { color: '#00E676', marginTop: 8, fontSize: 12, fontFamily: 'Courier' }
});
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export default function AssetItem({ item, onDelete }) {
  return (
    <View style={styles.card}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder]} />
      )}
      <View style={styles.info}>
        <Text style={styles.idText}>{item.id}</Text>
        <Text style={styles.timeText}>{item.timestamp}</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)}>
        <Text style={styles.deleteText}>删除</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111', borderRadius: 12, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 50, height: 50, borderRadius: 6, marginRight: 12 },
  placeholder: { backgroundColor: '#333' },
  info: { flex: 1 },
  idText: { color: '#00E676', fontWeight: 'bold', fontFamily: 'Courier' },
  timeText: { color: '#666', fontSize: 10 },
  deleteText: { color: '#FF3B30', fontSize: 12, fontWeight: 'bold', padding: 5 }
});
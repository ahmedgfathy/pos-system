import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SellItLogo({ size = 72 }) {
  const s = size;
  const inner = s * 0.82;
  const offset = (s - inner) / 2;

  return (
    <View style={[styles.container, { width: s, height: s }]}>
      <View style={[styles.outer, { width: s, height: s, borderRadius: s * 0.23 }]}>
        <View style={[styles.inner, { width: inner, height: inner, borderRadius: inner * 0.22 }]}>
          <View style={styles.lines}>
            <View style={[styles.line, { width: '60%' }]} />
            <View style={[styles.line, { width: '48%' }]} />
            <View style={[styles.line, { width: '36%' }]} />
          </View>
          <View style={styles.checkCircle}>
            <Text style={styles.check}>&#10003;</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  outer: {
    backgroundColor: '#133593',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    backgroundColor: '#0d2568',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 0,
  },
  lines: {
    alignItems: 'flex-start',
    gap: 5,
    marginRight: 8,
  },
  line: {
    height: 5,
    backgroundColor: '#EBEBEB',
    borderRadius: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: -1,
  },
});

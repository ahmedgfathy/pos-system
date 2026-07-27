import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function BarcodeScanner({ onScan, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' && !permission) {
      requestPermission();
    }
  }, [permission]);

  const handleBarcodeScanned = ({ data }) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode('');
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter Barcode / QR Code</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Scan or type barcode..."
          placeholderTextColor={colors.textMuted}
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={handleManualSubmit}
          autoFocus
        />
        <View style={styles.buttonRow}>
          <Text style={styles.button} onPress={handleManualSubmit}>Submit</Text>
          {onClose && (
            <Text style={[styles.button, styles.cancelButton]} onPress={onClose}>Cancel</Text>
          )}
        </View>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.button} onPress={requestPermission}>Grant Permission</Text>
        {onClose && (
          <Text style={[styles.button, styles.cancelButton]} onPress={onClose}>Cancel</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.scanHint}>Point camera at barcode</Text>
        </View>
      </CameraView>
      {onClose && (
        <Text style={[styles.button, styles.cancelButton]} onPress={onClose}>Cancel</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderRadius: 12,
  },
  scanHint: {
    color: colors.text,
    fontSize: 16,
    marginTop: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    padding: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButton: {
    color: colors.error,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput,
  Alert, Modal, Platform,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme';
import BarcodeScanner from '../components/BarcodeScanner';
import SellItLogo from '../components/SellItLogo';

export default function InventoryScreen({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState({ name: '', barcode: '', price: '', cost: '', stock: '', category: '' });
  const [adjustQty, setAdjustQty] = useState('1');
  const [autoFetchedNotice, setAutoFetchedNotice] = useState('');

  const loadProducts = async () => {
    try {
      const params = search ? { search } : {};
      const data = await api.getProducts(params);
      setProducts(data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (search) loadProducts();
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleScan = useCallback(async (code) => {
    setScanning(false);
    try {
      const res = await api.autoLookupProduct(code);
      if (res.foundInDb) {
        setSelectedProduct(res.product);
        setShowAdjustModal(true);
      } else {
        const p = res.product || {};
        setForm({
          name: p.name || '',
          barcode: code,
          price: p.price ? String(p.price) : '',
          cost: p.cost ? String(p.cost) : '',
          stock: p.stock ? String(p.stock) : '10',
          category: p.category || 'General',
        });
        setAutoFetchedNotice(`Auto-fetched: "${p.name}" (${p.category})`);
        setShowAddModal(true);
      }
    } catch (err) {
      setForm({ name: '', barcode: code, price: '', cost: '', stock: '', category: '' });
      setAutoFetchedNotice('');
      setShowAddModal(true);
    }
  }, []);

  const handleAddProduct = async () => {
    if (!form.name || !form.price) {
      Alert.alert('Required', 'Name and Price are required');
      return;
    }
    try {
      await api.createProduct({
        name: form.name,
        barcode: form.barcode || undefined,
        price: parseFloat(form.price),
        cost: parseFloat(form.cost) || 0,
        stock: parseInt(form.stock) || 0,
        category: form.category || undefined,
      });
      setShowAddModal(false);
      setForm({ name: '', barcode: '', price: '', cost: '', stock: '', category: '' });
      setAutoFetchedNotice('');
      loadProducts();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(product.id);
              loadProducts();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const handleAdjust = async (type) => {
    if (!selectedProduct) return;
    const qty = parseInt(adjustQty);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid', 'Enter a valid quantity');
      return;
    }
    try {
      await api.adjustInventory(selectedProduct.id, type, qty, '');
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustQty('1');
      loadProducts();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of Sell-It?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  if (scanning) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />;
  }

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => {
        setSelectedProduct(item);
        setShowAdjustModal(true);
      }}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetail}>
          ${item.price.toFixed(2)} | Cost: ${item.cost.toFixed(2)} | {item.category || 'No category'}
        </Text>
        <Text style={styles.productBarcode}>Barcode: {item.barcode || 'N/A'}</Text>
      </View>
      <View style={styles.productActions}>
        <View style={styles.stockBadge}>
          <Text style={[styles.stockText, item.stock < 10 && styles.stockLow]}>
            {item.stock}
          </Text>
          <Text style={styles.stockLabel}>in stock</Text>
        </View>
        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SellItLogo size={32} />
          <Text style={styles.headerTitle}>Inventory</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setScanning(true)} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Scan</Text>
          </TouchableOpacity>
          {user?.role === 'admin' && (
            <TouchableOpacity onPress={() => {
              setForm({ name: '', barcode: '', price: '', cost: '', stock: '', category: '' });
              setAutoFetchedNotice('');
              setShowAddModal(true);
            }} style={styles.headerBtnPrimary}>
              <Text style={styles.headerBtnPrimaryText}>+ Add</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search inventory..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found</Text>
          }
        />
      )}

      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Product</Text>
            {autoFetchedNotice ? (
              <Text style={styles.autoNotice}>{autoFetchedNotice}</Text>
            ) : null}

            <TextInput style={styles.modalInput} placeholder="Product Name *" placeholderTextColor={colors.textMuted}
              value={form.name} onChangeText={v => setForm({...form, name: v})} />
            <TextInput style={styles.modalInput} placeholder="Barcode" placeholderTextColor={colors.textMuted}
              value={form.barcode} onChangeText={v => setForm({...form, barcode: v})} />
            <TextInput style={styles.modalInput} placeholder="Price *" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
              value={form.price} onChangeText={v => setForm({...form, price: v})} />
            <TextInput style={styles.modalInput} placeholder="Cost" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad"
              value={form.cost} onChangeText={v => setForm({...form, cost: v})} />
            <TextInput style={styles.modalInput} placeholder="Stock" placeholderTextColor={colors.textMuted} keyboardType="number-pad"
              value={form.stock} onChangeText={v => setForm({...form, stock: v})} />
            <TextInput style={styles.modalInput} placeholder="Category" placeholderTextColor={colors.textMuted}
              value={form.category} onChangeText={v => setForm({...form, category: v})} />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={handleAddProduct} style={styles.modalBtnPrimary}>
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdjustModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {selectedProduct?.name}
            </Text>
            <Text style={styles.modalSub}>Current stock: {selectedProduct?.stock}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={adjustQty}
              onChangeText={setAdjustQty}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => handleAdjust('in')} style={[styles.modalBtnPrimary, { backgroundColor: colors.success }]}>
                <Text style={styles.modalBtnText}>+ Add Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAdjust('out')} style={[styles.modalBtnPrimary, { backgroundColor: colors.error }]}>
                <Text style={styles.modalBtnText}>- Remove Stock</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setShowAdjustModal(false); setSelectedProduct(null); }}>
              <Text style={[styles.modalBtnTextSecondary, { textAlign: 'center', marginTop: 12 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 50,
    backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.primaryLight },
  headerBtn: { padding: 8, paddingHorizontal: 12, backgroundColor: colors.surfaceLight, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  headerBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  headerBtnPrimary: { padding: 8, paddingHorizontal: 14, backgroundColor: colors.primary, borderRadius: 6 },
  headerBtnPrimaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  logoutBtn: { padding: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  logoutBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  searchInput: {
    margin: 12, padding: 12, backgroundColor: colors.surfaceLight, borderRadius: 8,
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border,
  },
  list: { flex: 1, paddingHorizontal: 12 },
  productCard: {
    flexDirection: 'row', padding: 14, marginVertical: 4,
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  productInfo: { flex: 1 },
  productName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  productDetail: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  productBarcode: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  productActions: { alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 12 },
  stockBadge: { alignItems: 'center', justifyContent: 'center' },
  stockText: { color: colors.success, fontSize: 22, fontWeight: 'bold' },
  stockLow: { color: colors.error },
  stockLabel: { color: colors.textMuted, fontSize: 11 },
  deleteBtn: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4, backgroundColor: colors.error + '22' },
  deleteBtnText: { color: colors.error, fontSize: 12, fontWeight: '600' },
  loadingText: { color: colors.textSecondary, textAlign: 'center', padding: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center', padding: 48 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  autoNotice: {
    color: colors.primaryLight, fontSize: 13, fontWeight: '600',
    backgroundColor: colors.surfaceLight, padding: 8, borderRadius: 6,
    marginVertical: 6, textAlign: 'center', borderWidth: 1, borderColor: colors.primary,
  },
  modalSub: { color: colors.textSecondary, fontSize: 14, marginBottom: 16 },
  modalInput: {
    padding: 12, marginVertical: 6, backgroundColor: colors.surfaceLight, borderRadius: 8,
    color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalBtnPrimary: { flex: 1, padding: 12, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center' },
  modalBtnSecondary: { padding: 12 },
  modalBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  modalBtnTextSecondary: { color: colors.textSecondary, fontSize: 16 },
});

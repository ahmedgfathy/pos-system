import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput,
  Alert, ActivityIndicator, Platform, Image,
} from 'react-native';
import { colors } from '../theme';
import api from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';

export default function POSScreen({ user }) {
  const [cart, setCart] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delay = setTimeout(async () => {
        try {
          const results = await api.getProducts({ search: searchQuery });
          setSearchResults(results);
        } catch (_) {}
      }, 300);
      return () => clearTimeout(delay);
    }
    setSearchResults([]);
  }, [searchQuery]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleScan = useCallback(async (code) => {
    setScanning(false);
    try {
      const result = await api.autoLookupProduct(code);
      if (result.foundInDb) {
        addToCart(result.product);
        return;
      }

      const suggestedName = result.product?.name;
      Alert.alert(
        'Product Not in Inventory',
        `${suggestedName ? `${suggestedName}\n` : ''}Code: ${code}\nAdd it in Inventory before selling it.`
      );
    } catch (error) {
      Alert.alert('Scan Failed', error.message);
    }
  }, [addToCart]);

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter(item => item.product.id !== productId);
      return prev.map(item =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      );
    });
  };

  const removeItem = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Add items to the cart before checkout');
      return;
    }

    setLoading(true);
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));
      const sale = await api.createSale(items, paymentMethod);
      Alert.alert(
        'Sale Complete',
        `Total: $${sale.total.toFixed(2)}\nPayment: ${paymentMethod}\nSale ID: ${sale.id.slice(0, 8)}`,
        [{ text: 'OK', onPress: () => setCart([]) }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (scanning) {
    return <BarcodeScanner onScan={handleScan} onClose={() => setScanning(false)} />;
  }

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.product.name}</Text>
        <Text style={styles.cartItemPrice}>${(item.product.price * item.quantity).toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControl}>
        <TouchableOpacity onPress={() => updateQuantity(item.product.id, -1)} style={styles.qtyBtn}>
          <Text style={styles.qtyBtnText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.quantity}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => updateQuantity(item.product.id, 1)} style={styles.qtyBtn}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeItem(item.product.id)} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>POS Terminal</Text>
        </View>
        <Text style={styles.headerUser}>{user?.username} ({user?.role})</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScanning(true)}>
          <Text style={styles.scanBtnText}>📷 Scan Barcode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchToggle} onPress={() => setShowSearch(!showSearch)}>
          <Text style={styles.scanBtnText}>🔍 Search</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResult} onPress={() => addToCart(item)}>
                <View>
                  <Text style={styles.searchResultName}>{item.name}</Text>
                  <Text style={styles.searchResultDetail}>${item.price.toFixed(2)} | Stock: {item.stock}</Text>
                </View>
                <Text style={styles.addIcon}>+</Text>
              </TouchableOpacity>
            )}
            style={styles.searchResults}
          />
        </View>
      )}

      <FlatList
        data={cart}
        keyExtractor={(item) => item.product.id}
        renderItem={renderCartItem}
        style={styles.cartList}
        ListEmptyComponent={
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Cart is empty</Text>
            <Text style={styles.emptyCartSub}>Scan or search items to add</Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <View style={styles.paymentRow}>
          {['cash', 'card', 'mobile'].map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === method && styles.paymentBtnTextActive]}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, (cart.length === 0 || loading) && styles.btnDisabled]}
          onPress={handleCheckout}
          disabled={cart.length === 0 || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.checkoutBtnText}>Charge ${total.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  headerUser: { fontSize: 14, color: colors.textSecondary },
  actionRow: { flexDirection: 'row', padding: 12, gap: 8 },
  scanBtn: {
    flex: 1, padding: 14, backgroundColor: colors.primary, borderRadius: 8, alignItems: 'center',
  },
  searchToggle: {
    padding: 14, backgroundColor: colors.surfaceLight, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  scanBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  searchContainer: {
    padding: 12, backgroundColor: colors.surface, marginHorizontal: 12, borderRadius: 8,
    maxHeight: 300, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    padding: 12, backgroundColor: colors.surfaceLight, borderRadius: 8, color: colors.text, fontSize: 16,
  },
  searchResults: { marginTop: 8 },
  searchResult: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchResultName: { color: colors.text, fontSize: 16 },
  searchResultDetail: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  addIcon: { color: colors.primaryLight, fontSize: 24, fontWeight: 'bold' },
  cartList: { flex: 1, paddingHorizontal: 12 },
  cartItem: {
    padding: 12, marginVertical: 4, backgroundColor: colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  cartItemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cartItemName: { color: colors.text, fontSize: 16, flex: 1 },
  cartItemPrice: { color: colors.text, fontSize: 16, fontWeight: '600' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
  quantity: { color: colors.text, fontSize: 18, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  removeBtn: { marginLeft: 8, padding: 6 },
  removeBtnText: { color: colors.error, fontSize: 18 },
  emptyCart: { alignItems: 'center', padding: 48 },
  emptyCartText: { color: colors.textSecondary, fontSize: 20 },
  emptyCartSub: { color: colors.textMuted, fontSize: 14, marginTop: 8 },
  footer: {
    padding: 16, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  paymentBtn: {
    flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.surfaceLight, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  paymentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  paymentBtnTextActive: { color: colors.white },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { color: colors.textSecondary, fontSize: 18 },
  totalAmount: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
  checkoutBtn: {
    padding: 16, backgroundColor: colors.success, borderRadius: 8, alignItems: 'center',
  },
  checkoutBtnText: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  btnDisabled: { opacity: 0.5 },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, Image,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme';

export default function CashierScreen({ user }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const data = await api.getSales();
      setSales(data);
    } catch (_) {}
    setLoading(false);
  };

  const viewSaleDetails = async (saleId) => {
    try {
      const data = await api.getSale(saleId);
      setSelectedSale(data);
    } catch (_) {}
  };

  const renderSale = ({ item }) => (
    <TouchableOpacity style={styles.saleCard} onPress={() => viewSaleDetails(item.id)}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleId}>#{item.id.slice(0, 8)}</Text>
        <Text style={styles.saleAmount}>${item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.saleDetail}>
        <Text style={styles.saleMeta}>
          {item.payment_method.toUpperCase()} | {new Date(item.created_at).toLocaleString()}
        </Text>
        <Text style={[styles.saleStatus, { color: item.status === 'completed' ? colors.success : colors.warning }]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (selectedSale) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedSale(null)}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sale #{selectedSale.id.slice(0, 8)}</Text>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailValue}>${selectedSale.total.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>{selectedSale.payment_method}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{new Date(selectedSale.created_at).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        {selectedSale.items?.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemMeta}>
                ${item.price.toFixed(2)} x {item.quantity}
              </Text>
            </View>
            <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Cashier</Text>
        </View>
        <Text style={styles.headerUser}>{user?.username}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadSales}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id}
          renderItem={renderSale}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sales yet</Text>
          }
        />
      )}
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
  headerUser: { color: colors.textSecondary, fontSize: 14 },
  backBtn: { color: colors.primaryLight, fontSize: 16, marginRight: 12 },
  actions: { padding: 12, flexDirection: 'row' },
  refreshBtn: {
    padding: 10, paddingHorizontal: 16, backgroundColor: colors.surfaceLight, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  refreshBtnText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 12 },
  saleCard: {
    padding: 14, marginVertical: 4, backgroundColor: colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleId: { color: colors.primaryLight, fontSize: 16, fontWeight: '600' },
  saleAmount: { color: colors.success, fontSize: 20, fontWeight: 'bold' },
  saleDetail: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  saleMeta: { color: colors.textMuted, fontSize: 12 },
  saleStatus: { fontSize: 12, fontWeight: '600' },
  detailCard: {
    margin: 12, padding: 16, backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailLabel: { color: colors.textSecondary, fontSize: 14 },
  detailValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600', padding: 12, paddingBottom: 4 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, marginHorizontal: 12, marginVertical: 2,
    backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  itemName: { color: colors.text, fontSize: 15 },
  itemMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  itemSubtotal: { color: colors.success, fontSize: 16, fontWeight: '600' },
  loadingText: { color: colors.textSecondary, textAlign: 'center', padding: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center', padding: 48 },
});

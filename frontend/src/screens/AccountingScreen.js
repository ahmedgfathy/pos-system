import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform, Alert,
} from 'react-native';
import api from '../services/api';
import { colors } from '../theme';
import SellItLogo from '../components/SellItLogo';

export default function AccountingScreen({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, summaryData] = await Promise.all([
        api.getAccountingEntries(),
        api.getAccountingSummary(),
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
    } catch (err) {
      console.warn('Failed to load accounting data:', err.message);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of Sell-It?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'revenue': return colors.success;
      case 'expense': return colors.error;
      case 'asset': return colors.primaryLight;
      case 'liability': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const renderEntry = ({ item }) => (
    <View style={styles.entry}>
      <View style={styles.entryHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '22' }]}>
          <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.entryAmount}>${item.amount.toFixed(2)}</Text>
      </View>
      <Text style={styles.entryDescription}>{item.description}</Text>
      <Text style={styles.entryDate}>{new Date(item.created_at).toLocaleString()}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const totalRevenue = summary?.byType?.find(t => t.type === 'revenue')?.total || 0;
  const totalAssets = summary?.byType?.find(t => t.type === 'asset')?.total || 0;
  const totalExpenses = summary?.byType?.find(t => t.type === 'expense')?.total || 0;
  const totalSales = summary?.totalSales || 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SellItLogo size={32} />
          <Text style={styles.headerTitle}>Accounting</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'summary' && styles.tabActive]}
          onPress={() => setTab('summary')}
        >
          <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'entries' && styles.tabActive]}
          onPress={() => setTab('entries')}
        >
          <Text style={[styles.tabText, tab === 'entries' && styles.tabTextActive]}>Entries</Text>
        </TouchableOpacity>
      </View>

      {tab === 'summary' ? (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Sales</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>${totalSales.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Revenue</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>${totalRevenue.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Assets (Inventory)</Text>
            <Text style={[styles.summaryValue, { color: colors.primaryLight }]}>${totalAssets.toFixed(2)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Cost of Goods Sold</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>${totalExpenses.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardTotal]}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, { color: (totalRevenue - totalExpenses) >= 0 ? colors.success : colors.error }]}>
              ${(totalRevenue - totalExpenses).toFixed(2)}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEntry}
          style={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No accounting entries</Text>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.primaryLight },
  logoutBtn: { padding: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  logoutBtnText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 8, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.white },
  summaryContainer: { padding: 12, gap: 8 },
  summaryCard: {
    padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  summaryCardTotal: { borderWidth: 1, borderColor: colors.warning },
  summaryLabel: { color: colors.textSecondary, fontSize: 14 },
  summaryValue: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  list: { flex: 1, paddingHorizontal: 12 },
  entry: {
    padding: 14, marginVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  typeText: { fontSize: 11, fontWeight: 'bold' },
  entryAmount: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  entryDescription: { color: colors.text, fontSize: 14, marginTop: 4 },
  entryDate: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  loadingText: { color: colors.textSecondary, textAlign: 'center', padding: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center', padding: 48 },
});

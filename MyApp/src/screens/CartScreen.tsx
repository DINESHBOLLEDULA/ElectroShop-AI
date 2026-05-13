import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';

export default function CartScreen({ navigation }: any) {
  const { items, removeFromCart, updateQuantity, clearCart, getTotal, getItemCount } = useCart();
  const { colors } = useTheme();

  const shipping = getTotal() > 99 ? 0 : 9.99;
  const tax = getTotal() * 0.08;
  const finalTotal = getTotal() + shipping + tax;

  const handleCheckout = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Order Placed! 🎉',
      `Your order of $${finalTotal.toFixed(2)} has been placed successfully!\n\n${getItemCount()} items will be delivered in 3-5 business days.`,
      [{ text: 'Great!', onPress: () => clearCart() }]
    );
  };

  const renderCartItem = ({ item }: any) => (
    <View style={[styles.cartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: item.image }} style={[styles.itemImage, { backgroundColor: colors.bgSecondary }]} />
      <View style={styles.itemInfo}>
        <Text style={[styles.itemBrand, { color: colors.textMuted }]}>{item.brand}</Text>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>${item.price}</Text>
        <View style={styles.quantityRow}>
          <View style={[styles.quantityControls, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
              <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={16}
                color={item.quantity === 1 ? colors.error : colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.itemTotal, { color: colors.primary }]}>${(item.price * item.quantity).toFixed(2)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => {
        Alert.alert('Remove Item', `Remove ${item.name} from cart?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(item.id) },
        ]);
      }}>
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  if (items.length === 0) {
    return (
      <GradientBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Cart</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="cart-outline" size={64} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Looks like you haven't added anything to your cart yet</Text>
          <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="bag-handle-outline" size={18} color="#fff" />
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Cart</Text>
        <TouchableOpacity style={[styles.clearBtn, { backgroundColor: colors.errorBg, borderColor: colors.error + '30' }]} onPress={() => {
          Alert.alert('Clear Cart', 'Remove all items from your cart?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear All', style: 'destructive', onPress: clearCart },
          ]);
        }}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.itemCount, { color: colors.textSecondary }]}>{getItemCount()} items in cart</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCartItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.promoRow, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '25' }]}>
          <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
          <Text style={[styles.promoText, { color: colors.primary }]}>Apply Promo Code</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>${getTotal().toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
          <Text style={[styles.summaryValue, { color: colors.text }, shipping === 0 && { color: colors.success, fontWeight: '700' }]}>
            {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax (8%)</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>${tax.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryRow}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>${finalTotal.toFixed(2)}</Text>
        </View>
        {shipping === 0 && (
          <View style={[styles.freeBanner, { backgroundColor: colors.successBg, borderColor: colors.success + '25' }]}>
            <Ionicons name="car" size={14} color={colors.success} />
            <Text style={[styles.freeShipText, { color: colors.success }]}>Free shipping on orders over $99!</Text>
          </View>
        )}
        <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={handleCheckout}>
          <Ionicons name="lock-closed" size={18} color="#fff" />
          <Text style={styles.checkoutText}>Checkout — ${finalTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: 13, fontWeight: '600' },
  itemCount: { fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
  cartCard: {
    flexDirection: 'row', borderRadius: 16,
    padding: 12, marginBottom: 10, position: 'relative',
    borderWidth: 1,
  },
  itemImage: {
    width: 90, height: 90, borderRadius: 12,
    resizeMode: 'contain',
  },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  itemBrand: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemName: { fontSize: 14, fontWeight: '700', marginTop: 2, paddingRight: 20 },
  itemPrice: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  quantityControls: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1,
  },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  qtyText: { fontSize: 15, fontWeight: '700', paddingHorizontal: 12 },
  itemTotal: { fontSize: 16, fontWeight: '800' },
  removeBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginTop: 24,
  },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  summaryCard: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100,
    borderTopWidth: 1,
  },
  promoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12,
    borderWidth: 1,
  },
  promoText: { flex: 1, fontSize: 14, fontWeight: '600' },
  summaryDivider: { height: 1, marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  freeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, borderRadius: 8, marginTop: 4, marginBottom: 8,
    borderWidth: 1,
  },
  freeShipText: { fontSize: 12, fontWeight: '600' },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 16, marginTop: 8,
  },
  checkoutText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
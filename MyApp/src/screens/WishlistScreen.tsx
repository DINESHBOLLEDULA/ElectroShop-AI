import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';

export default function WishlistScreen({ navigation }: any) {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart, isInCart } = useCart();
  const { colors } = useTheme();

  const handleMoveToCart = (item: any) => {
    addToCart(item);
    removeFromWishlist(item.id);
  };

  const renderItem = ({ item }: any) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: item.image }} style={[styles.image, { backgroundColor: colors.bgSecondary }]} />
      <View style={styles.info}>
        <Text style={[styles.brand, { color: colors.textMuted }]}>{item.brand}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={[styles.ratingVal, { color: colors.text }]}>{item.rating}</Text>
          <Text style={[styles.reviews, { color: colors.textMuted }]}>({item.reviews?.toLocaleString()})</Text>
        </View>
        <Text style={[styles.price, { color: colors.primary }]}>${item.price}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.moveBtn, { backgroundColor: colors.primary }, isInCart(item.id) && { backgroundColor: colors.success }]}
            onPress={() => handleMoveToCart(item)}
            disabled={isInCart(item.id)}
          >
            <Ionicons
              name={isInCart(item.id) ? 'checkmark-circle' : 'cart-outline'}
              size={15} color="#fff"
            />
            <Text style={styles.moveBtnText}>
              {isInCart(item.id) ? 'In Cart' : 'Move to Cart'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.removeBtn, { backgroundColor: colors.errorBg, borderColor: colors.error + '25' }]} onPress={() => {
            Alert.alert('Remove', `Remove ${item.name} from wishlist?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => removeFromWishlist(item.id) },
            ]);
          }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <GradientBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Wishlist</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your wishlist is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Save items you love to revisit them later</Text>
          <TouchableOpacity style={[styles.browseBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="compass-outline" size={18} color="#fff" />
            <Text style={styles.browseBtnText}>Browse Products</Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Wishlist</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{items.length}</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1,
  },
  countText: { fontSize: 13, fontWeight: '700' },
  card: {
    flexDirection: 'row', borderRadius: 16,
    padding: 12, marginBottom: 10,
    borderWidth: 1,
  },
  image: {
    width: 100, height: 100, borderRadius: 12,
    resizeMode: 'contain',
  },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  brand: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  name: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingVal: { fontSize: 12, fontWeight: '700' },
  reviews: { fontSize: 11 },
  price: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  moveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 8, gap: 5,
  },
  moveBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  removeBtn: {
    width: 40, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, marginTop: 24,
  },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  FlatList, Image, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import { Categorylist } from '../utils/CategoryList';
import GradientBackground from '../components/GradientBackground';
import { getProducts } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Map quick-cat names to the matching Categorylist entry (for navigation)


export default function HomeScreen({ navigation }: any) {
  const { colors, isDark, toggleTheme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const { addToCart, isInCart, getItemCount } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const BANNERS = [
  {
    id: 1,
    title: 'Next-Gen Smartphones',
    subtitle: 'iPhone, Samsung, Pixel & more',
    buttonText: 'Explore',
    color: isDark ? '#1E3A8A' : '#2563EB',
    icon: 'phone-portrait',
    category: 'smartphones',
  },
  {
    id: 2,
    title: 'Power Meets Performance',
    subtitle: 'Top laptops for coding & gaming',
    buttonText: 'Shop Laptops',
    color: isDark ? '#4C1D95' : '#7C3AED',
    icon: 'laptop',
    category: 'laptops',
  },
  {
    id: 3,
    title: 'Immersive Audio',
    subtitle: 'Headphones, earbuds & speakers',
    buttonText: 'Discover',
    color: isDark ? '#9A3412' : '#F97316',
    icon: 'headset',
    category: 'audio',
  },
];

  useEffect(() => {
  const loadProducts =
    async () => {
      try {
        const data =
          await getProducts();

        setProducts(data);
      } catch (error) {
        console.log(
          'Error loading products',
          error
        );
      }
    };

  loadProducts();
}, []);

  // Auto-scroll banners
  useEffect(() => {
    const interval = setInterval(() => {
      const next = (activeSlide + 1) % BANNERS.length;
      bannerRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveSlide(next);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeSlide]);

  // Trending = high rating + high reviews + in stock
const trending = [...products]
  .filter(p => p.inStock !== false)
  .sort(
    (a, b) =>
      (b.rating * b.reviews) -
      (a.rating * a.reviews)
  )
  .slice(0, 10);

// Best Deals = best rating-to-price value
const deals = [...products]
  .filter(p => p.inStock !== false)
  .sort(
    (a, b) =>
      (b.rating / b.price) -
      (a.rating / a.price)
  )
  .slice(0, 10);

// Top Rated = highest rated first, reviews as tie breaker
const topRated = [...products]
  .filter(p => p.inStock !== false)
  .sort((a, b) => {
    if (b.rating === a.rating) {
      return b.reviews - a.reviews;
    }
    return b.rating - a.rating;
  })
  .slice(0, 10);

  const filteredProducts = searchQuery.length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const navigateToProduct = (product: any) => {
    navigation.navigate('ProductDetail', { product });
  };

  const navigateToCategory = (categoryKey: string) => {
    const category = Categorylist.find(c => c.category === categoryKey);
    if (category) {
      navigation.navigate('CategoryProducts', { category });
    }
  };

  const navigateBanner = (categoryKey: string) => {
  const category = Categorylist.find(
    c => c.category === categoryKey
  );

  if (category) {
    navigation.navigate(
      'CategoryProducts',
      { category }
    );
  }
};

  const renderProductCard = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={() => navigateToProduct(item)}
    >
      <View style={[styles.cardImageWrap, { backgroundColor: colors.bgSecondary }]}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <TouchableOpacity style={[styles.heartBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => toggleWishlist(item)}>
          <Ionicons
            name={isInWishlist(item.id) ? 'heart' : 'heart-outline'}
            size={16}
            color={isInWishlist(item.id) ? colors.error : colors.textMuted}
          />
        </TouchableOpacity>
        {!item.inStock && (
          <View style={[styles.outOfStockBadge, { backgroundColor: colors.errorBg, borderColor: colors.error + '30' }]}>
            <Text style={[styles.outOfStockText, { color: colors.error }]}>Out of Stock</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardBrand, { color: colors.textMuted }]}>{item.brand}</Text>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.cardRow}>
          <Text style={[styles.cardPrice, { color: colors.primary }]}>${item.price}</Text>
          <View style={[styles.ratingBadge, { backgroundColor: colors.starBg }]}>
            <Ionicons name="star" size={10} color={colors.star} />
            <Text style={[styles.ratingText, { color: colors.star }]}>{item.rating}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }, isInCart(item.id) && { backgroundColor: colors.success }]}
          onPress={() => addToCart(item)}
          disabled={!item.inStock}
        >
          <Ionicons name={isInCart(item.id) ? 'checkmark' : 'add'} size={14} color="#fff" />
          <Text style={styles.addBtnText}>
            {isInCart(item.id) ? 'In Cart' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

const renderBanner = ({ item }: any) => (
  <TouchableOpacity
    activeOpacity={0.9}
    onPress={() =>
    navigateBanner(item.category)
  }
    style={[
      styles.bannerCard,
      {
        backgroundColor: item.color,
      },
    ]}
  >
    <View style={styles.bannerContent}>
      <View style={styles.bannerBadge}>
        <Text style={styles.bannerBadgeText}>TRENDING</Text>
      </View>

      <Text style={styles.bannerTitle}
           numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.bannerSubtitle}
       numberOfLines={2}>
        {item.subtitle}
      </Text>

      <TouchableOpacity style={styles.bannerBtn}
              onPress={() =>
                navigateBanner(item.category)
              }
            >
        <Text style={styles.bannerBtnText}>
          {item.buttonText}
        </Text>

        <Ionicons
          name="arrow-forward"
          size={16}
          color="#fff"
        />
      </TouchableOpacity>
    </View>

    <View style={styles.bannerIconWrap}>
      <Ionicons
        name={item.icon as any}
        size={55}
        color="rgba(255,255,255,0.16)"
      />
    </View>
  </TouchableOpacity>
);

const renderSection = (
  title: string,
  data: any[],
  icon: string
) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Ionicons
          name={icon as any}
          size={18}
          color={colors.primary}
        />
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          {title}
        </Text>
      </View>

      <TouchableOpacity
  onPress={() =>
    navigation.navigate('SectionProducts', {
      products: data,
      title,
    })
  }
>
        <Text
          style={[
            styles.seeAll,
            { color: colors.primary },
          ]}
        >
          See All
        </Text>
      </TouchableOpacity>
    </View>

    <FlatList
      data={data}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) =>
        `${title}-${item.id}`
      }
      contentContainerStyle={{
        paddingHorizontal: 16,
      }}
      renderItem={renderProductCard}
    />
  </View>
);

  return (
    <GradientBackground>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Hello there 👋</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ElectroShop</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: isDark ? colors.card : colors.primaryGlow, borderColor: colors.border }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? colors.warning : colors.primaryDark}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Cart')}>
            <Ionicons name="cart-outline" size={24} color={colors.text} />
            {getItemCount() > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.bg }]}>
                <Text style={styles.badgeText}>{getItemCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Wishlist')}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products, brands..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 ? (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => `search-${item.id}`}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderProductCard}
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptySearchText, { color: colors.textMuted }]}>No products found</Text>
            </View>
          }
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Banners */}
          <View style={styles.bannerWrap}>
            <FlatList
              ref={bannerRef}
              data={BANNERS}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `banner-${item.id}`}
              renderItem={renderBanner}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
                setActiveSlide(idx);
              }}
            />
            <View style={styles.dotsWrap}>
              {BANNERS.map((_, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: colors.border }, activeSlide === i && { backgroundColor: colors.primary, width: 22 }]} />
              ))}
            </View>
          </View>

          {/* Categories */}
<View style={styles.categorySection}>
  <Text style={[styles.categoryTitle, { color: colors.text }]}>
    Categories
  </Text>

  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.categoriesScroll}
  >
    {Categorylist.map((cat) => (
      <TouchableOpacity
        key={cat.id}
        activeOpacity={0.85}
        style={styles.categoryCard}
        onPress={() => navigateToCategory(cat.category)}
      >
        <View
          style={[
            styles.categoryImageWrapper,
            {
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.06)'
                : '#FFFFFF',
              borderColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : '#ECECEC',
            },
          ]}
        >
          <Image
            source={cat.image}
            style={styles.categoryImage}
          />
        </View>

        <Text
          style={[
            styles.categoryName,
            { color: colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {cat.name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>

          {renderSection('🔥 Trending Now', trending, 'trending-up')}
          {renderSection('💰 Best Deals', deals, 'pricetag')}
          {renderSection('⭐ Top Rated', topRated, 'star')}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { position: 'relative', padding: 4 },
  themeToggle: {
    width: 36, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute', top: -2, right: -4,
    borderRadius: 10,
    minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 14, paddingHorizontal: 14, height: 48,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  bannerWrap: {
  marginBottom: 22,
},

bannerCard: {
  width: width - 36,
  marginLeft: 18,
  borderRadius: 26,
  paddingHorizontal: 22,
  paddingVertical: 18,
  flexDirection: 'row',
  alignItems: 'center',
  height: 138,
  overflow: 'hidden',

  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: {
    width: 0,
    height: 8,
  },

  elevation: 8,
},

bannerContent: {
  flex: 1,
  justifyContent: 'center',
},

bannerBadge: {
  backgroundColor: 'rgba(255,255,255,0.16)',
  alignSelf: 'flex-start',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
  marginBottom: 10,
},

bannerBadgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 0.6,
},

bannerTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#fff',
  lineHeight: 22,
  marginBottom: 3,
},

bannerSubtitle: {
  fontSize: 11,
  color: 'rgba(255,255,255,0.82)',
  marginBottom: 10,
  lineHeight: 15,
},

bannerBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 8,
},

bannerBtnText: {
  color: '#fff',
  fontWeight: '700',
  fontSize: 12,
  marginRight: 5,
},

bannerIconWrap: {
  width: 58,
  justifyContent: 'center',
  alignItems: 'center',
},
  dotsWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 4 },
  quickCats: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, marginBottom: 24,
  },
 categorySection: {
  marginBottom: 30,
},

categoryTitle: {
  fontSize: 22,
  fontWeight: '700',
  marginBottom: 18,
  paddingHorizontal: 20,
},

categoriesScroll: {
  paddingHorizontal: 20,
  paddingRight: 8,
},

categoryCard: {
  alignItems: 'center',
  marginRight: 18,
  width: 84,
},

categoryImageWrapper: {
  width: 82,
  height: 82,
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',
  borderWidth: 1,

  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: {
    width: 0,
    height: 8,
  },

  elevation: 8,
},

categoryImage: {
  width: '78%',
  height: '78%',
  resizeMode: 'contain',
},

categoryName: {
  marginTop: 10,
  fontSize: 12,
  fontWeight: '600',
  textAlign: 'center',
},
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  productCard: {
    width: CARD_WIDTH, borderRadius: 16,
    marginRight: 12, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1,
  },
  cardImageWrap: {
    position: 'relative',
    padding: 12, alignItems: 'center',
  },
  cardImage: { width: '100%', height: 120, resizeMode: 'contain' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 20, padding: 6,
    borderWidth: 1,
  },
  outOfStockBadge: {
    position: 'absolute', bottom: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1,
  },
  outOfStockText: { fontSize: 9, fontWeight: '700' },
  cardInfo: { padding: 10 },
  cardBrand: {
    fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardName: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 6,
  },
  cardPrice: { fontSize: 16, fontWeight: '800' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  ratingText: { fontSize: 11, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 8, marginTop: 8, gap: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptySearch: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptySearchText: { fontSize: 15, marginTop: 10 },
});
import React, { useEffect,useLayoutEffect,useState,} from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Image, Dimensions,Modal,ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ProductsScreen({ route, navigation }: any) {
  const { category } = route.params;
  const {colors,isDark,toggleTheme} = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const {addToCart,isInCart,items,updateQuantity,removeFromCart} = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [showFilters, setShowFilters] =useState(false);
  const [sortBy, setSortBy] =useState('default');
  const [selectedBrands,setSelectedBrands] =useState<string[]>([]);
  const [selectedTags,setSelectedTags] =useState<string[]>([]);
  const [inStockOnly,setInStockOnly] =useState(false);
  const [priceRange,setPriceRange] =useState({min: 0,max: 10000,});


  useEffect(() => {
    
    fetch(`http://192.168.29.222:3000/products?categoryId=${category.id}`)
      .then(res => res.json())
      .then(data => setProducts(data))
      .finally(() => setLoading(false));
  }, [colors,
  isDark,
  toggleTheme,
  category.name,]);

  if (loading) {
    return (
      <GradientBackground>
        <View style={[styles.loadingWrap, { backgroundColor: 'transparent' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading products...</Text>
        </View>
      </GradientBackground>
    );
  }

  const filteredProducts =
  [...products]
    .filter(product => {
      const brandMatch =
        selectedBrands
          .length === 0 ||
        selectedBrands.includes(
          product.brand
        );

      const tagMatch =
        selectedTags
          .length === 0 ||
        product.tags?.some(
          tag =>
            selectedTags.includes(
              tag
            )
        );

      const stockMatch =
        !inStockOnly ||
        product.inStock;

      const priceMatch =
        product.price >=
          priceRange.min &&
        product.price <=
          priceRange.max;

      return (
        brandMatch &&
        tagMatch &&
        stockMatch &&
        priceMatch
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'low-high':
          return (
            a.price -
            b.price
          );

        case 'high-low':
          return (
            b.price -
            a.price
          );

        case 'rating':
          return (
            b.rating -
            a.rating
          );

        case 'reviews':
          return (
            b.reviews -
            a.reviews
          );

        default:
          return 0;
      }
    });


    const brands = [
  ...new Set(
    products.map(
      p => p.brand
    )
  ),
];

const tags = [
  ...new Set(
    products.flatMap(
      p => p.tags || []
    )
  ),
];

const getCartQuantity = (
  id: number
) => {
  return (
    items.find(
      item =>
        item.id === id
    )?.quantity || 0
  );
};
  const renderProduct = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.bgSecondary }]}>
        <Image source={{ uri: item.image }} style={styles.image} />
        <TouchableOpacity style={[styles.heartBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => toggleWishlist(item)}>
          <Ionicons
            name={isInWishlist(item.id) ? 'heart' : 'heart-outline'}
            size={16}
            color={isInWishlist(item.id) ? colors.error : colors.textMuted}
          />
        </TouchableOpacity>
        {!item.inStock && (
          <View style={[styles.outBadge, { backgroundColor: colors.errorBg, borderColor: colors.error + '30' }]}>
            <Text style={[styles.outBadgeText, { color: colors.error }]}>Out of Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.brand, { color: colors.textMuted }]}>{item.brand}</Text>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={[styles.ratingVal, { color: colors.text }]}>{item.rating}</Text>
          <Text style={[styles.reviews, { color: colors.textMuted }]}>({item.reviews.toLocaleString()})</Text>
        </View>

        <Text style={[styles.price, { color: colors.primary }]}>${item.price}</Text>

        <View style={styles.tagsRow}>
          {item.tags?.slice(0, 2).map((tag: string, i: number) => (
            <View key={i} style={[styles.tag, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {!item.inStock ? (
  <View
    style={[
      styles.unavailableBtn,
      {
        backgroundColor:
          colors.textMuted,
      },
    ]}
  >
    <Text style={styles.addBtnText}>
      Unavailable
    </Text>
  </View>
) : isInCart(item.id) ? (
  <View
    style={[
      styles.qtyContainer,
      {
        backgroundColor:
          colors.bgSecondary,
        borderColor:
          colors.border,
      },
    ]}
  >
    {/* Remove / Trash */}
    <TouchableOpacity
      style={[
        styles.qtyBtn,
        getCartQuantity(
          item.id
        ) <= 1 && {
          backgroundColor:
            'rgba(239,68,68,0.12)',
        },
      ]}
      onPress={() => {
        const qty =
          getCartQuantity(
            item.id
          );

        if (qty <= 1) {
          removeFromCart(
            item.id
          );
        } else {
          updateQuantity(
            item.id,
            qty - 1
          );
        }
      }}
    >
      <Ionicons
        name={
          getCartQuantity(
            item.id
          ) <= 1
            ? 'trash-outline'
            : 'remove'
        }
        size={18}
        color={
          getCartQuantity(
            item.id
          ) <= 1
            ? '#EF4444'
            : colors.text
        }
      />
    </TouchableOpacity>

    {/* Quantity */}
    <Text
      style={[
        styles.qtyText,
        {
          color:
            colors.text,
        },
      ]}
    >
      {getCartQuantity(
        item.id
      )}
    </Text>

    {/* Add */}
    <TouchableOpacity
      style={[
        styles.qtyBtn,
        {
          backgroundColor:
            colors.primary,
        },
      ]}
      onPress={() =>
        addToCart(item)
      }
    >
      <Ionicons
        name="add"
        size={18}
        color="#fff"
      />
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity
    style={[
      styles.addBtn,
      {
        backgroundColor:
          colors.primary,
      },
    ]}
    onPress={() =>
      addToCart(item)
    }
  >
    <Ionicons
      name="cart-outline"
      size={15}
      color="#fff"
    />
    <Text style={styles.addBtnText}>
      Add to Cart
    </Text>
  </TouchableOpacity>
)}
      </View>
    </TouchableOpacity>
  );

 return (
  <GradientBackground>
    <SafeAreaView
        edges={['top']}
        style={styles.container}>
      <View style={styles.customHeader}>
  <TouchableOpacity
    style={[
      styles.backBtn,
      {
        backgroundColor:
          colors.card,
        borderColor:
          colors.border,
      },
    ]}
    onPress={() =>
      navigation.goBack()
    }
    activeOpacity={0.85}
  >
    <Ionicons
      name="chevron-back"
      size={22}
      color={colors.text}
    />
  </TouchableOpacity>

  <Text
    style={[
      styles.headerTitle,
      {
        color: colors.text,
      },
    ]}
  >
    {category.name}
  </Text>

  <TouchableOpacity
    activeOpacity={0.9}
    onPress={toggleTheme}
    style={[
      styles.switchTrack,
      {
        backgroundColor:
          isDark
            ? '#2F3645'
            : '#7CA6FF',
      },
    ]}
  >
    <View
      style={[
        styles.switchThumb,
        {
          transform: [
            {
              translateX:
                isDark
                  ? 28
                  : 1,
            },
          ],
        },
      ]}
    >
      <Ionicons
        name={
          isDark
            ? 'moon'
            : 'sunny'
        }
        size={16}
        color={
          isDark
            ? '#6366F1'
            : '#FDB813'
        }
      />
    </View>
  </TouchableOpacity>
</View>
      

      {/* Products */}
      <FlatList
        data={filteredProducts}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent:
            'space-between',
          paddingHorizontal:
            16,
        }}
        keyExtractor={(
          item: any
        ) =>
          item.id.toString()
        }
        renderItem={
          renderProduct
        }
        ListHeaderComponent={
  <View style={styles.countBar}>
    <Text
      style={[
        styles.countText,
        {
          color:
            colors.textSecondary,
        },
      ]}
    >
      {products.length} Products
    </Text>

    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        setShowFilters(true)
      }
    style={[
    styles.filterBtn,
        {
          backgroundColor:
            isDark
              ? 'rgba(255,255,255,0.06)'
              : '#EEF4FF',
          borderColor:
            isDark
              ? 'rgba(255,255,255,0.08)'
              : '#D9E6FF',
        },
      ]}
    >
      <Ionicons
        name="options-outline"
        size={16}
        color={colors.primary}
      />

      <Text
        style={[
          styles.filterText,
          {
            color:
              colors.primary,
          },
        ]}
      >
        Filter
      </Text>
    </TouchableOpacity>
  </View>
}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={
          false
        }
      />
    <Modal
  visible={showFilters}
  transparent
  animationType="slide"
>
  <View style={styles.modalBg}>
    <View
      style={[
        styles.filterSheet,
        {
          backgroundColor:
            colors.card,
        },
      ]}
    >
      <View
        style={styles.dragBar}
      />

      <View
        style={
          styles.sheetHeader
        }
      >
        <Text
          style={[
            styles.filterTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Filters
        </Text>

        <TouchableOpacity
          onPress={() =>
            setShowFilters(
              false
            )
          }
        >
          <Ionicons
            name="close"
            size={24}
            color={
              colors.text
            }
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* Sort */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Sort By
        </Text>

        <View
          style={styles.chips}
        >
          {[
            [
              'Top Rated',
              'rating',
            ],
            [
              'Price ↑',
              'low-high',
            ],
            [
              'Price ↓',
              'high-low',
            ],
            [
              'Most Reviewed',
              'reviews',
            ],
          ].map(
            ([label, value]) => (
              <TouchableOpacity
                key={value}
                onPress={() =>
                  setSortBy(
                    value
                  )
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      sortBy ===
                      value
                        ? colors.primary
                        : colors.bgSecondary,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      sortBy ===
                      value
                        ? '#fff'
                        : colors.text,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Brand */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Brand
        </Text>

        <View
          style={styles.chips}
        >
          {brands.map(
            brand => (
              <TouchableOpacity
                key={brand}
                onPress={() =>
                  setSelectedBrands(
                    prev =>
                      prev.includes(
                        brand
                      )
                        ? prev.filter(
                            b =>
                              b !==
                              brand
                          )
                        : [
                            ...prev,
                            brand,
                          ]
                  )
                }
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      selectedBrands.includes(
                        brand
                      )
                        ? colors.primary
                        : colors.bgSecondary,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedBrands.includes(
                        brand
                      )
                        ? '#fff'
                        : colors.text,
                  }}
                >
                  {brand}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Tags */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Tags
        </Text>

        <View
          style={styles.chips}
        >
          {tags.map(tag => (
            <TouchableOpacity
              key={tag}
              onPress={() =>
                setSelectedTags(
                  prev =>
                    prev.includes(
                      tag
                    )
                      ? prev.filter(
                          t =>
                            t !==
                            tag
                        )
                      : [
                          ...prev,
                          tag,
                        ]
                )
              }
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedTags.includes(
                      tag
                    )
                      ? colors.primary
                      : colors.bgSecondary,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    selectedTags.includes(
                      tag
                    )
                      ? '#fff'
                      : colors.text,
                }}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.applyBtn,
            {
              backgroundColor:
                colors.primary,
            },
          ]}
          onPress={() =>
            setShowFilters(
              false
            )
          }
        >
          <Text
            style={
              styles.applyText
            }
          >
            Apply Filters
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>
      
    </SafeAreaView>
  </GradientBackground>
);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  countBar: {
  flexDirection: 'row',
  justifyContent:
    'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 14,
},

countText: {
  fontSize: 15,
  fontWeight: '600',
},

filterBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderWidth: 1,
},

filterText: {
  fontSize: 13,
  fontWeight: '700',
  marginLeft: 6,
},
  card: {
    width: CARD_WIDTH, borderRadius: 16,
    marginBottom: 14, overflow: 'hidden',
    borderWidth: 1,
  },
  imageWrap: {
    position: 'relative',
    padding: 16, alignItems: 'center',
  },
  image: { width: '100%', height: 130, resizeMode: 'contain' },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 20, padding: 6,
    borderWidth: 1,
  },
  outBadge: {
    position: 'absolute', bottom: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1,
  },
  outBadgeText: { fontSize: 9, fontWeight: '700' },
  info: { padding: 10 },
  brand: {
    fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  name: { fontSize: 13, fontWeight: '700', marginTop: 3, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingVal: { fontSize: 12, fontWeight: '700' },
  reviews: { fontSize: 11 },
  price: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1,
  },
  tagText: { fontSize: 9, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, paddingVertical: 9, marginTop: 8, gap: 5,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
topHeader: {
  flexDirection: 'row',
  justifyContent:
    'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  marginBottom: 8,
},

switchTrack: {
  width: 66,
  height: 36,
  borderRadius: 999,
  justifyContent: 'center',
  paddingHorizontal: 3,

  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 5,
},

switchThumb: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',

  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: {
    width: 0,
    height: 3,
  },

  elevation: 6,
},

customHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
  paddingHorizontal: 20,
  paddingTop: 8,
  paddingBottom: 12,
},

backBtn: {
  width: 42,
  height: 42,
  borderRadius: 14,
  justifyContent:
    'center',
  alignItems: 'center',
  borderWidth: 1,
},

headerTitle: {
  flex: 1,
  fontSize: 28,
  fontWeight: '800',
  marginLeft: 14,
  letterSpacing: -0.8,
},



option: {
  paddingVertical: 16,
},

modalBg: {
  flex: 1,
  justifyContent:
    'flex-end',
  backgroundColor:
    'rgba(0,0,0,0.35)',
},

filterSheet: {
  borderTopLeftRadius: 34,
  borderTopRightRadius: 34,
  padding: 24,
  maxHeight: '82%',
},

dragBar: {
  width: 48,
  height: 5,
  borderRadius: 99,
  backgroundColor:
    '#C7C7CC',
  alignSelf: 'center',
  marginBottom: 20,
},

sheetHeader: {
  flexDirection: 'row',
  justifyContent:
    'space-between',
  alignItems: 'center',
  marginBottom: 20,
},

filterTitle: {
  fontSize: 28,
  fontWeight: '800',
},

sectionTitle: {
  fontSize: 17,
  fontWeight: '700',
  marginTop: 18,
  marginBottom: 12,
},

chips: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

chip: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 999,
},

applyBtn: {
  marginTop: 28,
  borderRadius: 20,
  paddingVertical: 18,
  alignItems: 'center',
},

applyText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '800',
},

qtyContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
  borderRadius: 14,
  borderWidth: 1,
  padding: 4,
  marginTop: 8,
},

qtyBtn: {
  width: 34,
  height: 34,
  borderRadius: 10,
  justifyContent: 'center',
  alignItems: 'center',
},

qtyText: {
  fontSize: 16,
  fontWeight: '800',
  minWidth: 30,
  textAlign: 'center',
},

unavailableBtn: {
  borderRadius: 12,
  paddingVertical: 11,
  alignItems: 'center',
  marginTop: 8,
},

});
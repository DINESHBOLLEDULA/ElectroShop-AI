import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;
const BOTTOM_BAR_HEIGHT = 74;

// ─── Map spec keys → icon + tint color ───────────────────────────────────────
const SPEC_META: Record<string, { icon: string; tint: string; bg: string; label: string }> = {
  display:      { icon: 'tv-outline',              tint: '#60A5FA', bg: 'rgba(59,130,246,0.12)',  label: 'Display' },
  battery:      { icon: 'battery-charging-outline', tint: '#4ADE80', bg: 'rgba(34,197,94,0.12)',   label: 'Battery' },
  camera:       { icon: 'camera-outline',           tint: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'Camera' },
  chipset:      { icon: 'hardware-chip-outline',    tint: '#C084FC', bg: 'rgba(168,85,247,0.12)',  label: 'Chipset' },
  ram:          { icon: 'layers-outline',           tint: '#2DD4BF', bg: 'rgba(20,184,166,0.12)',  label: 'RAM' },
  storage:      { icon: 'server-outline',           tint: '#2DD4BF', bg: 'rgba(20,184,166,0.12)',  label: 'Storage' },
  os:           { icon: 'logo-android',             tint: '#86EFAC', bg: 'rgba(134,239,172,0.12)', label: 'OS' },
  weight:       { icon: 'barbell-outline',          tint: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: 'Weight' },
  connectivity: { icon: 'wifi-outline',             tint: '#F87171', bg: 'rgba(239,68,68,0.12)',   label: 'Connectivity' },
  ports:        { icon: 'git-merge-outline',        tint: '#F87171', bg: 'rgba(239,68,68,0.12)',   label: 'Ports' },
  // audio / headphone keys
  type:         { icon: 'headset-outline',          tint: '#60A5FA', bg: 'rgba(59,130,246,0.12)',  label: 'Type' },
  driver:       { icon: 'radio-outline',            tint: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'Driver' },
  anc:          { icon: 'ear-outline',              tint: '#C084FC', bg: 'rgba(168,85,247,0.12)',  label: 'ANC' },
  codec:        { icon: 'musical-notes-outline',    tint: '#4ADE80', bg: 'rgba(34,197,94,0.12)',   label: 'Codec' },
  charging:     { icon: 'flash-outline',            tint: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'Charging' },
  microphones:  { icon: 'mic-outline',              tint: '#F87171', bg: 'rgba(239,68,68,0.12)',   label: 'Microphones' },
  foldable:     { icon: 'layers-outline',           tint: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: 'Foldable' },
  waterproof:   { icon: 'water-outline',            tint: '#60A5FA', bg: 'rgba(59,130,246,0.12)',  label: 'Waterproof' },
};

// Fallback for unknown keys
const FALLBACK_META = { icon: 'ellipse-outline', tint: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: '' };

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return (value as string[]).join(' · ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// Combine ram + storage into one row if both present
function buildSpecRows(specs: Record<string, unknown>) {
  const entries = Object.entries(specs).filter(([k]) => k !== 'color');
  const rows: { key: string; value: unknown; merged?: boolean }[] = [];

  const hasRam = entries.some(([k]) => k === 'ram');
  const hasStorage = entries.some(([k]) => k === 'storage');
  let ramStorageDone = false;

  for (const [key, value] of entries) {
    if ((key === 'ram' || key === 'storage') && hasRam && hasStorage) {
      if (!ramStorageDone) {
        const ram = specs['ram'];
        const storage = specs['storage'];
        rows.push({ key: 'ram_storage', value: `${ram} RAM · ${storage}`, merged: true });
        ramStorageDone = true;
      }
      continue;
    }
    rows.push({ key, value });
  }
  return rows;
}

const MERGED_META = {
  ram_storage: { icon: 'layers-outline', tint: '#2DD4BF', bg: 'rgba(20,184,166,0.12)', label: 'RAM / Storage' },
};

export default function ProductDetailScreen({ route, navigation }: any) {
  const { product } = route.params;
  const { colors, isDark } = useTheme();
  const {
  items,
  addToCart,
  removeFromCart,
  updateQuantity,
  getItemQuantity,
  getItemCount,
} = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const insets = useSafeAreaInsets();

 const cartQuantity =
  getItemQuantity(product.id);

const inCart =
  cartQuantity > 0;

  const inWishlist = isInWishlist(product.id);

  const safeBottom =
  insets.bottom +
  TAB_BAR_HEIGHT +
  26;

const handleAddToCart = () => {
  if (!product.inStock) {
    Alert.alert(
      'Out of Stock',
      'This product is currently unavailable.'
    );
    return;
  }

  addToCart(product);
};

  const specRows = buildSpecRows(product.specs || {});

  // Derive icon color for icon buttons from theme
  const iconColor = colors.text;
  const mutedColor = colors.textMuted;

  return (
    <GradientBackground>
      <View style={styles.root}>

        {/* ══ HEADER ══ */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 4),
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: isDark
  ? 'rgba(255,255,255,0.08)'
  : 'rgba(255,255,255,0.22)'}]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={iconColor} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Product Details
          </Text>

          <TouchableOpacity
  style={[
    styles.iconBtn,
    { backgroundColor: colors.card },
  ]}
  onPress={() =>
    navigation.navigate('CartScreen')
  }
  hitSlop={{
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
  }}
>
  {getItemCount() > 0 && (
    <View style={styles.cartBadge}>
      <Text style={styles.cartBadgeText}>
        {getItemCount()}
      </Text>
    </View>
  )}

  <Ionicons
    name="bag-handle-outline"
    size={20}
    color={iconColor}
  />
</TouchableOpacity>
        </View>

        {/* ══ SCROLL ══ */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: safeBottom + BOTTOM_BAR_HEIGHT + 20,
          }}
        >
          {/* ── Image: transparent container, no tinted bg ── */}
          <View style={styles.imagePad}>
            <View style={[styles.imageWrap, { borderColor: colors.border }]}>
              <Image
                source={{ uri: product.image }}
                style={styles.productImage}
                resizeMode="contain"
              />

              {/* Share + Wishlist */}
              <View style={styles.floatBtns}>
                
                <TouchableOpacity
                  style={[styles.floatBtn, { backgroundColor: colors.card }]}
                  onPress={() => toggleWishlist(product)}
                >
                  <Ionicons
                    name={inWishlist ? 'heart' : 'heart-outline'}
                    size={16}
                    color={inWishlist ? '#FF4D4F' : iconColor}
                  />
                </TouchableOpacity>
              </View>

              {/* Stock badge */}
              {!product.inStock && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Product info ── */}
          <View style={styles.infoBlock}>

            {/* Name + Price on same row */}
            <View style={styles.nameRow}>
              <Text
                style={[styles.productName, { color: colors.text }]}
                numberOfLines={2}
              >
                {product.name}
              </Text>
              <Text style={[styles.productPrice, { color: colors.primary ?? '#F7931A' }]}>
                ${product.price.toLocaleString()}
              </Text>
            </View>

           
           <View style={styles.metaContainer}>
  {/* LEFT */}
  <View style={styles.brandSection}>
    <Text
      style={[
        styles.brandHeading,
        { color: mutedColor },
      ]}
    >
      BRAND
    </Text>

    <Text
      style={[
        styles.brandTitle,
        { color: colors.text },
      ]}
      numberOfLines={1}
    >
      {product.brand}
    </Text>

    <View
      style={[
        styles.stockBadge,
        {
          backgroundColor:
            product.inStock
              ? 'rgba(34,197,94,0.14)'
              : 'rgba(239,68,68,0.14)',
        },
      ]}
    >
      <View
        style={[
          styles.stockDot,
          {
            backgroundColor:
              product.inStock
                ? '#22C55E'
                : '#EF4444',
          },
        ]}
      />

      <Text
        style={[
          styles.stockText,
          {
            color:
              product.inStock
                ? '#22C55E'
                : '#EF4444',
          },
        ]}
      >
        {product.inStock
          ? 'In Stock'
          : 'Out of Stock'}
      </Text>
    </View>
  </View>

  {/* RIGHT */}
  <View
    style={[
      styles.ratingCard,
      {
        backgroundColor: isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.45)',
      },
    ]}
  >
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full =
          product.rating >= star;

        const half =
          product.rating >=
            star - 0.5 &&
          product.rating < star;

        return (
          <Ionicons
            key={star}
            name={
              full
                ? 'star'
                : half
                ? 'star-half'
                : 'star-outline'
            }
            size={18}
            color="#F6C343"
          />
        );
      })}
    </View>

    <Text
      style={[
        styles.ratingText,
        { color: colors.text },
      ]}
    >
      <Text
        style={{
          fontWeight: '800',
          color: colors.text,
        }}
      >
        {product.rating.toFixed(1)}
      </Text>

      <Text
        style={{
          color: mutedColor,
          fontWeight: '600',
        }}
      >
        {' '}out of 5
      </Text>
    </Text>
  </View>
</View>

<View
  style={[
    styles.cartContainer,
    {
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(255,255,255,0.16)',

      borderColor: isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(255,255,255,0.20)',
    },
  ]}
>
  {!inCart ? (
    <TouchableOpacity
      style={[
        styles.cartButton,
        !product.inStock &&
          styles.mainBtnDisabled,
      ]}
      disabled={!product.inStock}
      onPress={() =>
        addToCart(product)
      }
    >
      <Ionicons
        name="bag-add-outline"
        size={20}
        color="#fff"
      />

      <Text style={styles.cartBtnText}>
        Add to Cart
      </Text>
    </TouchableOpacity>
  ) : (
    <View
      style={styles.quantityBox}
    >
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() => {
          if (
            cartQuantity === 1
          ) {
            removeFromCart(
              product.id
            );
          } else {
            updateQuantity(
              product.id,
              cartQuantity - 1
            );
          }
        }}
      >
        <Ionicons
          name={
            cartQuantity === 1
              ? 'trash-outline'
              : 'remove'
          }
          size={18}
          color={
            cartQuantity === 1
              ? '#FF4D4F'
              : colors.text
          }
        />
      </TouchableOpacity>

      <Text
        style={[
          styles.qtyText,
          {
            color:
              colors.text,
          },
        ]}
      >
        {cartQuantity}
      </Text>

      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={() =>
          addToCart(product)
        }
      >
        <Ionicons
          name="add"
          size={18}
          color={colors.text}
        />
      </TouchableOpacity>
    </View>
  )}
</View>

            {/* ── Spec rows: icon + label + value ── */}
            <View
  style={[
    styles.specsBox,
    {
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(255,255,255,0.16)',

      borderColor: isDark
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(255,255,255,0.22)',
    },
  ]}
>
              {specRows.map(({ key, value, merged }, i) => {
                const meta =
                  merged
                    ? MERGED_META[key as keyof typeof MERGED_META]
                    : (SPEC_META[key] ?? { ...FALLBACK_META, label: key.charAt(0).toUpperCase() + key.slice(1) });

                const displayVal = formatValue(value);
                const isLast = i === specRows.length - 1;

                return (
                  <View
                   key={`${key}-${i}`}
  style={[
    styles.specRow,
    {
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.08)',
    },

    !isLast && {
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.18)',
    },
  ]}
>
                    {/* Colored icon bubble */}
                    <View style={[styles.specIconBubble, { backgroundColor: isDark
  ? meta.bg
  : meta.bg.replace(
      '0.12',
      '0.18'
    ) }]}>
                      <Ionicons name={meta.icon as any} size={15} color={meta.tint} />
                    </View>

                    {/* Label + value */}
                    <View style={styles.specTexts}>
                      <Text style={[styles.specLabel, { color: mutedColor }]}>
                        {meta.label}
                      </Text>
                      <Text
                        style={[styles.specValue, { color: colors.text }]}
                        numberOfLines={2}
                      >
                        {displayVal}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Tags ── */}
            {product.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {product.tags.map((tag: string, i: number) => (
                  <View   key={`${tag}-${i}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        
      </View>
    </GradientBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#7d2bbb',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  /* Image */
  imagePad: { paddingHorizontal: 16, paddingTop: 12 },
  imageWrap: {
    height: 240,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // No backgroundColor — inherits from GradientBackground
  },

  brandHeading: {
  fontSize: 11,
  fontWeight: '700',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  marginBottom: 4,
},

brandTitle: {
  fontSize: 26,
  fontWeight: '800',
  letterSpacing: -0.5,
  marginBottom: 12,
},

ratingCard: {
  alignSelf: 'flex-start',
  borderRadius: 20,
  paddingHorizontal: 14,
  paddingVertical: 12,
},

starsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},

ratingText: {
  fontSize: 16,
  fontWeight: '700',
},

stockBadge: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 999,
  gap: 8,
},

stockText: {
  fontSize: 14,
  fontWeight: '700',
},
  productImage: {
    width: '65%',
    height: '65%',
  },
  floatBtns: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
  },
  floatBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF4D4F',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
ratingContainer: {
  flexShrink: 1,
  alignSelf: 'center',
},


brandBadge: {
  width: 42,
  height: 42,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 12,
},

metaCaption: {
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1,
  marginBottom: 2,
},



rightMeta: {
  alignItems: 'flex-end',
  gap: 8,
},







ratingBox: {
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
},

ratingValue: {
  fontSize: 13,
  fontWeight: '700',
  marginLeft: 5,
},

ratingReviews: {
  fontSize: 11,
  marginLeft: 4,
},






  /* Info block */
  infoBlock: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Name + price row */
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },



  /* Spec list */
  specsBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 14,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  specIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  specTexts: {
    flex: 1,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  /* Tags */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingBottom: 4,
  },
 tag: {
  backgroundColor:
    'rgba(159, 35, 197, 0.14)',

  borderWidth:
    StyleSheet.hairlineWidth,

  borderColor:
    'rgba(24, 21, 17, 0.24)',

  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 8,
},
  tagText: {
    color: '#150217',
    fontSize: 12,
    fontWeight: '600',
  },




 
 
 


  mainBtnDisabled: {
    backgroundColor: '#999',
  },
 
  cartContainer: {
  borderRadius: 24,
  borderWidth: 1,
  padding: 14,
  marginBottom: 18,
},

cartButton: {
  height: 58,
  borderRadius: 20,
  backgroundColor: '#8b40ed',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  gap: 10,
},

cartBtnText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},

quantityBox: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent:
    'space-between',
},

qtyBtn: {
  width: 52,
  height: 52,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor:
    'rgba(255,255,255,0.08)',
},

qtyText: {
  fontSize: 22,
  fontWeight: '800',
},

metaContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 18,
  gap: 14,
},
brandSection: {
  flex: 1,
},





stockDot: {
  width: 8,
  height: 8,
  borderRadius: 999,
},





});
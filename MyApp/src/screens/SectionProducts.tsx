import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function SectionProducts({
  navigation,
  route,
}: any) {
  const { colors } = useTheme();
  const { addToCart, isInCart } = useCart();
  const { toggleWishlist, isInWishlist } =
    useWishlist();

  const {
    products = [],
    title = 'Products',
  } = route.params || {};

  const navigateToProduct = (
    product: any
  ) => {
    navigation.navigate(
      'ProductDetail',
      { product }
    );
  };

  const renderProductCard = ({
    item,
  }: any) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      activeOpacity={0.85}
      onPress={() =>
        navigateToProduct(item)
      }
    >
      <View
        style={[
          styles.cardImageWrap,
          {
            backgroundColor:
              colors.bgSecondary,
          },
        ]}
      >
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
        />

        <TouchableOpacity
          style={[
            styles.heartBtn,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
          onPress={() =>
            toggleWishlist(item)
          }
        >
          <Ionicons
            name={
              isInWishlist(item.id)
                ? 'heart'
                : 'heart-outline'
            }
            size={18}
            color={
              isInWishlist(item.id)
                ? colors.error
                : colors.textMuted
            }
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardInfo}>
        <Text
          style={[
            styles.cardBrand,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {item.brand}
        </Text>

        <Text
          style={[
            styles.cardName,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <View style={styles.cardRow}>
          <Text
            style={[
              styles.cardPrice,
              {
                color:
                  colors.primary,
              },
            ]}
          >
            ${item.price}
          </Text>

          <View
            style={[
              styles.ratingBadge,
              {
                backgroundColor:
                  colors.starBg,
              },
            ]}
          >
            <Ionicons
              name="star"
              size={10}
              color={colors.star}
            />

            <Text
              style={[
                styles.ratingText,
                {
                  color:
                    colors.star,
                },
              ]}
            >
              {item.rating}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addBtn,
            {
              backgroundColor:
                isInCart(item.id)
                  ? colors.success
                  : colors.primary,
            },
          ]}
          onPress={() =>
            addToCart(item)
          }
        >
          <Ionicons
            name={
              isInCart(item.id)
                ? 'checkmark'
                : 'add'
            }
            size={14}
            color="#fff"
          />

          <Text
            style={
              styles.addBtnText
            }
          >
            {isInCart(item.id)
              ? 'In Cart'
              : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <SafeAreaView
        style={styles.container}
      >
        {/* Header */}
        <View
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
            style={[
              styles.backBtn,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
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
                color:
                  colors.text,
              },
            ]}
          >
            {title}
          </Text>

          <View
            style={{
              width: 44,
            }}
          />
        </View>

        <FlatList
          data={products}
          keyExtractor={(item) =>
            item.id.toString()
          }
          numColumns={2}
          columnWrapperStyle={{
            justifyContent:
              'space-between',
            paddingHorizontal: 16,
          }}
          contentContainerStyle={{
            paddingBottom: 100,
            paddingTop: 10,
          }}
          renderItem={
            renderProductCard
          }
          ListEmptyComponent={
            <View
              style={
                styles.emptyWrap
              }
            >
              <Ionicons
                name="cube-outline"
                size={60}
                color={
                  colors.textMuted
                }
              />
              <Text
                style={{
                  color:
                    colors.textMuted,
                  marginTop: 10,
                }}
              >
                No products found
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 20,
      paddingBottom: 12,
    },

    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent:
        'center',
      alignItems: 'center',
      borderWidth: 1,
    },

    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
    },

    productCard: {
      width: CARD_WIDTH,
      borderRadius: 22,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
    },

    cardImageWrap: {
      padding: 14,
      alignItems: 'center',
      position: 'relative',
    },

    cardImage: {
      width: '100%',
      height: 140,
      resizeMode: 'contain',
    },

    heartBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent:
        'center',
      alignItems: 'center',
      borderWidth: 1,
    },

    cardInfo: {
      padding: 12,
    },

    cardBrand: {
      fontSize: 10,
      fontWeight: '700',
      textTransform:
        'uppercase',
    },

    cardName: {
      fontSize: 14,
      fontWeight: '700',
      marginTop: 4,
      minHeight: 38,
    },

    cardRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginTop: 8,
    },

    cardPrice: {
      fontSize: 17,
      fontWeight: '800',
    },

    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },

    ratingText: {
      fontSize: 11,
      fontWeight: '700',
      marginLeft: 3,
    },

    addBtn: {
      flexDirection: 'row',
      justifyContent:
        'center',
      alignItems: 'center',
      borderRadius: 12,
      paddingVertical: 10,
      marginTop: 12,
    },

    addBtnText: {
      color: '#fff',
      fontWeight: '700',
      marginLeft: 4,
    },

    emptyWrap: {
      alignItems: 'center',
      marginTop: 100,
    },
  });
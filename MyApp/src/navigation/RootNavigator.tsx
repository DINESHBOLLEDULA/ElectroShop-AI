import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import ProductsScreen from '../screens/ProductsScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SectionProducts from '../screens/SectionProducts';
import CopilotScreen from '../screens/CopilotScreen';
import CartScreen from '../screens/CartScreen';
import WishlistScreen from '../screens/WishlistScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamic tab bar height based on screen size
const getTabBarHeight = (bottomInset: number) => {
  const baseHeight = SCREEN_HEIGHT < 700 ? 52 : SCREEN_HEIGHT < 850 ? 58 : 64;
  return baseHeight + bottomInset;
};

// Root Stack (Splash -> Onboarding -> MainTabs)
const RootStack = createNativeStackNavigator();

// Home Stack (Home -> ProductDetail -> CategoryProducts)
const HomeStackNav = createNativeStackNavigator();
function HomeStackNavigator() {
  const { colors } = useTheme();
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeScreen} />
      <HomeStackNav.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStackNav.Screen name="SectionProducts"
          component={SectionProducts}
          options={{
            headerShown: false,
          }}
        />
      <HomeStackNav.Screen
        name="CategoryProducts"
        component={ProductsScreen}
        options={{ headerShown: false,
      }}
      />
    </HomeStackNav.Navigator>
  );
}

// Categories Stack (Categories -> Products -> ProductDetail)
const CategoriesStack = createNativeStackNavigator();
function CategoriesStackNavigator() {
  const { colors } = useTheme();
  return (
    <CategoriesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerTransparent: true,
      }}
    >
      <CategoriesStack.Screen
        name="CategoriesMain"
        component={CategoriesScreen}
        options={{ headerShown: false }}
      />
      <CategoriesStack.Screen
          name="Products"
          component={ProductsScreen}
          options={{
            headerShown: false,
          }}
        />
      <CategoriesStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: false }}
      />
    </CategoriesStack.Navigator>
  );
}

// Copilot FAB button
function CopilotTabButton({ onPress }: any) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.copilotWrapper}>
      <View style={[
        styles.copilotButton,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          borderWidth: isDark ? 2 : 0,
          borderColor: isDark ? colors.primaryLight + '40' : 'transparent',
        },
      ]}>
        <FontAwesome5 name="robot" size={22} color="#fff" />
      </View>
      <Text style={[styles.copilotLabel, { color: colors.primary }]}>Copilot</Text>
    </TouchableOpacity>
  );
}

const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const { getItemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { colors, isDark } = useTheme();
  const cartCount = getItemCount();
  const tabBarHeight = getTabBarHeight(insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 8 : 4,
          paddingTop: 6,
          backgroundColor: isDark
            ? 'rgba(13, 13, 37, 0.95)'
            : 'rgba(255, 255, 255, 0.92)',
          borderTopWidth: 1,
          borderTopColor: isDark
            ? 'rgba(37, 37, 80, 0.6)'
            : 'rgba(216, 180, 226, 0.3)',
          // Elevation / shadow for a premium look
          ...Platform.select({
            ios: {
              shadowColor: isDark ? '#000' : 'rgb(139, 114, 255)',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 12,
            },
          }),
          // Ensure no overflow from content above
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textMuted : '#6B6B8D',
        tabBarLabelStyle: {
          fontSize: SCREEN_HEIGHT < 700 ? 10 : 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoriesStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="grid-view" size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="Copilot"
        component={CopilotScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <CopilotTabButton onPress={props.onPress} />,
        }}
      />

      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="cart-outline" size={size} color={color} />
              {cartCount > 0 && (
                <View style={[styles.cartBadge, {
                  backgroundColor: colors.error,
                  borderColor: isDark ? colors.tabBar : '#fff',
                }]}>
                  <Text style={styles.cartBadgeText}>
                    {cartCount > 9 ? '9+' : cartCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="heart-outline" size={size} color={color} />
              {wishlistItems.length > 0 && (
                <View style={[styles.cartBadge, {
                  backgroundColor: colors.accentPink,
                  borderColor: isDark ? colors.tabBar : '#fff',
                }]}>
                  <Text style={styles.cartBadgeText}>
                    {wishlistItems.length > 9 ? '9+' : wishlistItems.length}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Settings screen with theme toggle (accessible from Home header or a settings tab)
// For now, the toggle is in the HomeScreen header

export default function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.bg,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.error,
        },
        fonts: DefaultTheme.fonts,
      }}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  copilotWrapper: {
    top: -18,
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
  },
  copilotButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  copilotLabel: {
    fontSize: SCREEN_HEIGHT < 700 ? 9 : 10,
    fontWeight: '600',
    marginTop: 3,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cartBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
});
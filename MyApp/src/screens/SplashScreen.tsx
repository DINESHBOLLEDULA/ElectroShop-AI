import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ORBIT_SIZE = width * 0.62;
const ORBIT_RADIUS = ORBIT_SIZE / 2 + 10;
const CENTER = ORBIT_SIZE / 2;
const ICON_BOX = 48; // icon container size

// 5 icons evenly spaced → 360/5 = 72° apart, starting from top (-90°)
const ICON_DEFS = [
  { name: 'phone-portrait-outline',  label: 'Phone'    },
  { name: 'laptop-outline',          label: 'Laptop'   },
  { name: 'tv-outline',              label: 'TV'       },
  { name: 'headset-outline',         label: 'Audio'    },
  { name: 'watch-outline',           label: 'Watch'    },
] as const;

const ICONS = ICON_DEFS.map((def, i) => ({
  ...def,
  // -90 puts first icon at top; 72° gap gives perfect equal spacing
  angle: -90 + i * 72,
}));

export default function SplashScreen({ navigation }: any) {
  const scaleAnim   = useRef(new Animated.Value(0.75)).current;
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const orbitAnim   = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const dotAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Intro
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Slow orbit — drives the whole ring rotation
    Animated.loop(
      Animated.timing(orbitAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Breathing logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Floating (applied only to the center logo — not the orbit)
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatingAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Loading dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  // The whole orbit ring (icons + ring border) rotates as one unit
  const orbitRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Icons counter-rotate so they stay upright as the ring spins
  const counterRotate = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const floatY = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });

  const dot1 = dotAnim.interpolate({ inputRange: [0, 1],       outputRange: [0.3, 1] });
  const dot2 = dotAnim.interpolate({ inputRange: [0, 0.5, 1],  outputRange: [0.4, 1, 0.4] });
  const dot3 = dotAnim.interpolate({ inputRange: [0, 1],       outputRange: [1, 0.3] });

  return (
    <LinearGradient
      colors={['#9DEAF2', '#D8B4E2', '#EACCE2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Background blobs */}
      <View style={styles.topBlob} />
      <View style={styles.bottomBlob} />

      {/* Hero */}
      <View style={styles.hero}>

        {/*
          Single Animated.View rotates the entire orbit (ring + all icons).
          Each icon then counter-rotates so it stays upright.
          Icons are placed with absolute left/top calculated from sin/cos —
          no chained translateX after rotate, which fixes the misplacement bug.
        */}
        <Animated.View
          style={[
            styles.orbitContainer,
            { transform: [{ rotate: orbitRotate }] },
          ]}
        >
          {/* Dashed ring */}
          <View style={styles.orbitRing} />

          {/* Icons */}
          {ICONS.map(({ angle, name }, index) => {
            const rad = (angle * Math.PI) / 180;
            const x = CENTER + ORBIT_RADIUS * Math.cos(rad);
            const y = CENTER + ORBIT_RADIUS * Math.sin(rad);

            return (
              <Animated.View
                key={index}
                style={[
                  styles.orbitIconWrapper,
                  {
                    left: x - ICON_BOX / 2,
                    top:  y - ICON_BOX / 2,
                    transform: [{ rotate: counterRotate }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.65)']}
                  style={styles.orbitIconBubble}
                >
                  <Ionicons name={name as any} size={24} color="#7C3AED" />
                </LinearGradient>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Center logo — floats independently of the orbit */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim },
                { translateY: floatY },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#5B21B6', '#7C3AED', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            {/* Cart icon */}
            <Ionicons name="cart-outline" size={52} color="#FFF" />
            {/* AI pill badge */}
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </LinearGradient>
        </Animated.View>

      </View>

      {/* Branding */}
      <View style={styles.textSection}>
        <Text style={styles.title}>
          ElectroShop<Text style={styles.ai}>AI</Text>
        </Text>
        <Text style={styles.subtitle}>Your AI Shopping Companion</Text>
      </View>

      {/* Animated dots — all three cycle through dim → bright */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2, width: 14, height: 14 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>

      <Text style={styles.loadingText}>Loading smart experience...</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },

  // The rotating container is exactly the orbit's bounding box
  orbitContainer: {
    position: 'absolute',
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
  },

  orbitRing: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(168,85,247,0.10)',
  },

  // Fixed 48×48 tap area centred on the computed x/y point
  orbitIconWrapper: {
    position: 'absolute',
    width: ICON_BOX,
    height: ICON_BOX,
    justifyContent: 'center',
    alignItems: 'center',
  },

  orbitIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  logoWrapper: {
    zIndex: 10,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },

  aiBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },

  aiBadgeText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  textSection: {
    alignItems: 'center',
    marginTop: 32,
  },

  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#17162B',
    letterSpacing: -1.4,
  },

  ai: {
    color: '#A855F7',
  },

  subtitle: {
    fontSize: 18,
    color: '#3D3657',
    marginTop: 8,
  },

  dotsContainer: {
    flexDirection: 'row',
    marginTop: 30,
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#7C3FE4',
    marginHorizontal: 6,
  },

  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: '#3D3657',
  },

  topBlob: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#9DEAF2',
    opacity: 0.35,
  },

  bottomBlob: {
    position: 'absolute',
    bottom: -120,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#D8B4E2',
    opacity: 0.4,
  },
});
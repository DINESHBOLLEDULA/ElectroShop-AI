import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useBackend } from '../context/BackendContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    purpleTitle: 'Discover',
    blackTitle: 'Products',
    description:
      'Browse thousands of electronics, gadgets and accessories from top brands worldwide.',
    image:  require('../../assets/1.png'),
  },
  {
    id: '2',
    purpleTitle: 'Copilot',
    blackTitle: 'AI Shopping',
    description:
      'Get personalized recommendations and smart suggestions powered by AI.',
    image: require('../../assets/2.png'),
  },
  {
    id: '3',
    purpleTitle: 'Easy',
    blackTitle: 'Compare',
    description:
      'Side by side comparison of products powered by AI.',
    image: require('../../assets/3.png'),
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const {isBackendConnected,}=useBackend();

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      navigation.replace('MainTabs');
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {SLIDES.map((_, index) => (
        <View
          key={index}
          style={[styles.dot, currentIndex === index && styles.activeDot]}
        />
      ))}
    </View>
  );

  const renderItem = ({ item }: any) => (
    <View style={styles.slide}>

      {/* Header */}
      <View style={styles.header}>
        {item.id === '2' ? (
          <>
            <Text style={styles.blackTitle}>{item.blackTitle}</Text>
            <Text style={styles.purpleTitle}>{item.purpleTitle}</Text>
          </>
        ) : (
          <>
            <Text style={styles.purpleTitle}>{item.purpleTitle}</Text>
            <Text style={styles.blackTitle}>{item.blackTitle}</Text>
          </>
        )}
        <Text style={styles.description}>{item.description}</Text>
      </View>

      {/* Illustration */}
      <Image
        source= {item.image}
        style={styles.image}
        resizeMode="contain"
      />

      {/* Bottom */}
      <View style={styles.bottom}>
        {renderDots()}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextSlide}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );

  return (
    <LinearGradient
      colors={['#9DEAF2', '#D8B4E2', '#EACCE2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  slide: {
    width,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: height * 0.1,
    paddingBottom: 44,
    justifyContent: 'space-between',
  },

  header: {},

  purpleTitle: {
    color: '#7C3FE4',
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -0.8,
  },

  blackTitle: {
    color: '#1A1A2E',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.8,
  },

  description: {
    marginTop: 18,
    color: '#3D3657',
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 28,
    width: '85%',
  },

  image: {
    width: '100%',
    height: height * 0.34,
    alignSelf: 'center',
  },

  bottom: {
    alignItems: 'center',
  },

  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 26,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 6,
  },

  activeDot: {
    backgroundColor: '#7C3FE4',
  },

  nextButton: {
    width: '100%',
    height: 62,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7C3FE4',
  },

  nextText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
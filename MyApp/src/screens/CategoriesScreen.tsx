import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Categorylist } from '../utils/CategoryList';
import { useTheme } from '../context/ThemeContext';
import GradientBackground from '../components/GradientBackground';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;



export default function CategoriesScreen({ navigation }: any) {
 const {
  colors,
  isDark,
  toggleTheme,
} = useTheme();

  const renderCategory = ({ item }: any) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={() =>
        navigation.navigate(
          'Products',
          { category: item }
        )
      }
    >
      <Image
        source={item.image}
        style={styles.image}
      />

      <Text
        style={[
          styles.name,
          { color: colors.text },
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

  return (
    <GradientBackground>
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
  <Text
    style={[
      styles.headerTitle,
      { color: colors.text },
    ]}
  >
    Categories
  </Text>

  <TouchableOpacity
    activeOpacity={0.9}
    onPress={toggleTheme}
    style={[
      styles.switchTrack,
      {
        backgroundColor: isDark
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
                isDark ? 30 : 0,
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

      <FlatList
        data={Categorylist}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120,paddingTop:8 }}
        renderItem={renderCategory}
        
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingTop: 12,
  paddingBottom: 20,
},

headerTitle: {
  fontSize: 34,
  fontWeight: '800',
  letterSpacing: -1,
},


columnWrapper: {
  justifyContent: 'space-between',
  marginBottom: 12,
},


card: {
  width: CARD_WIDTH,
  height: 175,
  borderRadius: 30,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 18,
  paddingBottom: 16,

  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: {
    width: 0,
    height: 6,
  },

  elevation: 6,
},


image: {
  width: '76%',
  height: 110,
  resizeMode: 'contain',
},

name: {
  fontSize: 15,
  fontWeight: '700',
  textAlign: 'center',
},

themeToggle: {
  width: 42,
  height: 42,
  borderRadius: 14,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 1,

  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 5,
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






});
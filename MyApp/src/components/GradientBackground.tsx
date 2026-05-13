import React from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: object;
}

/**
 * Reusable gradient background that adapts to theme mode.
 * Light: pastel gradient #9DEAF2 → #D8B4E2 → #EACCE2
 * Dark: deep gradient #0B0B1E → #111130 → #181842
 */
export default function GradientBackground({ children, style }: GradientBackgroundProps) {
  const { isDark } = useTheme();

  const gradientColors: [string, string, string] = isDark
    ? ['#0B0B1E', '#12122E', '#1A1A3E']
    : ['#9DEAF2', '#D8B4E2', '#EACCE2'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

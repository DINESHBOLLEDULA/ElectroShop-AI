import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { CompareProvider } from './src/context/CompareContext';
import {ThemeProvider,useTheme} from './src/context/ThemeContext';
import Toast from 'react-native-toast-message';

import { BackendProvider} from './src/context/BackendContext';
import { toastConfig } from './src/components/CustomToast';

function AppContent() {
  const { isDark } =
    useTheme();

  return (
    <BackendProvider>
      <StatusBar
        style={
          isDark
            ? 'light'
            : 'dark'
        }
      />

      <CompareProvider>
        <CartProvider>
          <WishlistProvider>
            <RootNavigator />
          </WishlistProvider>
        </CartProvider>
      </CompareProvider>

      {/* IMPORTANT */}
      <Toast config={toastConfig}/>
    </BackendProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
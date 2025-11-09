/**
 * Qbitcoin Wallet - Quantum-Resistant Cryptocurrency Wallet
 * Quantum-resistant signatures using Falcon-512 and Falcon-1024
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet, useColorScheme, Text, AppState, TouchableOpacity } from 'react-native';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import CreateWalletScreen from './src/screens/CreateWalletScreen';
import ImportWalletScreen from './src/screens/ImportWalletScreen';
import UnlockScreen from './src/screens/UnlockScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SendScreen from './src/screens/SendScreen';
import ReceiveScreen from './src/screens/ReceiveScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import SignMessageScreen from './src/screens/SignMessageScreen';
import VerifyMessageScreen from './src/screens/VerifyMessageScreen';
import WalletInfoScreen from './src/screens/WalletInfoScreen';
import WalletStorage from './src/services/WalletStorage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardTabs() {
  const isDarkMode = useColorScheme() === 'dark';
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1565c0',
        tabBarInactiveTintColor: '#90a4ae',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1a2332' : '#fff',
          borderTopColor: isDarkMode ? '#263238' : '#cfd8dc',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ 
          tabBarLabel: 'Home', 
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text> 
        }}
      />
      <Tab.Screen
        name="SignMessage"
        component={SignMessageScreen}
        options={{ 
          tabBarLabel: 'Sign', 
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✍️</Text> 
        }}
      />
      <Tab.Screen
        name="Scan"
        component={QRScannerScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const parentNav = navigation.getParent();
            navigation.navigate('QRScanner', {
              onScan: (address: string) => {
                console.log('QR Scan callback - address:', address);
                console.log('Parent navigator exists:', !!parentNav);
                if (parentNav) {
                  console.log('Using parent navigator to go to Send');
                  parentNav.navigate('Send', { scannedAddress: address });
                } else {
                  console.log('No parent navigator, trying direct navigation');
                  navigation.navigate('Send', { scannedAddress: address });
                }
              }
            });
          },
        })}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.centerButton,
              isDarkMode && styles.centerButtonDark,
              focused && styles.centerButtonFocused
            ]}>
              <Text style={styles.centerButtonIcon}>📷</Text>
            </View>
          ),
          tabBarButton: (props: any) => {
            const { style, delayLongPress, disabled, ...restProps } = props;
            return (
              <TouchableOpacity
                {...restProps}
                disabled={disabled || false}
                style={[style, styles.centerButtonContainer]}
              />
            );
          },
        }}
      />
      <Tab.Screen
        name="VerifyMessage"
        component={VerifyMessageScreen}
        options={{ 
          tabBarLabel: 'Verify', 
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✅</Text> 
        }}
      />
      <Tab.Screen
        name="WalletInfo"
        component={WalletInfoScreen}
        options={{ 
          tabBarLabel: 'Info', 
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>�</Text> 
        }}
      />
    </Tab.Navigator>
  );
}

function App(): React.JSX.Element {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    checkWallet();
  }, []);

  // Removed AppState locking - it interferes with file pickers
  // The wallet is encrypted anyway, so it's secure
  // Users can manually lock from settings if needed

  const checkWallet = async () => {
    const wallet = await WalletStorage.getActiveWallet();
    const walletExists = wallet !== null;
    setHasWallet(walletExists);
    
    // If wallet exists, require unlock and will go to MainApp after unlock
    // If no wallet, go to Welcome
    setInitialRoute(walletExists ? 'MainApp' : 'Welcome');
    setIsLocked(walletExists);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  if (initialRoute === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLocked && hasWallet ? 'Unlock' : initialRoute}
        screenOptions={{ headerShown: false }}>
        {/* Show unlock screen first if locked and wallet exists */}
        {isLocked && hasWallet && (
          <Stack.Screen name="Unlock">
            {(props) => <UnlockScreen {...props} onUnlock={handleUnlock} />}
          </Stack.Screen>
        )}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CreateWallet" component={CreateWalletScreen} />
        <Stack.Screen name="ImportWallet" component={ImportWalletScreen} />
        <Stack.Screen name="MainApp" component={DashboardTabs} />
        <Stack.Screen name="QRScanner" component={QRScannerScreen} />
        <Stack.Screen name="Send" component={SendScreen} />
        <Stack.Screen name="Receive" component={ReceiveScreen} />
        <Stack.Screen name="Transactions" component={TransactionsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1565c0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  centerButtonDark: {
    backgroundColor: '#2196f3',
  },
  centerButtonFocused: {
    backgroundColor: '#0d47a1',
  },
  centerButtonIcon: {
    fontSize: 28,
  },
});

export default App;

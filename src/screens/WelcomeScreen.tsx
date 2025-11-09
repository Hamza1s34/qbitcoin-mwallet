/**
 * Welcome Screen
 * First screen shown to new users
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Image,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
  Dashboard: undefined;
};

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>Q</Text>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            Qbitcoin Wallet
          </Text>
          <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
            Quantum-Resistant Cryptocurrency
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Feature
            icon="🛡️"
            text="Post-Quantum Cryptography"
            isDarkMode={isDarkMode}
          />
          <Feature
            icon="🔐"
            text="Military-Grade Encryption"
            isDarkMode={isDarkMode}
          />
          <Feature
            icon="⚡"
            text="Fast & Secure Transactions"
            isDarkMode={isDarkMode}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => navigation.navigate('CreateWallet')}>
            <Text style={styles.buttonText}>Create New Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, isDarkMode && styles.buttonSecondaryDark]}
            onPress={() => navigation.navigate('ImportWallet')}>
            <Text style={[styles.buttonTextSecondary, isDarkMode && styles.buttonTextSecondaryDark]}>
              Import Existing Wallet
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, isDarkMode && styles.footerDark]}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

function Feature({ icon, text, isDarkMode }: { icon: string; text: string; isDarkMode: boolean }) {
  return (
    <View style={[styles.feature, isDarkMode && styles.featureDark]}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[styles.featureText, isDarkMode && styles.featureTextDark]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#0a1929',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoIcon: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#546e7a',
  },
  subtitleDark: {
    color: '#90caf9',
  },
  features: {
    marginTop: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureDark: {
    backgroundColor: '#1e2d3d',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
  },
  featureTextDark: {
    color: '#e3f2fd',
  },
  buttons: {
    marginBottom: 40,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonPrimary: {
    backgroundColor: '#1565c0',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1565c0',
  },
  buttonSecondaryDark: {
    borderColor: '#90caf9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#1565c0',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextSecondaryDark: {
    color: '#90caf9',
  },
  footer: {
    textAlign: 'center',
    color: '#90a4ae',
    fontSize: 14,
  },
  footerDark: {
    color: '#546e7a',
  },
});

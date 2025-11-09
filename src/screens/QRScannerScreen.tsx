/**
 * QR Scanner Screen
 * Scan QR codes to get wallet addresses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, useCameraDevice, useCodeScanner, useCameraPermission } from 'react-native-vision-camera';
import { CommonActions } from '@react-navigation/native';

interface QRScannerScreenProps {
  navigation: any;
  route: any;
}

export default function QRScannerScreen({ navigation, route }: QRScannerScreenProps) {
  const [hasScanned, setHasScanned] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    checkAndRequestPermission();
  }, []);

  useEffect(() => {
    console.log('QRScannerScreen mounted');
    console.log('Route params:', route.params);
    console.log('Has onScan callback:', !!route.params?.onScan);
  }, []);

  const checkAndRequestPermission = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in your device settings to scan QR codes.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack() },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      console.log('==========================================');
      console.log('onCodeScanned triggered, codes count:', codes.length);
      
      if (hasScanned) {
        console.log('Already scanned, ignoring');
        return;
      }
      
      if (codes.length === 0) {
        console.log('No codes detected');
        return;
      }
      
      const qrData = codes[0]?.value;
      console.log('QR Code raw data:', qrData);
      
      if (!qrData || qrData.trim() === '') {
        console.log('Empty QR data, ignoring');
        return;
      }
      
      setHasScanned(true);
      setScanStatus('✅ Scanned!');
      
      // Extract address from QR code
      let address = qrData.trim();
      
      // Handle different QR formats
      if (qrData.includes('qbitcoin:')) {
        address = qrData.replace('qbitcoin:', '').split('?')[0].trim();
      } else if (qrData.includes('bitcoin:')) {
        address = qrData.replace('bitcoin:', '').split('?')[0].trim();
      }
      
      console.log('Processed address:', address);
      console.log('Route params available:', !!route.params);
      console.log('onScan callback exists:', !!route.params?.onScan);
      console.log('onScan callback type:', typeof route.params?.onScan);
      
      // Call the callback and navigate
      try {
        if (route.params?.onScan) {
          console.log('>>> Calling onScan callback with address:', address);
          route.params.onScan(address);
          console.log('>>> onScan callback completed');
        }
        
        // Navigate back and then to Send screen using CommonActions
        console.log('>>> Dispatching navigation actions...');
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: 'MainApp' },
                { name: 'Send', params: { scannedAddress: address } },
              ],
            })
          );
          console.log('>>> Navigation dispatched');
        }, 200);
      } catch (error) {
        console.error('Error in onCodeScanned:', error);
        Alert.alert('Error', 'Failed to process QR code');
        setHasScanned(false);
        setScanStatus('');
      }
      console.log('==========================================');
    }
  });

  // Show loading while checking permission
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color="#1565c0" />
          <Text style={styles.message}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  // Show permission denied message
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>📷 Camera Permission Required</Text>
          <Text style={styles.message}>
            This app needs camera access to scan QR codes. Please grant permission in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={() => Linking.openSettings()}>
            <Text style={styles.buttonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonTouchable, styles.buttonSecondary]}
            onPress={() => navigation.goBack()}>
            <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show device not available message
  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.messageContainer}>
          <Text style={styles.messageTitle}>📷 Camera Not Available</Text>
          <Text style={styles.message}>Unable to access camera device</Text>
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
        enableZoomGesture={true}
      />
      <View style={styles.overlay}>
        <View style={styles.topContent}>
          <Text style={styles.title}>Scan QR Code</Text>
          <Text style={styles.subtitle}>
            {scanStatus || 'Position the QR code within the frame'}
          </Text>
          {hasScanned && (
            <ActivityIndicator size="large" color="#00ff00" style={{ marginTop: 10 }} />
          )}
        </View>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <View style={styles.scanLine} />
        </View>
        <View style={styles.bottomContent}>
          <Text style={styles.helpText}>
            📱 Point your camera at a QR code to scan it
          </Text>
          <TouchableOpacity
            style={styles.buttonTouchable}
            onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  messageTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topContent: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingTop: 60,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
  },
  scanFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ff00',
    top: '50%',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00ff00',
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 40,
    paddingTop: 20,
  },
  helpText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonTouchable: {
    backgroundColor: '#1565c0',
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 12,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1565c0',
    marginTop: 12,
  },
  buttonSecondaryText: {
    color: '#1565c0',
  },
});

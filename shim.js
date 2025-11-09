// Crypto shims for React Native
import 'react-native-get-random-values';
import { decode, encode } from 'base64-arraybuffer';

// Install crypto polyfill
const QuickCrypto = require('react-native-quick-crypto');
global.crypto = QuickCrypto.crypto;

// Polyfill base64 functions
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

if (typeof global.atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Polyfill base64 ArrayBuffer functions
global.base64FromArrayBuffer = (arrayBuffer) => {
  return encode(arrayBuffer);
};

global.base64ToArrayBuffer = (base64) => {
  return decode(base64);
};

// Polyfill global if needed
if (typeof global.process === 'undefined') {
  global.process = require('process');
}

if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

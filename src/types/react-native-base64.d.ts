declare module 'react-native-base64' {
  const base64: {
    encode: (str: string) => string;
    decode: (str: string) => string;
  };
  export default base64;
}

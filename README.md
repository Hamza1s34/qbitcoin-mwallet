# Qbitcoin Mobile WalletThis is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).



A secure, feature-rich mobile cryptocurrency wallet for Qbitcoin, built with React Native.# Getting Started



## 🌐 Official Website> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

[https://qbitcoin.live](https://qbitcoin.live)

## Step 1: Start Metro

## 📱 Features

First, you will need to run **Metro**, the JavaScript build tool for React Native.

- **Secure Wallet Management**: Create and import wallets with seed phrase backup

- **Transaction Support**: Send and receive Qbitcoin with easeTo start the Metro dev server, run the following command from the root of your React Native project:

- **QR Code Scanner**: Quick address scanning for transactions

- **Transaction History**: View complete transaction history```sh

- **Message Signing**: Sign and verify messages with your wallet# Using npm

- **Encrypted Storage**: Secure local storage with password protectionnpm start

- **Cross-Platform**: Available for both iOS and Android

# OR using Yarn

## 🚀 Getting Startedyarn start

```

### Prerequisites

## Step 2: Build and run your app

- Node.js (v14 or higher)

- React Native development environmentWith Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

- iOS: Xcode and CocoaPods

- Android: Android Studio and JDK### Android



### Installation```sh

# Using npm

1. Clone the repository:npm run android

```bash

git clone https://github.com/Hamza1s34/qbitcoin-mwallet.git# OR using Yarn

cd qbitcoin-mwalletyarn android

``````



2. Install dependencies:### iOS

```bash

npm installFor iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

```

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

3. For iOS:

```bash```sh

cd ios && pod install && cd ..bundle install

``````



4. Run the app:Then, and every time you update your native dependencies, run:

```bash

# iOS```sh

npm run iosbundle exec pod install

```

# Android

npm run androidFor more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```

```sh

## 🏗️ Project Structure# Using npm

npm run ios

```

├── src/# OR using Yarn

│   ├── screens/          # Application screensyarn ios

│   ├── services/         # API and utility services```

│   ├── types/           # TypeScript type definitions

│   └── FalconCrypto.ts  # Core cryptocurrency functionalityIf everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

├── android/             # Android native code

├── ios/                # iOS native codeThis is one way to run your app — you can also build it directly from Android Studio or Xcode.

└── App.tsx             # Main application component

```## Step 3: Modify your app



## 🔐 SecurityNow that you have successfully run the app, let's make changes!



- Private keys are encrypted and stored locallyOpen `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

- Seed phrases can be backed up securely

- Password-protected wallet accessWhen you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- No data transmitted to external servers

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).

## 🛠️ Built With- **iOS**: Press <kbd>R</kbd> in iOS Simulator.



- **React Native** - Mobile framework## Congratulations! :tada:

- **TypeScript** - Type-safe development

- **React Navigation** - Navigation libraryYou've successfully run and modified your React Native App. :partying_face:

- **AsyncStorage** - Local data persistence

- **Crypto Libraries** - Secure cryptographic operations### Now what?



## 📋 Requirements- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).

- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

- iOS 13.0+

- Android 5.0+ (API level 21+)# Troubleshooting



## 🤝 ContributingIf you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.



Contributions are welcome! Please feel free to submit a Pull Request.# Learn More



## 📄 LicenseTo learn more about React Native, take a look at the following resources:



This project is licensed under the MIT License.- [React Native Website](https://reactnative.dev) - learn more about React Native.

- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.

## 🔗 Links- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.

- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.

- Website: [https://qbitcoin.live](https://qbitcoin.live)- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

- Repository: [https://github.com/Hamza1s34/qbitcoin-mwallet](https://github.com/Hamza1s34/qbitcoin-mwallet)

## 📞 Support

For support and questions, please visit [https://qbitcoin.live](https://qbitcoin.live)

---

Made with ❤️ for the Qbitcoin community

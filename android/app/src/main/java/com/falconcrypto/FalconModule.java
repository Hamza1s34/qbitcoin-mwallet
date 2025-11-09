package com.falconcrypto;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import org.json.JSONObject;

public class FalconModule extends ReactContextBaseJavaModule {
    
    static {
        System.loadLibrary("helloworld");
    }

    FalconModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "FalconCrypto";
    }

    // Native method declarations
    private static native String generateKeypair512();
    private static native String generateKeypair1024();
    private static native String signMessage512(String message, String secretKey);
    private static native String signMessage1024(String message, String secretKey);
    private static native String verifySignature512(String signedMessage, String publicKey);
    private static native String verifySignature1024(String signedMessage, String publicKey);
    private static native String createWallet(String name, String password);
    private static native String decryptPrivateKey(String encryptedJson, String password);
    private static native String verifyWalletPassword(String walletJson, String password);
    private static native String createTransaction(String paramsJson);

    @ReactMethod
    public void generateKeypair512(Promise promise) {
        try {
            String result = generateKeypair512();
            JSONObject json = new JSONObject(result);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void generateKeypair1024(Promise promise) {
        try {
            String result = generateKeypair1024();
            JSONObject json = new JSONObject(result);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void signMessage512(String message, String secretKey, Promise promise) {
        try {
            String result = signMessage512(message, secretKey);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void signMessage1024(String message, String secretKey, Promise promise) {
        try {
            String result = signMessage1024(message, secretKey);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void verifySignature512(String signedMessage, String publicKey, Promise promise) {
        try {
            String result = verifySignature512(signedMessage, publicKey);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void verifySignature1024(String signedMessage, String publicKey, Promise promise) {
        try {
            String result = verifySignature1024(signedMessage, publicKey);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void createWallet(String name, String password, Promise promise) {
        try {
            String result = createWallet(name, password);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void decryptPrivateKey(String encryptedJson, String password, Promise promise) {
        try {
            String result = decryptPrivateKey(encryptedJson, password);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void verifyWalletPassword(String walletJson, String password, Promise promise) {
        try {
            String result = verifyWalletPassword(walletJson, password);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void createTransaction(String paramsJson, Promise promise) {
        try {
            String result = createTransaction(paramsJson);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}

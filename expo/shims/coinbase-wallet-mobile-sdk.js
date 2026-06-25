// Shim for @coinbase/wallet-mobile-sdk
// This module is not available in Expo Go, so we provide a no-op shim
// to prevent Metro from crashing when thirdweb tries to import it.
module.exports = {
  handleResponse: () => {},
  CoinbaseWalletMobileSDK: {
    configure: () => {},
    handleResponse: () => {},
    makeRequest: () => Promise.reject(new Error('Coinbase Mobile SDK is not available in Expo Go')),
    initiateHandshake: () => Promise.reject(new Error('Coinbase Mobile SDK is not available in Expo Go')),
  },
};

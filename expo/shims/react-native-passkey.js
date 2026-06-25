export const Passkey = {
  create: async () => { throw new Error('Passkey is not supported in Expo Go'); },
  get: async () => { throw new Error('Passkey is not supported in Expo Go'); },
  isSupported: () => false,
};

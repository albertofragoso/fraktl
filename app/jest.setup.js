global.__DEV__ = true

// Provide stable Dimensions and PixelRatio defaults.
// The test for ResultScreen mocks react-native/Libraries/Utilities/Dimensions
// without a `default` export, which breaks PixelRatio and the Dimensions
// import from react-native itself. We fix both here.
jest.mock('react-native/Libraries/Utilities/PixelRatio', () => {
  const PixelRatioMock = {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 2),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => Math.round(size * 2) / 2),
  }
  return { default: PixelRatioMock, ...PixelRatioMock }
})


// Stub expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

// Stub @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}))

// Mock the supabase lib module entirely
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'mock-token' } } }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}))

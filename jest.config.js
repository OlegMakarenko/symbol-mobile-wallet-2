const transformIgnoreModules = [
    '@react-native',
    'react-native',
    'symbol-sdk',
    'symbol-address-book',
    'symbol-crypto-wasm-web',
    'symbol-crypto-wasm-node',
    'react-native-reanimated',
    'react-native-smooth-slider',
];

module.exports = {
    preset: 'react-native',
    clearMocks: true,
    setupFilesAfterEnv: ['./setupTests.js'],
    setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
    transformIgnorePatterns: [`/node_modules/(?!(${transformIgnoreModules.join('|')})/)`],
    testMatch: ['<rootDir>/__tests__/**/*.test.js'],
    modulePaths: ['<rootDir>'],
    moduleNameMapper: {
        '^@/app/(.*)$': '<rootDir>/src/$1',
        '^__fixtures__/(.*)$': '<rootDir>/__fixtures__/$1',
        '^symbol-crypto-wasm-web': '<rootDir>node_modules/symbol-crypto-wasm-node/symbol_crypto_wasm.js',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/jestAssetTransormer.js',
        '\\.(css|less)$': '<rootDir>/jestAssetTransormer.js',
    },
    collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    coveragePathIgnorePatterns: [
        '<rootDir>/setupTests.js',
        '<rootDir>/src/App.js',
        '<rootDir>/src/config',
        '<rootDir>/__fixtures__/',
        '<rootDir>/__mocks__/',
        '<rootDir>/__tests__/',
        '<rootDir>/node_modules/',
        '<rootDir>/build/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
    ],
};

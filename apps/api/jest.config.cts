module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  moduleNameMapper: {
    // ESM-only override (see jest/decode-uri-component.cjs)
    '^decode-uri-component$': '<rootDir>/jest/decode-uri-component.cjs',
  },
  coverageDirectory: '../../coverage/apps/api',
};

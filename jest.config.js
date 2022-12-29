/** @type {import('ts-jest').JestConfigWithTsJest} */

let config = {
  coverageThreshold: {
      global: {
          lines: 80,
      },
  },
coverageReporters: [
  "json-summary", 
  "text",
  "lcov"
]
};

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  ...config
};
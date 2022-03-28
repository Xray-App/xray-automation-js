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
export default config;


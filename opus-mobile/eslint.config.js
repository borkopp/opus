const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");

module.exports = defineConfig([expo, { ignores: ["dist/**", ".expo/**", "ios/**", "android/**"] }, {
  files: ["scripts/*.cjs", "*.config.js"],
  languageOptions: { globals: { __dirname: "readonly", Buffer: "readonly", process: "readonly", console: "readonly", URL: "readonly", require: "readonly", module: "readonly" } },
}]);

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: dirname(fileURLToPath(import.meta.url)),
    },
  },
};

export default config;

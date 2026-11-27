import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Configuracion separada de vite.config.js: las pruebas no necesitan Tailwind.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{js,jsx}"],
    setupFiles: "./test/setup.js",
  },
});

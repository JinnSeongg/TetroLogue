import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { configDefaults } from "vitest/config";

export default defineConfig({
  base: "/TetroLogue/",
  plugins: [react()],
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "reports/**"],
  },
});

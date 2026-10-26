import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default {
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { globals: true, environment: "node", include: ["tests/**/*.test.jsx"] },
};

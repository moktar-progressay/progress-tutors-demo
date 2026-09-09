import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = process.env.VITE_BASE_PATH ?? (repository ? `/${repository}/` : "/");

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});

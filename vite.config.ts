import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: "http://localhost:5174",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["pdfjs-dist"],
      exclude: [],
    },
    define: {
      global: "globalThis",
      // Make Gemini environment variables available to the client
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "import.meta.env.VITE_GEMINI_MODEL": JSON.stringify(
        env.GEMINI_MODEL || "gemini-1.5-flash"
      ),
      "import.meta.env.VITE_GEMINI_API_BASE": JSON.stringify(
        env.GEMINI_API_BASE ||
          "https://generativelanguage.googleapis.com/v1beta"
      ),
    },
    worker: {
      format: "es",
    },
  };
});

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Fetch the initial runtime in parallel without evaluating Engine.IO before MSW.
// modulepreload prepares modules; the import in main.tsx still controls execution.
const preloadRuntime: Plugin = {
  name: "kurio-initial-runtime-preload",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    handler(_html, context) {
      if (!context.bundle) return [];
      return Object.values(context.bundle).flatMap((output) => {
        if (output.type === "chunk" && ["App", "browser"].includes(output.name))
          return [
            {
              tag: "link",
              attrs: {
                rel: "modulepreload",
                crossorigin: "",
                href: `/${output.fileName}`,
              },
              injectTo: "head" as const,
            },
          ];
        return [];
      });
    },
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadRuntime],
});

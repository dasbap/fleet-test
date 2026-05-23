import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

const site =
  process.env.PUBLIC_SITE_URL?.trim() || "https://marketing.e-samba.com";

/** @type {import('astro').AstroUserConfig} */
export default defineConfig({
  site,
  trailingSlash: "never",
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) => !page.includes("/draft/"),
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});

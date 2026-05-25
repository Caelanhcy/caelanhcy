// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import remarkCjkFriendly from 'remark-cjk-friendly';

// https://astro.build/config
export default defineConfig({
  site: 'https://caelanh.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto'
  },
  integrations: [react()],
  markdown: {
    // Patches CommonMark emphasis rules so **bold** and *italic* work
    // when surrounded by CJK characters and full-width punctuation.
    // Without this, **重点。**继续... renders the asterisks literally.
    remarkPlugins: [remarkCjkFriendly]
  },
  vite: {
    ssr: {
      noExternal: ['cytoscape', 'cytoscape-fcose']
    }
  }
});

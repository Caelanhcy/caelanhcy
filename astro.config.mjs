// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://caelanh.com',
  output: 'static',
  build: {
    inlineStylesheets: 'auto'
  },
  integrations: [react()],
  vite: {
    ssr: {
      noExternal: ['cytoscape', 'cytoscape-fcose']
    }
  }
});

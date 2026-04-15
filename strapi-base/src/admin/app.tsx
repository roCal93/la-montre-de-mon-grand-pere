import type { StrapiApp } from '@strapi/strapi/admin';
import Prism from 'prismjs';

declare global {
  interface Window {
    Prism?: typeof Prism;
  }
}

export default {
  config: {
    locales: [],
  },
  bootstrap(_app: StrapiApp) {
    if (typeof window !== 'undefined' && !window.Prism) {
      window.Prism = Prism;
    }
  },
};

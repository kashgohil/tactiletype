import { useEffect } from 'react';
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_SIZE,
  type PageMeta,
  SITE_NAME,
  SITE_URL,
  TWITTER_CARD_TYPE,
} from '@/lib/seo';

function setMetaByName(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkRel(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Applies document title, description, robots, canonical, and social tags.
 * Safe to call on every client navigation (SPA).
 */
export function useDocumentMeta(meta: PageMeta) {
  useEffect(() => {
    const title = meta.title;
    const description = meta.description;
    const canonical = absoluteUrl(meta.path);
    const robots = meta.robots ?? 'index, follow';
    const ogType = meta.ogType ?? 'website';

    document.title = title;

    setMetaByName('description', description);
    setMetaByName('robots', robots);
    setMetaByName('twitter:card', TWITTER_CARD_TYPE);
    setMetaByName('twitter:title', title);
    setMetaByName('twitter:description', description);
    setMetaByName('twitter:image', DEFAULT_OG_IMAGE);

    setMetaByProperty('og:title', title);
    setMetaByProperty('og:description', description);
    setMetaByProperty('og:url', canonical);
    setMetaByProperty('og:type', ogType);
    setMetaByProperty('og:site_name', SITE_NAME);
    setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
    setMetaByProperty('og:image:width', String(DEFAULT_OG_IMAGE_SIZE.width));
    setMetaByProperty('og:image:height', String(DEFAULT_OG_IMAGE_SIZE.height));
    setMetaByProperty('og:image:alt', `${SITE_NAME} logo`);
    setMetaByProperty('og:locale', 'en_US');

    setLinkRel('canonical', canonical);
  }, [meta.title, meta.description, meta.path, meta.robots, meta.ogType]);
}

/** JSON-LD graph for the default shell (also inlined in index.html for first paint). */
export const DEFAULT_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: DEFAULT_OG_IMAGE,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description:
        'Free online typing test and trainer with WPM tracking, practice drills, play modes, and multiplayer races.',
    },
  ],
};

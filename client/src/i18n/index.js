import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';
import ur from './locales/ur.json';
import fr from './locales/fr.json';
import tr from './locales/tr.json';
import es from './locales/es.json';

// To add a language: copy locales/en.json, translate it, register it here and in
// server/src/middleware.js (SUPPORTED_LANGS). RTL languages go in RTL below.
export const LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'ar', native: 'العربية' },
  { code: 'ur', native: 'اردو' },
  { code: 'fr', native: 'Français' },
  { code: 'tr', native: 'Türkçe' },
  { code: 'es', native: 'Español' },
];
const RTL = new Set(['ar', 'ur']);

export function applyDocumentLanguage(lng) {
  const code = (lng || 'en').split('-')[0];
  document.documentElement.lang = code;
  document.documentElement.dir = RTL.has(code) ? 'rtl' : 'ltr';
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar }, ur: { translation: ur }, fr: { translation: fr }, tr: { translation: tr }, es: { translation: es } },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false }, // React already escapes
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  });

applyDocumentLanguage(i18n.resolvedLanguage);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;

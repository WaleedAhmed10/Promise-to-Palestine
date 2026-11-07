export function money(cents, lang, currency = 'USD') {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(lang, {
    style: 'currency', currency,
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
export const number = (n, lang) => new Intl.NumberFormat(lang).format(n);
export const dateLong = (iso, lang) =>
  new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));

// Picks the visitor's language from a {en, ar, ...} map, falling back to English.
export const localized = (map, lang) => (map && (map[lang] || map.en || Object.values(map)[0])) || '';

export function countryName(code, lang) {
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code; } catch { return code; }
}

export const COUNTRY_CODES = ['PS','PK','TR','GB','US','CA','AU','DE','FR','ES','IT','NL','BE','SE','NO','DK','IE','CH','AT','AE','SA','QA','KW','BH','OM','JO','LB','EG','MA','DZ','TN','LY','SD','IQ','SY','YE','ID','MY','BD','IN','LK','NG','ZA','KE','BR','MX','AR','CL','JP','KR','SG','NZ','RU','PL','PT','GR','BA','AL','XK'];

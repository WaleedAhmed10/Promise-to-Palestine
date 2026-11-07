import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';

export default function Newsletter() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');

  async function submit(e) {
    e.preventDefault();
    setState('sending');
    try { await api.subscribe({ email, lang: i18n.resolvedLanguage }); setState('done'); setEmail(''); }
    catch { setState('error'); }
  }

  return (
    <section className="band band--ink" aria-labelledby="nl-title">
      <div className="wrap newsletter">
        <div>
          <h2 id="nl-title">{t('newsletter.title')}</h2>
          <p>{t('newsletter.lead')}</p>
        </div>
        <form onSubmit={submit} className="newsletter__form">
          <label className="sr-only" htmlFor="nl-email">{t('newsletter.email')}</label>
          <input id="nl-email" type="email" required autoComplete="email" placeholder={t('newsletter.email')}
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn btn--light" disabled={state === 'sending'}>{t('newsletter.submit')}</button>
          <p className="newsletter__status" role="status">
            {state === 'done' && t('newsletter.done')}
            {state === 'error' && t('common.error')}
          </p>
        </form>
      </div>
    </section>
  );
}

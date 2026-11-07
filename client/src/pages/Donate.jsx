import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { useCampaign } from '../lib/useCampaign.js';
import { money, countryName, COUNTRY_CODES } from '../lib/format.js';

const PRESETS = [10, 25, 50, 100];

export default function Donate() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [params] = useSearchParams();
  const { campaign } = useCampaign();

  const initial = Number(params.get('amount'));
  const [amount, setAmount] = useState(PRESETS.includes(initial) ? initial : initial > 0 ? 'custom' : 25);
  const [custom, setCustom] = useState(initial > 0 && !PRESETS.includes(initial) ? String(initial) : '');
  const [frequency, setFrequency] = useState('once');
  const [form, setForm] = useState({ name: '', email: '', country: '', message: '', anonymous: false, showAmount: true });
  const [status, setStatus] = useState('idle'); // idle | sending
  const [error, setError] = useState('');

  const value = amount === 'custom' ? Number(custom) : amount;
  const valid = Number.isFinite(value) && value >= 1 && value <= 50000;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const countries = useMemo(
    () => COUNTRY_CODES.map((c) => [c, countryName(c, lang)]).sort((a, b) => a[1].localeCompare(b[1], lang)),
    [lang],
  );

  useEffect(() => { if (params.get('cancelled')) setError(t('donate.cancelled')); }, [params, t]);

  async function submit(e) {
    e.preventDefault();
    if (!valid) { setError(t('donate.minError', { min: money(100, lang) })); return; }
    setError(''); setStatus('sending');
    try {
      const res = await api.pledge({
        amount: Math.round(value * 100) / 100, frequency,
        name: form.name || undefined, email: form.email, country: form.country || undefined,
        message: form.message || undefined, anonymous: form.anonymous, showAmount: form.showAmount, lang,
      });
      window.location.assign(res.redirect);
    } catch (err) {
      setStatus('idle');
      setError(err.status === 429 ? t('donate.tooMany') : err.status === 503 ? t('donate.unavailable') : err.status === 400 ? t('donate.validation') : t('common.error'));
    }
  }

  const label = valid ? money(Math.round(value * 100), lang) : '';
  const unavailable = campaign?.paymentMode === 'unavailable';

  return (
    <div className="wrap page page--narrow">
      <h1>{t('donate.title')}</h1>
      <p className="lead">{t('donate.lead')}</p>
      {campaign?.paymentMode === 'demo' && <p className="notice notice--warn" role="note">{t('donate.demo')}</p>}
      {unavailable && <p className="notice notice--warn" role="status">{t('donate.unavailable')}</p>}

      <form onSubmit={submit} className="form" noValidate>
        <fieldset>
          <legend>{t('donate.frequency')}</legend>
          <div className="seg">
            {['once', 'monthly'].map((f) => (
              <label key={f} className={frequency === f ? 'is-on' : ''}>
                <input type="radio" name="frequency" value={f} checked={frequency === f} onChange={() => setFrequency(f)} />
                {t(`donate.${f}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('donate.amount')}</legend>
          <div className="amounts">
            {PRESETS.map((p) => (
              <label key={p} className={amount === p ? 'is-on' : ''}>
                <input type="radio" name="amount" checked={amount === p} onChange={() => setAmount(p)} />
                {money(p * 100, lang)}
              </label>
            ))}
            <label className={`amounts__custom ${amount === 'custom' ? 'is-on' : ''}`}>
              <input type="radio" name="amount" checked={amount === 'custom'} onChange={() => setAmount('custom')} />
              <span>{t('donate.custom')}</span>
              <input type="number" inputMode="decimal" min="1" max="50000" step="0.01" value={custom} dir="ltr"
                onFocus={() => setAmount('custom')} onChange={(e) => { setAmount('custom'); setCustom(e.target.value); }}
                aria-label={t('donate.custom')} />
            </label>
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="name">{t('donate.name')}</label>
          <input id="name" value={form.name} onChange={set('name')} maxLength={80} autoComplete="name" />
          <small>{t('donate.nameHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="email">{t('donate.email')}</label>
          <input id="email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" dir="ltr" />
          <small>{t('donate.emailHint')}</small>
        </div>
        <div className="field">
          <label htmlFor="country">{t('donate.country')}</label>
          <select id="country" value={form.country} onChange={set('country')}>
            <option value="">{t('donate.countryNone')}</option>
            {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="message">{t('donate.message')}</label>
          <textarea id="message" rows="3" maxLength={280} value={form.message} onChange={set('message')} />
          <small>{t('donate.messageHint')}</small>
        </div>

        <label className="check"><input type="checkbox" checked={form.anonymous} onChange={set('anonymous')} />{t('donate.anonymous')}</label>
        <label className="check"><input type="checkbox" checked={form.showAmount} onChange={set('showAmount')} />{t('donate.showAmount')}</label>

        <p className="form__error" role="alert">{error}</p>
        <button className="btn btn--block" disabled={status === 'sending' || unavailable || !form.email}>
          {status === 'sending' ? t('donate.sending') : valid
            ? t(frequency === 'monthly' ? 'donate.submitMonthly' : 'donate.submit', { amount: label })
            : t('common.donateNow')}
        </button>
        <p className="muted small">{t('donate.secure')}</p>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { money, countryName, dateLong } from '../lib/format.js';

export default function Wall() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [rows, setRows] = useState(null);

  useEffect(() => { api.wall().then(setRows).catch(() => setRows([])); }, []);

  return (
    <section className="band" aria-labelledby="wall-title">
      <div className="wrap wall">
        <div className="wall__intro">
          <h2 id="wall-title">{t('wall.title')}</h2>
          <p>{t('wall.lead')}</p>
        </div>
        {rows && rows.length === 0 && <p className="empty">{t('wall.empty')}</p>}
        <ul className="wall__list">
          {(rows || []).map((r, i) => (
            <li key={i}>
              <div className="wall__who">
                <strong>{r.name || t('wall.anonymous')}</strong>
                {r.country && <span>{countryName(r.country, lang)}</span>}
              </div>
              {r.message && <blockquote>{r.message}</blockquote>}
              <div className="wall__meta">
                {r.amountCents != null && <span>{money(r.amountCents, lang)}{r.frequency === 'monthly' ? ` ${t('wall.monthly')}` : ''}</span>}
                {r.at && <time dateTime={r.at}>{dateLong(r.at, lang)}</time>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

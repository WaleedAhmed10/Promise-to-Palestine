import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { dateLong, localized } from '../lib/format.js';

export default function Stories() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [items, setItems] = useState(null);
  useEffect(() => { api.stories().then(setItems).catch(() => setItems([])); }, []);

  return (
    <div className="wrap page page--narrow">
      <h1>{t('stories.title')}</h1>
      <p className="lead">{t('stories.lead')}</p>
      {items && items.length === 0 && <p className="empty">{t('stories.empty')}</p>}
      <ul className="stories">
        {(items || []).map((s) => (
          <li key={s.slug}>
            <time dateTime={s.publishedAt}>{t('stories.published', { date: dateLong(s.publishedAt, lang) })}</time>
            <h2><Link to={`/stories/${s.slug}`}>{localized(s.title, lang)}</Link></h2>
            <p>{localized(s.summary, lang)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

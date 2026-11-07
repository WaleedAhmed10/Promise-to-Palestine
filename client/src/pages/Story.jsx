import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.js';
import { dateLong, localized } from '../lib/format.js';

export default function Story() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [story, setStory] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => { api.story(slug).then(setStory).catch(() => setMissing(true)); }, [slug]);

  if (missing) return <div className="wrap page"><h1>{t('common.notFound')}</h1><Link to="/stories">{t('nav.stories')}</Link></div>;
  if (!story) return <div className="wrap page"><p className="muted">{t('common.loading')}</p></div>;

  return (
    <article className="wrap page page--narrow prose">
      <time dateTime={story.publishedAt}>{t('stories.published', { date: dateLong(story.publishedAt, lang) })}</time>
      <h1>{localized(story.title, lang)}</h1>
      {story.imageUrl && <img src={story.imageUrl} alt="" loading="lazy" />}
      {localized(story.body, lang).split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      <p><Link to="/stories">{t('nav.stories')}</Link></p>
    </article>
  );
}

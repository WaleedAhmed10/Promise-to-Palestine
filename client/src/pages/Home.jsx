import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCampaign } from '../lib/useCampaign.js';
import { money, number } from '../lib/format.js';
import Tatreez from '../components/Tatreez.jsx';
import Icon from '../components/Icon.jsx';
import Wall from '../components/Wall.jsx';
import Newsletter from '../components/Newsletter.jsx';

export default function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const { campaign: c } = useCampaign();
  const pct = c ? Math.min(100, (c.raisedCents / c.goalCents) * 100) : 0;

  return (
    <>
      <section className="hero">
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <h1>{t('hero.title')}</h1>
            <p className="lead">{t('hero.lead')}</p>
            <div className="hero__actions">
              <Link to="/donate" className="btn">{t('common.donateNow')}</Link>
              <a href="#allocation" className="btn btn--ghost">{t('hero.secondary')}</a>
            </div>

            <div className="progress" aria-live="polite">
              <div className="runstitch" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pct)}>
                <span className="runstitch__fill" style={{ inlineSize: `${pct}%` }} />
              </div>
              {c ? (
                <dl className="stats">
                  <div><dt>{t('progress.raisedOf', { goal: money(c.goalCents, lang, c.currency) })}</dt><dd>{money(c.raisedCents, lang, c.currency)}</dd></div>
                  <div><dt>{t('progress.promises')}</dt><dd>{number(c.supporters, lang)}</dd></div>
                  <div><dt>{t('progress.countries')}</dt><dd>{number(c.countries, lang)}</dd></div>
                </dl>
              ) : <p className="muted">{t('common.loading')}</p>}
            </div>
          </div>
          <Tatreez stitches={c ? c.supporters : 0} />
        </div>
      </section>

      <section className="band band--paper" aria-labelledby="impact-title">
        <div className="wrap">
          <div className="section-head">
            <h2 id="impact-title">{t('impact.title')}</h2>
            <p>{t('impact.lead')}</p>
          </div>
          <ul className="impact">
            {(c?.impact || []).map((i) => (
              <li key={i.key}>
                <Link to={`/donate?amount=${i.amountCents / 100}`} className="impact__row">
                  <span className="impact__icon"><Icon name={i.icon} /></span>
                  <span className="impact__body">
                    <strong>{t(`impact.items.${i.key}.name`)}</strong>
                    <span>{t(`impact.items.${i.key}.text`)}</span>
                  </span>
                  <span className="impact__amount">{t('impact.give', { amount: money(i.amountCents, lang, c.currency) })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band" aria-labelledby="how-title">
        <div className="wrap">
          <div className="section-head"><h2 id="how-title">{t('how.title')}</h2></div>
          <ol className="steps">
            {['choose', 'pay', 'see'].map((k) => (
              <li key={k}><h3>{t(`how.steps.${k}.title`)}</h3><p>{t(`how.steps.${k}.text`)}</p></li>
            ))}
          </ol>
        </div>
      </section>

      {c && (
        <section id="allocation" className="band band--paper" aria-labelledby="alloc-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="alloc-title">{t('allocation.title')}</h2>
              <p>{t('allocation.lead')}</p>
            </div>
            <div className="alloc" role="img" aria-label={Object.entries(c.allocation).map(([k, v]) => `${t(`allocation.${k}`)} ${v}%`).join(', ')}>
              {Object.entries(c.allocation).map(([k, v]) => (
                <span key={k} className={`alloc__seg alloc__seg--${k}`} style={{ flexGrow: v }}>
                  <b>{v}%</b>{t(`allocation.${k}`)}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      <Wall />
      <Newsletter />
    </>
  );
}

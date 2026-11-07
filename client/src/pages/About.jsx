import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="wrap page page--narrow prose">
      <h1>{t('about.title')}</h1>
      <p className="lead">{t('about.p1')}</p>
      <p>{t('about.p2')}</p>
      <h2>{t('about.transparencyTitle')}</h2>
      <p>{t('about.transparencyText')}</p>
      <p><Link to="/donate" className="btn">{t('common.donateNow')}</Link></p>
    </div>
  );
}

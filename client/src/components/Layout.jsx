import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/index.js';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = `${t('brand.name')}: ${t('brand.tagline')}`; }, [t, i18n.resolvedLanguage]);

  return (
    <>
      <a className="skip" href="#main">{t('common.skip')}</a>
      <header className="header">
        <div className="wrap header__row">
          <Link to="/" className="brand" aria-label={t('brand.name')}>
            <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="currentColor" />
              <g stroke="var(--thread)" strokeWidth="3" strokeLinecap="round"><path d="M9 9l14 14M23 9L9 23" /></g>
              <g stroke="var(--stone)" strokeWidth="2" strokeLinecap="round"><path d="M16 5v22M5 16h22" /></g>
            </svg>
            <span className="brand__text">
              <span className="brand__name">{t('brand.name')}</span>
              <span className="brand__tag">{t('brand.tagline')}</span>
            </span>
          </Link>

          <nav className="nav" aria-label={t('nav.main')}>
            <NavLink to="/" end>{t('nav.home')}</NavLink>
            <NavLink to="/stories">{t('nav.stories')}</NavLink>
            <NavLink to="/about">{t('nav.about')}</NavLink>
          </nav>

          <div className="header__tools">
            <label className="lang">
              <span className="sr-only">{t('common.language')}</span>
              <select value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.native}</option>)}
              </select>
            </label>
            <Link to="/donate" className="btn btn--small">{t('nav.donate')}</Link>
          </div>
        </div>
      </header>

      <main id="main"><Outlet /></main>

      <footer className="footer">
        <div className="wrap footer__row">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <p>{t('footer.privacy')}</p>
        </div>
      </footer>
    </>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCampaign } from '../lib/useCampaign.js';
import Tatreez from '../components/Tatreez.jsx';

export default function ThankYou() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { campaign } = useCampaign();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: t('brand.name'), text: t('thanks.shareText'), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch { /* user cancelled */ }
  }

  return (
    <div className="wrap page thanks">
      <div>
        <h1>{t('thanks.title')}</h1>
        <p className="lead">{t('thanks.lead')}</p>
        {params.get('demo') && <p className="notice notice--warn">{t('thanks.demo')}</p>}
        <div className="hero__actions">
          <button className="btn" onClick={share}>{t('thanks.share')}</button>
          <Link to="/" className="btn btn--ghost">{t('common.backHome')}</Link>
        </div>
        <p role="status" className="muted">{copied && t('thanks.copied')}</p>
      </div>
      <Tatreez stitches={campaign ? campaign.supporters : 1} highlightNewest />
    </div>
  );
}

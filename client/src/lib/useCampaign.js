import { useEffect, useState } from 'react';
import { api } from './api.js';

export function useCampaign() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => { api.campaign().then(setData).catch(() => setError(true)); }, []);
  return { campaign: data, error };
}

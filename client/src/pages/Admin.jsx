import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { LANGUAGES } from '../i18n/index.js';

// The admin area is intentionally English-only and not linked from the public site.
const TOKEN_KEY = 'ptp_admin_token';
const store = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (v) => { try { v ? sessionStorage.setItem(TOKEN_KEY, v) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};
const usd = (c) => new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(c / 100);

export default function Admin() {
  const [token, setToken] = useState(store.get());
  const logout = () => { store.set(null); setToken(null); };
  return (
    <div className="wrap page admin" dir="ltr" lang="en">
      {token ? <Dashboard token={token} onLogout={logout} /> : <Login onToken={(t) => { store.set(t); setToken(t); }} />}
    </div>
  );
}

function Login({ onToken }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { onToken((await api.admin.login(f)).token); }
    catch (x) { setErr(x.status === 429 ? 'Too many attempts. Wait 15 minutes.' : 'Email or password is incorrect.'); }
  }
  return (
    <form className="form page--narrow" onSubmit={submit}>
      <h1>Admin sign in</h1>
      <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
      <div className="field"><label htmlFor="a-pass">Password</label><input id="a-pass" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
      <p className="form__error" role="alert">{err}</p>
      <button className="btn">Sign in</button>
    </form>
  );
}

function Dashboard({ token, onLogout }) {
  const [tab, setTab] = useState('pledges');
  const [summary, setSummary] = useState(null);
  const guard = useCallback((p) => p.catch((e) => { if (e.status === 401) onLogout(); throw e; }), [onLogout]);
  const loadSummary = useCallback(() => guard(api.admin.summary(token)).then(setSummary).catch(() => {}), [guard, token]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  return (
    <>
      <div className="admin__top">
        <h1>Dashboard</h1>
        <button className="btn btn--ghost btn--small" onClick={onLogout}>Sign out</button>
      </div>
      {summary && (
        <dl className="stats stats--admin">
          <div><dt>Raised</dt><dd>{usd(summary.raisedCents)}</dd></div>
          <div><dt>Completed pledges</dt><dd>{summary.completed}</dd></div>
          <div><dt>Monthly givers</dt><dd>{summary.monthly}</dd></div>
          <div><dt>Pending</dt><dd>{summary.pending}</dd></div>
          <div><dt>Subscribers</dt><dd>{summary.subscribers}</dd></div>
        </dl>
      )}
      <div className="tabs" role="tablist">
        {['pledges', 'stories', 'campaign'].map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} className={tab === x ? 'is-on' : ''} onClick={() => setTab(x)}>{x[0].toUpperCase() + x.slice(1)}</button>
        ))}
      </div>
      {tab === 'pledges' && <Pledges token={token} guard={guard} onChange={loadSummary} />}
      {tab === 'stories' && <StoriesAdmin token={token} guard={guard} />}
      {tab === 'campaign' && <CampaignAdmin token={token} guard={guard} onChange={loadSummary} />}
    </>
  );
}

function Pledges({ token, guard, onChange }) {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState([]);
  const load = useCallback(() => guard(api.admin.pledges(token, status)).then(setRows).catch(() => {}), [guard, token, status]);
  useEffect(() => { load(); }, [load]);
  const patch = async (id, body) => { await guard(api.admin.patchPledge(token, id, body)); load(); onChange(); };

  return (
    <>
      <label className="inline">Status <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option>{['completed', 'pending', 'failed', 'refunded'].map((s) => <option key={s}>{s}</option>)}
      </select></label>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Date</th><th>Donor</th><th>Email</th><th>Amount</th><th>Status</th><th>On wall</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{r.donor_name || '—'}{r.is_anonymous ? ' (anon)' : ''}</td>
                <td>{r.email}</td>
                <td>{usd(r.amount_cents)}{r.frequency === 'monthly' ? '/mo' : ''}</td>
                <td>{r.status} <small>({r.provider})</small></td>
                <td><input type="checkbox" checked={r.is_visible} onChange={(e) => patch(r.id, { isVisible: e.target.checked })} aria-label={`Show pledge ${r.id} on wall`} /></td>
                <td>{r.status === 'pending' && <button className="linkbtn" onClick={() => confirm('Mark as paid? Use this for confirmed bank transfers only.') && patch(r.id, { status: 'completed' })}>Mark paid</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No pledges.</p>}
      </div>
    </>
  );
}

const blank = { id: null, slug: '', imageUrl: '', isPublished: true, title: {}, summary: {}, body: {} };

function StoriesAdmin({ token, guard }) {
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);
  const [lang, setLang] = useState('en');
  const [msg, setMsg] = useState('');
  const load = useCallback(() => guard(api.admin.stories(token)).then(setList).catch(() => {}), [guard, token]);
  useEffect(() => { load(); }, [load]);

  const open = (s) => setEdit(s ? { id: s.id, slug: s.slug, imageUrl: s.image_url || '', isPublished: s.is_published, title: s.title, summary: s.summary, body: s.body } : { ...blank });
  const setField = (k, v) => setEdit((e) => ({ ...e, [k]: { ...e[k], [lang]: v } }));
  const clean = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v && v.trim()));

  async function save(e) {
    e.preventDefault(); setMsg('');
    const payload = { slug: edit.slug, imageUrl: edit.imageUrl || null, isPublished: edit.isPublished, title: clean(edit.title), summary: clean(edit.summary), body: clean(edit.body) };
    try {
      await guard(edit.id ? api.admin.updateStory(token, edit.id, payload) : api.admin.createStory(token, payload));
      setEdit(null); load();
    } catch (x) { setMsg(x.data?.error === 'slug_taken' ? 'That slug is already used.' : 'Could not save. English title and body are required; slug must be lowercase-with-dashes.'); }
  }

  if (edit) {
    return (
      <form className="form" onSubmit={save}>
        <div className="field"><label>Slug</label><input value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} required /></div>
        <div className="field"><label>Image URL (optional)</label><input value={edit.imageUrl} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} dir="ltr" /></div>
        <label className="check"><input type="checkbox" checked={edit.isPublished} onChange={(e) => setEdit({ ...edit, isPublished: e.target.checked })} />Published</label>
        <div className="tabs">{LANGUAGES.map((l) => <button type="button" key={l.code} className={lang === l.code ? 'is-on' : ''} onClick={() => setLang(l.code)}>{l.code.toUpperCase()}</button>)}</div>
        <div className="field" dir={['ar', 'ur'].includes(lang) ? 'rtl' : 'ltr'}>
          <label>Title ({lang})</label><input value={edit.title[lang] || ''} onChange={(e) => setField('title', e.target.value)} />
          <label>Summary ({lang})</label><input value={edit.summary[lang] || ''} onChange={(e) => setField('summary', e.target.value)} />
          <label>Body ({lang}). Blank line = new paragraph</label><textarea rows="8" value={edit.body[lang] || ''} onChange={(e) => setField('body', e.target.value)} />
        </div>
        <p className="form__error" role="alert">{msg}</p>
        <div className="hero__actions"><button className="btn">Save</button><button type="button" className="btn btn--ghost" onClick={() => setEdit(null)}>Cancel</button></div>
      </form>
    );
  }
  return (
    <>
      <p><button className="btn btn--small" onClick={() => open(null)}>New update</button></p>
      <ul className="admin__list">
        {list.map((s) => (
          <li key={s.id}>
            <span>{s.title.en || s.slug} {!s.is_published && <small>(draft)</small>}</span>
            <span><button className="linkbtn" onClick={() => open(s)}>Edit</button>{' '}
              <button className="linkbtn" onClick={async () => { if (confirm('Delete this update?')) { await guard(api.admin.deleteStory(token, s.id)); load(); } }}>Delete</button></span>
          </li>
        ))}
      </ul>
    </>
  );
}

function CampaignAdmin({ token, guard, onChange }) {
  const [goal, setGoal] = useState('');
  const [alloc, setAlloc] = useState({ food: 30, water: 20, medical: 30, shelter: 20 });
  const [msg, setMsg] = useState('');
  const total = Object.values(alloc).reduce((a, b) => a + Number(b || 0), 0);

  useEffect(() => { api.campaign().then((c) => { setGoal(String(c.goalCents / 100)); setAlloc(c.allocation); }); }, []);

  async function save(e) {
    e.preventDefault(); setMsg('');
    try {
      await guard(api.admin.campaign(token, { goal: Number(goal), allocation: Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, Number(v)])) }));
      setMsg('Saved.'); onChange();
    } catch { setMsg('Could not save. Allocation must total 100%.'); }
  }
  return (
    <form className="form page--narrow" onSubmit={save}>
      <div className="field"><label htmlFor="goal">Fundraising goal (USD)</label><input id="goal" type="number" min="1" value={goal} onChange={(e) => setGoal(e.target.value)} /></div>
      {Object.keys(alloc).map((k) => (
        <div className="field" key={k}><label htmlFor={`al-${k}`}>{k} (%)</label>
          <input id={`al-${k}`} type="number" min="0" max="100" value={alloc[k]} onChange={(e) => setAlloc({ ...alloc, [k]: e.target.value })} /></div>
      ))}
      <p className={total === 100 ? 'muted' : 'form__error'}>Total: {total}%</p>
      <p role="status">{msg}</p>
      <button className="btn" disabled={total !== 100}>Save</button>
    </form>
  );
}

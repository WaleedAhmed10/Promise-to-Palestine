import { Routes, Route, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Donate from './pages/Donate.jsx';
import Stories from './pages/Stories.jsx';
import Story from './pages/Story.jsx';
import About from './pages/About.jsx';
import ThankYou from './pages/ThankYou.jsx';
import Admin from './pages/Admin.jsx';

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="wrap page"><h1>{t('common.notFound')}</h1><p><Link to="/">{t('common.backHome')}</Link></p></div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="donate" element={<Donate />} />
        <Route path="stories" element={<Stories />} />
        <Route path="stories/:slug" element={<Story />} />
        <Route path="about" element={<About />} />
        <Route path="thank-you" element={<ThankYou />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

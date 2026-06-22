import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav.tsx';
import { Overview } from './routes/Overview.tsx';
import { HostDetail } from './routes/HostDetail.tsx';
import { Containers } from './routes/Containers.tsx';
import { NotAuthenticated } from './routes/NotAuthenticated.tsx';
import { useMe } from './hooks/useMe.ts';

export function App() {
  const { data: me } = useMe();
  if (me?.required && !me.user) {
    return <NotAuthenticated logoutUrl={me.logoutUrl} />;
  }
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/host/:id" element={<HostDetail />} />
        <Route path="/containers" element={<Containers />} />
      </Routes>
    </>
  );
}

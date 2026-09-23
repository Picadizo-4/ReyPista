// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/ui/Layout';
import { GlobalDashboard } from './features/dashboard/GlobalDashboard';
import { TournamentView } from './features/tournaments/TournamentView';

function App() {
  return (
    <BrowserRouter>
      {/* Proveedor de notificaciones toast */}
      <Toaster position="bottom-center" />
      
      <Layout>
        <Routes>
          <Route path="/" element={<GlobalDashboard />} />
          <Route path="/tournament/:id" element={<TournamentView />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
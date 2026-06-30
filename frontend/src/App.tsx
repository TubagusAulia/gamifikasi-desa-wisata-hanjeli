import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { KelompokListPage } from '@/pages/KelompokListPage';
import { KelompokDetailPage } from '@/pages/KelompokDetailPage';
import { AgendaListPage } from '@/pages/AgendaListPage';
import { AgendaDetailPage } from '@/pages/AgendaDetailPage';
import { QuizDetailPage } from '@/pages/QuizDetailPage';
import { PesertaAgendaPage } from '@/pages/PesertaAgendaPage';
import { PesertaReviewPage } from '@/pages/PesertaReviewPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PetaPage } from '@/pages/PetaPage';
import { QuizStartPage } from '@/pages/QuizStartPage';
import { QuizTakingPage } from '@/pages/QuizTakingPage';
import { SubmitFotoPage } from '@/pages/SubmitFotoPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function DefaultRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'peserta') return <Navigate to="/peta" replace />;
  if (user.role === 'worker') return <Navigate to="/peta" replace />;
  return <Navigate to="/kelompok" replace />;
}

function App() {
  const { token, loadSession } = useAuthStore();

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useSocket(token);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin & Worker routes */}
        <Route path="/kelompok" element={<ProtectedRoute roles={['admin']}><KelompokListPage /></ProtectedRoute>} />
        <Route path="/kelompok/:id" element={<ProtectedRoute roles={['admin']}><KelompokDetailPage /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute roles={['admin']}><AgendaListPage /></ProtectedRoute>} />
        <Route path="/agenda/:id" element={<ProtectedRoute roles={['admin']}><AgendaDetailPage /></ProtectedRoute>} />
        <Route path="/leaderboard/:type/:id" element={<ProtectedRoute roles={['admin', 'worker']}><LeaderboardPage /></ProtectedRoute>} />

        {/* Quiz detail — admin & worker only */}
        <Route path="/agenda/:id" element={<ProtectedRoute roles={['admin', 'worker']}><QuizDetailPage /></ProtectedRoute>} />

        {/* Quiz start — all roles (landing page before entering quiz) */}
        <Route path="/quiz/start" element={<ProtectedRoute><QuizStartPage /></ProtectedRoute>} />

        {/* Collection detail — admin/worker view for photo collections */}
        <Route path="/collection/:id" element={<ProtectedRoute roles={['admin', 'worker']}><CollectionDetailPage /></ProtectedRoute>} />

        {/* Quiz taking — all roles (peserta takes, admin/worker can preview) */}
        <Route path="/quiz/take/:quizId" element={<ProtectedRoute><QuizTakingPage /></ProtectedRoute>} />

        {/* Peta — all roles */}
        <Route path="/peta" element={<ProtectedRoute><PetaPage /></ProtectedRoute>} />
        <Route path="/submit-foto" element={<ProtectedRoute><SubmitFotoPage /></ProtectedRoute>} />

        {/* Peserta routes */}
        <Route path="/my-agenda" element={<ProtectedRoute roles={['peserta']}><PesertaAgendaPage /></ProtectedRoute>} />
        <Route path="/my-review" element={<ProtectedRoute roles={['peserta']}><PesertaReviewPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<DefaultRedirect />} />
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

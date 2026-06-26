import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/hooks/useSocket';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { KelompokListPage } from '@/pages/KelompokListPage';
import { KelompokDetailPage } from '@/pages/KelompokDetailPage';
import { QuizListPage } from '@/pages/QuizListPage';
import { QuizDetailPage } from '@/pages/QuizDetailPage';
import { SesiDetailPage } from '@/pages/SesiDetailPage';
import { ReviewListPage } from '@/pages/ReviewListPage';
import { ReviewDetailPage } from '@/pages/ReviewDetailPage';
import { PesertaQuizPage } from '@/pages/PesertaQuizPage';
import { PesertaReviewPage } from '@/pages/PesertaReviewPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { PetaPage } from '@/pages/PetaPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
        <Route path="/kelompok" element={<ProtectedRoute roles={['admin', 'worker']}><KelompokListPage /></ProtectedRoute>} />
        <Route path="/kelompok/:id" element={<ProtectedRoute roles={['admin', 'worker']}><KelompokDetailPage /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute roles={['admin', 'worker']}><QuizListPage /></ProtectedRoute>} />
        <Route path="/quiz/:id" element={<ProtectedRoute roles={['admin', 'worker']}><QuizDetailPage /></ProtectedRoute>} />
        <Route path="/sesi/:id" element={<ProtectedRoute roles={['admin', 'worker']}><SesiDetailPage /></ProtectedRoute>} />
        <Route path="/review" element={<ProtectedRoute roles={['admin', 'worker']}><ReviewListPage /></ProtectedRoute>} />
        <Route path="/review/:id" element={<ProtectedRoute roles={['admin', 'worker']}><ReviewDetailPage /></ProtectedRoute>} />
        <Route path="/peta" element={<ProtectedRoute roles={['admin', 'worker']}><PetaPage /></ProtectedRoute>} />
        <Route path="/leaderboard/:type/:id" element={<ProtectedRoute roles={['admin', 'worker']}><LeaderboardPage /></ProtectedRoute>} />

        {/* Peserta routes */}
        <Route path="/my-quiz" element={<ProtectedRoute roles={['peserta']}><PesertaQuizPage /></ProtectedRoute>} />
        <Route path="/my-review" element={<ProtectedRoute roles={['peserta']}><PesertaReviewPage /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/kelompok" replace />} />
        <Route path="*" element={<Navigate to="/kelompok" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

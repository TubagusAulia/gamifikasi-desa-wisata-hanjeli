import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { agendaApi, kelompokApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Play, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { isSessionActive } from '@/utils/session';
import type { Agenda, QuizSession } from '@/types';

export function PesertaAgendaPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const kelompokId = user?.kelompok_id;

  const { data: kelompok, isLoading: loadingKelompok } = useQuery({
    queryKey: ['kelompok', kelompokId],
    queryFn: () => kelompokApi.getById(kelompokId!),
    enabled: !!kelompokId,
  });

  const { data: agendaList, isLoading: loadingQuiz } = useQuery({
    queryKey: ['kelompok', kelompokId, 'quiz'],
    queryFn: () => kelompokApi.getQuiz(kelompokId!),
    enabled: !!kelompokId,
  });

  const handleStartQuiz = (s: QuizSession) => {
    navigate('/quiz/start', { state: { sesiId: s.id } });
  };

  const isLoading = loadingKelompok || loadingQuiz;

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-text mb-6">Quiz Saya</h1>
        <p className="text-text-muted mb-6">
          Quiz yang tersedia untuk kelompok: <span className="font-medium text-text">{kelompok?.nama ?? '-'}</span>
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {agendaList && agendaList.length > 0 ? (
          <div className="space-y-4">
            {agendaList.map((agenda) => (
              <div key={agenda.id} className="card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-secondary-50 rounded-lg flex items-center justify-center">
                    <BookOpen size={20} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">{agenda.nama}</h3>
                    {agenda.deskripsi && (
                      <p className="text-sm text-text-muted mt-0.5">{agenda.deskripsi}</p>
                    )}
                  </div>
                </div>

                {/* Quiz list (sesi) */}
                {agenda.sesi && agenda.sesi.length > 0 ? (
                  <div className="space-y-2 mt-4 pt-4 border-t border-border-light">
                    <p className="text-sm font-medium text-text mb-2">Quiz Tersedia:</p>
                    {agenda.sesi.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border-light"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-medium text-text">{s.nama}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                isSessionActive(s)
                                  ? 'bg-success-50 text-success-dark'
                                  : s.status === 'completed'
                                  ? 'bg-gray-100 text-text-muted'
                                  : 'bg-warning-50 text-warning-dark'
                              }`}>
                                {isSessionActive(s) ? 'Aktif' : s.status === 'completed' ? 'Selesai' : 'Belum Aktif'}
                              </span>
                              <span className="text-xs text-text-muted">
                                {s.tipe === 'kelompok' ? 'Kelompok' : 'Individu'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSessionActive(s) ? (
                          <button
                            onClick={() => handleStartQuiz(s)}
                            className="btn-success text-sm flex items-center gap-1"
                          >
                            <Play size={14} />
                            Mulai
                          </button>
                        ) : s.status === 'completed' ? (
                          <span className="text-xs text-success flex items-center gap-1">
                            <CheckCircle size={14} />
                            Selesai
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <Clock size={14} />
                            Belum Aktif
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted mt-2">Belum ada quiz tersedia.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted">Belum ada quiz tersedia untuk kelompok Anda.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { quizApi, kelompokApi, sesiApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { BookOpen, Clock, CheckCircle, Play, Loader2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import type { Quiz, Sesi } from '@/types';

export function PesertaQuizPage() {
  const { user } = useAuthStore();
  const [activeSesi, setActiveSesi] = useState<Sesi | null>(null);
  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ skor: number; jumlah_benar: number } | null>(null);

  const kelompokId = user?.kelompok_id;

  const { data: kelompok, isLoading: loadingKelompok } = useQuery({
    queryKey: ['kelompok', kelompokId],
    queryFn: () => kelompokApi.getById(kelompokId!),
    enabled: !!kelompokId,
  });

  const { data: quizList, isLoading: loadingQuiz } = useQuery({
    queryKey: ['kelompok', kelompokId, 'quiz'],
    queryFn: () => kelompokApi.getQuiz(kelompokId!),
    enabled: !!kelompokId,
  });

  const { data: soalList, isLoading: loadingSoal } = useQuery({
    queryKey: ['sesi', activeSesi?.id, 'soal'],
    queryFn: () => sesiApi.getSesi(activeSesi!.id).then(() => sesiApi.getSesi(activeSesi!.id)),
    enabled: !!activeSesi && !quizCompleted,
  });

  const { data: actualSoalList } = useQuery({
    queryKey: ['sesi', activeSesi?.id, 'soals'],
    queryFn: () => sesiApi.getSesi(activeSesi!.id).then(() => []),
    enabled: false,
  });

  const handleStartQuiz = async (sesi: Sesi) => {
    setActiveSesi(sesi);
    setCurrentSoalIndex(0);
    setSelectedAnswers({});
    setQuizCompleted(false);
    setQuizResult(null);
  };

  const handleSelectAnswer = (soalId: number, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [soalId]: answer }));
  };

  const handleNextSoal = () => {
    if (activeSesi && currentSoalIndex < (activeSesi.soal_count || 0) - 1) {
      setCurrentSoalIndex((prev) => prev + 1);
    }
  };

  const handlePrevSoal = () => {
    if (currentSoalIndex > 0) {
      setCurrentSoalIndex((prev) => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeSesi || !user) return;
    try {
      const answers = Object.entries(selectedAnswers).map(([soal_id, jawaban]) => ({
        soal_id: Number(soal_id),
        jawaban,
      }));
      const result = await sesiApi.submit(activeSesi.id, {
        peserta_id: user.id,
        answers,
      });
      setQuizResult(result);
      setQuizCompleted(true);
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const handleCloseQuiz = () => {
    setActiveSesi(null);
    setQuizCompleted(false);
    setQuizResult(null);
  };

  const isLoading = loadingKelompok || loadingQuiz;

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quiz Taking Mode */}
        {activeSesi && !quizCompleted && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text">{activeSesi.nama}</h2>
              <button
                onClick={handleCloseQuiz}
                className="text-text-muted hover:text-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-text-muted">
                <span>Soal {currentSoalIndex + 1} dari {activeSesi.soal_count || '?'}</span>
                <span>{Object.keys(selectedAnswers).length} terjawab</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentSoalIndex + 1) / (activeSesi.soal_count || 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Placeholder soal display */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-surface-alt rounded-lg border border-border">
                <p className="font-medium text-text mb-3">
                  Soal {currentSoalIndex + 1}
                </p>
                <p className="text-text-muted text-sm mb-4">
                  Pertanyaan untuk soal {currentSoalIndex + 1} akan ditampilkan di sini.
                  (Data soal akan dimuat dari server)
                </p>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSelectAnswer(currentSoalIndex, option)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedAnswers[currentSoalIndex] === option
                          ? 'border-primary bg-primary-50 text-primary-dark'
                          : 'border-border hover:border-primary/40 text-text'
                      }`}
                    >
                      <span className="font-medium mr-2">{option}.</span>
                      Opsi {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevSoal}
                disabled={currentSoalIndex === 0}
                className="btn-ghost"
              >
                Sebelumnya
              </button>
              {currentSoalIndex < (activeSesi.soal_count || 1) - 1 ? (
                <button
                  onClick={handleNextSoal}
                  className="btn-secondary"
                >
                  Selanjutnya
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(selectedAnswers).length === 0}
                  className="btn-success"
                >
                  Submit Jawaban
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quiz Result */}
        {activeSesi && quizCompleted && quizResult && (
          <div className="card text-center">
            <CheckCircle size={48} className="mx-auto text-success mb-4" />
            <h2 className="text-2xl font-bold text-text mb-2">Quiz Selesai!</h2>
            <p className="text-text-muted mb-6">Anda telah menyelesaikan quiz ini.</p>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
              <div className="p-4 bg-primary-50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{quizResult.skor}</p>
                <p className="text-xs text-text-muted">Total Skor</p>
              </div>
              <div className="p-4 bg-success-50 rounded-lg">
                <p className="text-2xl font-bold text-success">{quizResult.jumlah_benar}</p>
                <p className="text-xs text-text-muted">Jawaban Benar</p>
              </div>
            </div>
            <button
              onClick={handleCloseQuiz}
              className="btn-primary"
            >
              Kembali ke Daftar Quiz
            </button>
          </div>
        )}

        {/* Quiz List Mode */}
        {!activeSesi && (
          <>
            <h1 className="text-2xl font-bold text-text mb-6">Quiz Saya</h1>
            <p className="text-text-muted mb-6">
              Quiz yang tersedia untuk kelompok Anda
            </p>

            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            )}

            {quizList && quizList.length > 0 ? (
              <div className="space-y-4">
                {quizList.map((quiz) => (
                  <div key={quiz.id} className="card">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-secondary-50 rounded-lg flex items-center justify-center">
                        <BookOpen size={20} className="text-secondary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-text">{quiz.nama}</h3>
                        {quiz.deskripsi && (
                          <p className="text-sm text-text-muted mt-0.5">{quiz.deskripsi}</p>
                        )}
                      </div>
                    </div>

                    {/* Sesi list */}
                    {quiz.sesi && quiz.sesi.length > 0 ? (
                      <div className="space-y-2 mt-4 pt-4 border-t border-border-light">
                        <p className="text-sm font-medium text-text mb-2">Sesi Tersedia:</p>
                        {quiz.sesi.map((sesi) => (
                          <div
                            key={sesi.id}
                            className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border-light"
                          >
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium text-text">{sesi.nama}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    sesi.status === 'active'
                                      ? 'bg-success-50 text-success-dark'
                                      : sesi.status === 'completed'
                                      ? 'bg-gray-100 text-text-muted'
                                      : 'bg-warning-50 text-warning-dark'
                                  }`}>
                                    {sesi.status === 'active' ? 'Aktif' : sesi.status === 'completed' ? 'Selesai' : 'Nonaktif'}
                                  </span>
                                  <span className="text-xs text-text-muted">
                                    {sesi.tipe}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {sesi.status === 'active' && (
                              <button
                                onClick={() => handleStartQuiz(sesi)}
                                className="btn-success text-sm flex items-center gap-1"
                              >
                                <Play size={14} />
                                Mulai
                              </button>
                            )}
                            {sesi.status === 'completed' && (
                              <span className="text-xs text-success flex items-center gap-1">
                                <CheckCircle size={14} />
                                Selesai
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted mt-2">Belum ada sesi tersedia.</p>
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
          </>
        )}
      </main>
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { quizApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { CheckCircle, Play, X, AlertCircle, Loader2, ArrowLeft, Clock, Users, Lock } from 'lucide-react';
import { isQuizActive } from '@/utils/session';
import type { QuizSession, Soal } from '@/types';

export function QuizTakingPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const id = Number(quizId);

  const [currentSoalIndex, setCurrentSoalIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState<{ skor: number; jumlah_benar: number } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);

  const { data: quiz, isLoading: loadingQuiz, error: errorQuiz } = useQuery({
    queryKey: ['quiz', id],
    queryFn: () => quizApi.getById(id),
    enabled: !!id,
  });

  const { data: soalList, isLoading: loadingSoal } = useQuery({
    queryKey: ['quiz', id, 'soal'],
    queryFn: () => quizApi.getSoal(id),
    enabled: !!id && isQuizActive(quiz) && !quizCompleted && passwordVerified,
  });

  const handleVerifyPassword = () => {
    if (!quiz) return;
    if (passwordInput === quiz.password) {
      setPasswordVerified(true);
      setPasswordError('');
    } else {
      setPasswordError('Password salah. Silakan coba lagi.');
    }
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      quizApi.submit(id, {
        peserta_id: user?.id ?? 0,
        answers: Object.entries(selectedAnswers).map(([soal_id, jawaban]) => ({
          soal_id: Number(soal_id),
          jawaban,
        })),
      }),
    onSuccess: (result) => {
      setQuizResult(result);
      setQuizCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  const handleSelectAnswer = (soalId: number, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [soalId]: answer }));
  };

  const handleSubmit = async () => {
    if (Object.keys(selectedAnswers).length === 0) return;
    try {
      await submitMutation.mutateAsync();
    } catch {
      // error handled by mutation
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loadingQuiz || (loadingSoal && passwordVerified)) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (errorQuiz || !quiz) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data quiz.
          </div>
        </div>
      </div>
    );
  }

  // Password gate — must enter password before quiz starts
  if (!passwordVerified && quiz.password) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text">Masukkan Password Quiz</h2>
            <p className="text-text-muted mt-2 text-sm">Quiz &quot;{quiz.nama}&quot; memerlukan password untuk memulai.</p>
          </div>
          <div className="card">
            <label className="block text-sm font-medium text-text mb-2">Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              placeholder="Masukkan password"
              className="input-field"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-danger mt-2 flex items-center gap-1">
                <AlertCircle size={14} />
                {passwordError}
              </p>
            )}
            <button
              onClick={handleVerifyPassword}
              disabled={!passwordInput.trim()}
              className="btn-primary w-full mt-4"
            >
              Mulai Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not active yet
  if (!isQuizActive(quiz)) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <div className="card text-center py-12">
            <Clock size={48} className="mx-auto text-warning mb-4" />
            <h2 className="text-xl font-bold text-text mb-2">Quiz Belum Aktif</h2>
            <p className="text-text-muted mb-4">Quiz &quot;{quiz.nama}&quot; belum memasuki waktu pengerjaan.</p>
          </div>
        </div>
      </div>
    );
  }

  // Quiz completed - show result
  if (quizCompleted && quizResult) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="card text-center py-12">
            <CheckCircle size={64} className="mx-auto text-success mb-4" />
            <h2 className="text-2xl font-bold text-text mb-2">Quiz Selesai!</h2>
            <p className="text-text-muted mb-8">Anda telah menyelesaikan quiz ini.</p>
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
              <div className="p-4 bg-primary-50 rounded-xl">
                <p className="text-3xl font-bold text-primary">{quizResult.skor}</p>
                <p className="text-sm text-text-muted">Total Skor</p>
              </div>
              <div className="p-4 bg-success-50 rounded-xl">
                <p className="text-3xl font-bold text-success">{quizResult.jumlah_benar}</p>
                <p className="text-sm text-text-muted">Jawaban Benar</p>
              </div>
            </div>
            <button onClick={handleClose} className="btn-primary">
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Kelompok type - admin records which soal answered correctly
  if (quiz.tipe === 'kelompok') {
    return <KelompokQuizView quizId={id} soalList={soalList ?? []} kelompokId={user?.kelompok_id ?? 0} />;
  }

  // Individual type - show questions
  const questions = soalList ?? [];
  const currentSoal: Soal | undefined = questions[currentSoalIndex];
  const totalSoal = questions.length;

  if (totalSoal === 0) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={handleClose} className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
            <X size={16} />
            Tutup Quiz
          </button>
          <div className="card text-center py-12">
            <AlertCircle size={32} className="mx-auto text-warning mb-3" />
            <p className="text-text-muted">Tidak ada soal untuk quiz ini.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button onClick={handleClose} className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <X size={16} />
          Tutup Quiz
        </button>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">{quiz.nama}</h2>
            <span className="badge-primary">{currentSoalIndex + 1}/{totalSoal}</span>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((currentSoalIndex + 1) / totalSoal) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-sm text-text-muted">
              <span>{Object.keys(selectedAnswers).length} terjawab</span>
              <span>{Math.round(((currentSoalIndex + 1) / totalSoal) * 100)}%</span>
            </div>
          </div>

          {currentSoal && (
            <>
              <div className="space-y-4 mb-6">
                <div className="p-5 bg-surface-alt rounded-lg border border-border">
                  <h3 className="font-semibold text-text text-lg mb-1">
                    Soal {currentSoalIndex + 1}
                  </h3>
                  <p className="text-text">{currentSoal.pertanyaan}</p>
                </div>

                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as const).map((label) => {
                    const option = currentSoal[`opsi_${label.toLowerCase()}` as keyof Soal];
                    if (!option) return null;
                    const isSelected = selectedAnswers[currentSoal.id] === label;
                    return (
                      <button
                        key={label}
                        onClick={() => handleSelectAnswer(currentSoal.id, label)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-primary bg-primary-50 text-primary-dark'
                            : 'border-border hover:border-primary/40 text-text'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-surface-alt text-text-muted'
                        }`}>
                          {label}
                        </span>
                        <span className="text-sm font-medium">{option as string}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentSoalIndex((i) => Math.max(0, i - 1))}
                  disabled={currentSoalIndex === 0}
                  className="btn-ghost"
                >
                  Sebelumnya
                </button>
                {currentSoalIndex < totalSoal - 1 ? (
                  <button
                    onClick={() => setCurrentSoalIndex((i) => i + 1)}
                    className="btn-secondary"
                  >
                    Selanjutnya
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || Object.keys(selectedAnswers).length === 0}
                    className="btn-success"
                  >
                    {submitMutation.isPending ? 'Mengirim...' : 'Submit Jawaban'}
                  </button>
                )}
              </div>

              {submitMutation.isError && (
                <div className="mt-4 p-3 bg-danger-50 text-danger rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  Gagal submit jawaban. Silakan coba lagi.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KelompokQuizView({ quizId, soalList, kelompokId }: { quizId: number; soalList: Soal[]; kelompokId: number }) {
  const queryClient = useQueryClient();
  const [pesertaId, setPesertaId] = useState('');
  const [submittedSoals, setSubmittedSoals] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const handleAnswer = async (soalId: number) => {
    if (!pesertaId.trim()) {
      setError('Masukkan ID Peserta terlebih dahulu');
      return;
    }
    try {
      await quizApi.kelompokAnswer(quizId, {
        kelompok_id: kelompokId,
        soal_id: soalId,
        peserta_id: Number(pesertaId),
      });
      setSubmittedSoals(prev => new Set([...prev, soalId]));
      setError('');
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } catch {
      setError('Gagal mencatat jawaban');
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali
        </Link>

        <div className="card mb-6">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-accent" />
            <div>
              <h1 className="text-xl font-bold text-text">Quiz Kelompok</h1>
              <p className="text-sm text-text-muted">{soalList.length} Soal | Kelompok ID: {kelompokId}</p>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <label className="block text-sm font-medium text-text mb-2">ID Peserta yang Menjawab</label>
          <input
            type="number"
            value={pesertaId}
            onChange={(e) => { setPesertaId(e.target.value); setError(''); }}
            placeholder="Masukkan ID peserta"
            className="input-field"
          />
          {error && <p className="text-sm text-danger mt-1">{error}</p>}
        </div>

        <div className="space-y-3">
          {soalList.map((soal, idx) => {
            const answered = submittedSoals.has(soal.id);
            return (
              <div key={soal.id} className={`card flex items-center justify-between ${answered ? 'border-success bg-success-50/30' : ''}`}>
                <div className="flex-1">
                  <p className="font-medium text-text">Soal #{idx + 1}</p>
                  <p className="text-text-muted text-sm">{soal.pertanyaan}</p>
                </div>
                <button
                  onClick={() => handleAnswer(soal.id)}
                  disabled={answered}
                  className={`btn-${answered ? 'ghost' : 'secondary'} text-sm flex items-center gap-1`}
                >
                  {answered ? <CheckCircle size={14} /> : <Play size={14} />}
                  {answered ? 'Terjawab' : 'Tandai Benar'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

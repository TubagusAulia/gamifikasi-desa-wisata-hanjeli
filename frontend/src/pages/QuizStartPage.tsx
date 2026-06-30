import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { locationApi, leaderboardApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { ArrowLeft, Clock, MapPin, Users, BookOpen, Loader2, AlertCircle, Lock, Play, Trophy } from 'lucide-react';
import type { CurrentQuizData, LeaderboardEntry } from '@/types';

export function QuizStartPage() {
  const navigate = useNavigate();

  const { data: currentQuiz, isLoading, error } = useQuery({
    queryKey: ['current-quiz'],
    queryFn: () => locationApi.getCurrentQuiz(),
  });

  const quiz = currentQuiz ?? null;
  const quizId = quiz?.quiz_id ?? null;

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', 'quiz', quizId],
    queryFn: () => leaderboardApi.getQuiz(quizId!),
    enabled: !!quizId,
  });

  const handleStart = () => {
    if (quizId) navigate(`/quiz/take/${quizId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
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

  // No quiz found at current location
  if (!quiz) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/peta" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
            <ArrowLeft size={16} />
            Kembali ke Peta
          </Link>
          <div className="card text-center py-12">
            <MapPin size={48} className="mx-auto text-text-muted mb-4" />
            <h2 className="text-xl font-bold text-text mb-2">Tidak Ada Quiz di Lokasi Anda</h2>
            <p className="text-text-muted mb-4">
              {currentQuiz === null
                ? 'Anda belum berada di dalam radius POS. Silakan menuju ke POS untuk mengakses quiz.'
                : 'Tidak ada quiz aktif di POS ini saat ini.'}
            </p>
            <Link to="/peta" className="btn-primary">
              Lihat Peta POS
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const parseSessionDate = (value?: string | null) => value ? new Date(value.replace(' ', 'T')) : null;
  const now = new Date();
  const mulaiDate = parseSessionDate(quiz.waktu_mulai);
  const selesaiDate = parseSessionDate(quiz.waktu_selesai);
  const isExpired = selesaiDate ? selesaiDate < now : false;
  const isUpcoming = mulaiDate ? mulaiDate > now : false;
  const isActive = quiz.status === 'active' && quiz.is_time_valid && !isExpired && !isUpcoming;
  const hasSubmitted = quiz.has_submitted === true;

  const getStatusInfo = (): { label: string; color: string; icon: React.ReactNode } => {
    if (isExpired) {
      return { label: 'Sudah Berakhir', color: 'bg-gray-100 text-text-muted', icon: <Clock size={14} /> };
    }
    if (isUpcoming) {
      return { label: 'Belum Dimulai', color: 'bg-warning-50 text-warning-dark', icon: <Clock size={14} /> };
    }
    if (!quiz.is_time_valid) {
      return { label: 'Di Luar Waktu', color: 'bg-warning-50 text-warning-dark', icon: <Clock size={14} /> };
    }
    if (quiz.status === 'active') {
      return { label: 'Aktif', color: 'bg-success-50 text-success-dark', icon: <Play size={14} /> };
    }
    if (quiz.status === 'completed') {
      return { label: 'Selesai', color: 'bg-gray-100 text-text-muted', icon: <Clock size={14} /> };
    }
    return { label: 'Nonaktif', color: 'bg-warning-50 text-warning-dark', icon: <Clock size={14} /> };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/peta" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Peta
        </Link>

        {/* Quiz Info Card */}
        <div className="card">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-secondary-50 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={28} className="text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-text">{quiz.quiz_nama}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  quiz.tipe === 'individu' ? 'bg-secondary-50 text-secondary-dark' : 'bg-accent-50 text-accent-dark'
                }`}>
                  {quiz.tipe === 'individu' ? (
                    <span className="flex items-center gap-1"><BookOpen size={12} /> Individu</span>
                  ) : (
                    <span className="flex items-center gap-1"><Users size={12} /> Kelompok</span>
                  )}
                </span>
                {quiz.password && (
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-warning-50 text-warning-dark flex items-center gap-1">
                    <Lock size={12} /> Password
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-alt rounded-lg flex items-center justify-center">
                <MapPin size={16} className="text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Pos</p>
                <p className="text-sm font-medium text-text">{quiz.pos_nama}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-alt rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Waktu Mulai</p>
                <p className="text-sm font-medium text-text">
                  {quiz.waktu_mulai ? new Date(quiz.waktu_mulai).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-alt rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Waktu Selesai</p>
                <p className="text-sm font-medium text-text">
                  {quiz.waktu_selesai ? new Date(quiz.waktu_selesai).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-alt rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-text-muted" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Jumlah Soal</p>
                <p className="text-sm font-medium text-text">{quiz.daftar_soal_nama}</p>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-4 border-t border-border">
            {hasSubmitted ? (
              <div className="p-3 bg-accent-50 border border-accent/20 rounded-lg text-sm text-accent-dark text-center">
                <AlertCircle size={18} className="mx-auto mb-2" />
                <p className="font-medium">Anda sudah mengerjakan quiz ini.</p>
                <p className="text-xs mt-1">Quiz hanya bisa dikerjakan satu kali. Lihat hasil Anda di leaderboard.</p>
              </div>
            ) : isActive ? (
              <div className="space-y-3">
                <div className="p-3 bg-success-50 border border-success/20 rounded-lg text-sm text-success-dark">
                  Quiz sedang aktif. Anda dapat memulai sekarang.
                </div>
                <button
                  onClick={handleStart}
                  className="btn-success w-full flex items-center justify-center gap-2 text-base"
                >
                  <Play size={18} />
                  Mulai Quiz
                </button>
              </div>
            ) : isUpcoming ? (
              <div className="p-3 bg-warning-50 border border-warning/20 rounded-lg text-sm text-warning-dark text-center">
                <Clock size={18} className="mx-auto mb-2" />
                <p className="font-medium">Quiz belum dimulai.</p>
                <p className="text-xs mt-1">Harap kembali pada waktu yang telah ditentukan.</p>
              </div>
            ) : isExpired ? (
              <div className="p-3 bg-gray-50 border border-border rounded-lg text-sm text-text-muted text-center">
                <Clock size={18} className="mx-auto mb-2" />
                <p className="font-medium">Quiz telah berakhir.</p>
                <p className="text-xs mt-1">Anda tidak dapat memulai quiz yang sudah selesai.</p>
              </div>
            ) : (
              <div className="p-3 bg-warning-50 border border-warning/20 rounded-lg text-sm text-warning-dark text-center">
                <AlertCircle size={18} className="mx-auto mb-2" />
                <p className="font-medium">Quiz belum aktif atau di luar waktu.</p>
                <p className="text-xs mt-1">Hubungi admin untuk mengaktifkan quiz ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="card mt-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-accent" />
            Leaderboard Quiz Ini
          </h3>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">Rank</th>
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">Nama</th>
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr key={entry.rank} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                      <td className="py-2.5 px-2">
                        <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                          entry.rank === 1
                            ? 'bg-warning-50 text-warning-dark'
                            : entry.rank === 2
                            ? 'bg-gray-100 text-text-secondary'
                            : entry.rank === 3
                            ? 'bg-accent-50 text-accent-dark'
                            : 'bg-surface-alt text-text-muted'
                        }`}>
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-medium text-text">{entry.nama}</td>
                      <td className="py-2.5 px-2 text-accent font-bold">{entry.skor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-muted text-center py-4">Belum ada data leaderboard.</p>
          )}
        </div>
      </main>
    </div>
  );
}

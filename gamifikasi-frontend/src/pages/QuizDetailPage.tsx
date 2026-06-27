import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, kelompokApi, leaderboardApi, soalApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Clock, MapPin, Users, Loader2, AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';
import type { QuizSession } from '@/types';

export function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const quizId = Number(id);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [kelompokAnswers, setKelompokAnswers] = useState<Record<number, { peserta_id: number }>>({});
  const queryClient = useQueryClient();

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizApi.getById(quizId),
    enabled: !!quizId,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', 'quiz', quizId],
    queryFn: () => leaderboardApi.getQuiz(quizId),
    enabled: !!quizId,
  });

  const { data: soalList } = useQuery({
    queryKey: ['quiz', quizId, 'soal'],
    queryFn: () => soalApi.getByQuiz(quizId),
    enabled: !!quizId,
  });

  const activateMutation = useMutation({
    mutationFn: () => quizApi.activate(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
  });

  const kelompokAnswerMutation = useMutation({
    mutationFn: (data: { kelompok_id: number; soal_id: number; peserta_id: number }) =>
      quizApi.kelompokAnswer(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'quiz', quizId] });
    },
  });

  const handleKelompokAnswer = (soalId: number, pesertaId: number, kelompokId: number) => {
    kelompokAnswerMutation.mutate({
      kelompok_id: kelompokId,
      soal_id: soalId,
      peserta_id: pesertaId,
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge-success">Aktif</span>;
      case 'completed':
        return <span className="badge-warning bg-gray-100 text-text-muted">Selesai</span>;
      default:
        return <span className="badge-warning">Nonaktif</span>;
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/quiz" className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data quiz.
          </div>
        )}

        {quiz && (
          <>
            {/* Quiz Info */}
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <Clock size={24} className="text-secondary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text">{quiz.nama}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusLabel(quiz.status)}
                    <span className={quiz.tipe === 'individu' ? 'badge-secondary' : 'badge-accent'}>
                      {quiz.tipe}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Pos</p>
                    <p className="text-sm font-medium text-text">{quiz.pos_nama ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Mulai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(quiz.waktu_mulai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Selesai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(quiz.waktu_selesai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar Soal */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                {quiz.tipe === 'kelompok' ? (
                  <Users size={18} className="text-accent" />
                ) : (
                  <BookOpen size={18} className="text-accent" />
                )}
                Daftar Soal
              </h3>
              {soalList && soalList.length > 0 ? (
                <div className="space-y-4">
                  {soalList.map((soal, idx) => (
                    <div key={soal.id} className="p-4 bg-surface-alt rounded-lg border border-border">
                      <p className="font-medium text-text text-sm mb-2">Soal #{idx + 1}</p>
                      <p className="text-text-muted text-sm mb-3">{soal.pertanyaan}</p>
                      <div className="space-y-1.5 text-sm">
                        {soal.opsi_a && (
                          <p className={soal.jawaban_benar === 'A' ? 'text-success font-medium' : 'text-text-muted'}>
                            A. {soal.opsi_a} {soal.jawaban_benar === 'A' && '✓'}
                          </p>
                        )}
                        {soal.opsi_b && (
                          <p className={soal.jawaban_benar === 'B' ? 'text-success font-medium' : 'text-text-muted'}>
                            B. {soal.opsi_b} {soal.jawaban_benar === 'B' && '✓'}
                          </p>
                        )}
                        {soal.opsi_c && (
                          <p className={soal.jawaban_benar === 'C' ? 'text-success font-medium' : 'text-text-muted'}>
                            C. {soal.opsi_c} {soal.jawaban_benar === 'C' && '✓'}
                          </p>
                        )}
                        {soal.opsi_d && (
                          <p className={soal.jawaban_benar === 'D' ? 'text-success font-medium' : 'text-text-muted'}>
                            D. {soal.opsi_d} {soal.jawaban_benar === 'D' && '✓'}
                          </p>
                        )}
                      </div>
                      {soal.penjelasan_jawaban_benar && (
                        <p className="text-xs text-text-muted mt-2 italic">
                          {soal.penjelasan_jawaban_benar}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada soal untuk quiz ini.</p>
              )}
            </div>

            {/* Leaderboard */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Users size={18} className="text-accent" />
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
          </>
        )}
      </main>
    </div>
  );
}

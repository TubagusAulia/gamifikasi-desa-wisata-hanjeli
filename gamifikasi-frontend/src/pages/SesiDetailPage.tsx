import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sesiApi, kelompokApi, leaderboardApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Clock, MapPin, Users, Loader2, AlertCircle, ArrowLeft, Trophy, Send, Play } from 'lucide-react';

export function SesiDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sesiId = Number(id);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [kelompokAnswers, setKelompokAnswers] = useState<Record<number, { peserta_id: number }>>({});
  const queryClient = useQueryClient();

  const { data: sesi, isLoading, error } = useQuery({
    queryKey: ['sesi', sesiId],
    queryFn: () => sesiApi.getById(sesiId),
    enabled: !!sesiId,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', 'sesi', sesiId],
    queryFn: () => leaderboardApi.getSesi(sesiId),
    enabled: !!sesiId,
  });

  const activateMutation = useMutation({
    mutationFn: () => sesiApi.activate(sesiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sesi', sesiId] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => sesiApi.submit(sesiId, {
      peserta_id: 0,
      answers: Object.entries(answers).map(([soal_id, jawaban]) => ({
        soal_id: Number(soal_id),
        jawaban,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'sesi', sesiId] });
    },
  });

  const kelompokAnswerMutation = useMutation({
    mutationFn: (data: { kelompok_id: number; soal_id: number; peserta_id: number }) =>
      sesiApi.kelompokAnswer(sesiId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'sesi', sesiId] });
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
            Gagal memuat data sesi.
          </div>
        )}

        {sesi && (
          <>
            {/* Sesi Info */}
            <div className="card mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                    <Clock size={24} className="text-secondary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-text">{sesi.nama}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      {getStatusLabel(sesi.status)}
                      <span className={sesi.tipe === 'individu' ? 'badge-secondary' : 'badge-accent'}>
                        {sesi.tipe}
                      </span>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/leaderboard/sesi/${sesiId}`}
                  className="btn-accent text-sm flex items-center gap-1"
                >
                  <Trophy size={14} />
                  Leaderboard
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Pos</p>
                    <p className="text-sm font-medium text-text">{sesi.pos?.nama ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Mulai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(sesi.waktu_mulai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Selesai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(sesi.waktu_selesai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions based on type */}
            {sesi.tipe === 'individu' && (
              <div className="card mb-6">
                {sesi.status === 'inactive' ? (
                  <div className="text-center">
                    <p className="text-text-muted mb-3">Sesi belum aktif. Aktifkan untuk memulai.</p>
                    <button
                      onClick={() => activateMutation.mutate()}
                      disabled={activateMutation.isPending}
                      className="btn-success flex items-center gap-2 mx-auto"
                    >
                      {activateMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      Aktifkan
                    </button>
                  </div>
                ) : sesi.status === 'active' ? (
                  <div className="text-center">
                    <p className="text-text-muted mb-3">Sesi aktif. Klik di bawah untuk memulai quiz individu.</p>
                    <Link
                      to={`/my-quiz/sesi/${sesiId}`}
                      className="btn-success inline-flex items-center gap-2"
                    >
                      <Play size={16} />
                      Mulai Quiz
                    </Link>
                  </div>
                ) : (
                  <p className="text-center text-text-muted">Sesi telah selesai.</p>
                )}
              </div>
            )}

            {/* Kelompok type - show soal list */}
            {sesi.tipe === 'kelompok' && (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                  <Users size={18} className="text-accent" />
                  Daftar Soal (Tipe Kelompok)
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  Untuk setiap soal, pilih peserta yang akan menjawab dan submit jawaban.
                </p>
                <div className="space-y-4">
                  {Array.from({ length: sesi.soal_count || 0 }, (_, i) => i + 1).map((soalNum) => (
                    <div key={soalNum} className="p-4 bg-surface-alt rounded-lg border border-border">
                      <p className="font-medium text-text text-sm mb-2">Soal #{soalNum}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="ID Peserta"
                          className="input-field text-sm w-32"
                          onChange={(e) => {
                            const pesertaId = Number(e.target.value);
                            if (pesertaId > 0) {
                              setKelompokAnswers({
                                ...kelompokAnswers,
                                [soalNum]: { peserta_id: pesertaId },
                              });
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const answer = kelompokAnswers[soalNum];
                            if (answer) {
                              handleKelompokAnswer(soalNum, answer.peserta_id, 0);
                            }
                          }}
                          disabled={!kelompokAnswers[soalNum] || kelompokAnswerMutation.isPending}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          <Send size={14} />
                          Submit
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!sesi.soal_count || sesi.soal_count === 0) && (
                    <p className="text-text-muted text-center py-4">Jumlah soal tidak tersedia.</p>
                  )}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-accent" />
                Leaderboard Sesi Ini
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

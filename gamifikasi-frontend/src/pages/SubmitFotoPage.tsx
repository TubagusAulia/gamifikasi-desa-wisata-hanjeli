import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/Navbar';
import { PhotoUploader } from '@/components/PhotoUploader';
import { locationApi, photoApi } from '@/services/api';
import { ArrowLeft, Camera, Loader2, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import type { PhotoLeaderboardEntry, PhotoSubmission } from '@/types';

export function SubmitFotoPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: currentQuiz, isLoading: isQuizLoading, error: quizError } = useQuery({
    queryKey: ['current-quiz'],
    queryFn: () => locationApi.getCurrentQuiz(),
  });

  const sesiId = currentQuiz?.sesi_id ?? null;
  const canUpload = !!currentQuiz && currentQuiz.status === 'active' && currentQuiz.is_time_valid && user?.role === 'peserta';
  const isWorker = user?.role !== 'peserta';

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<PhotoLeaderboardEntry[]>({
    queryKey: ['photo-leaderboard', sesiId],
    queryFn: () => photoApi.getLeaderboard(sesiId as number),
    enabled: sesiId !== null,
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<PhotoSubmission[]>({
    queryKey: ['photo-submissions', sesiId],
    queryFn: () => photoApi.getGallery(sesiId as number),
    enabled: sesiId !== null,
  });

  const topEntries = useMemo(() => leaderboard?.slice(0, 3) ?? [], [leaderboard]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['photo-leaderboard', sesiId] });
    await queryClient.invalidateQueries({ queryKey: ['current-quiz'] });
  };

  const photoReviewSection = (() => {
    if (canUpload) {
      return (
        <PhotoUploader
          sesiId={currentQuiz.sesi_id}
          pesertaId={user.id}
          lokasiPosId={currentQuiz.pos_id}
          onUploaded={handleRefresh}
        />
      );
    }

    if (isWorker) {
      if (submissionsLoading) {
        return (
          <div className="rounded-xl border border-border p-6 text-center">
            <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-text-muted">Memuat unggahan foto...</p>
          </div>
        );
      }

      if (submissions && submissions.length > 0) {
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 bg-surface-alt">
              <p className="text-sm font-medium text-text">Daftar Foto untuk Dinilai</p>
              <p className="text-xs text-text-muted mt-1">Lihat unggahan peserta, nama pengunggah, dan nilai saat ini.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-surface-alt">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-2 text-left text-text-muted font-medium">Foto</th>
                    <th className="py-2 px-2 text-left text-text-muted font-medium">Pengunggah</th>
                    <th className="py-2 px-2 text-left text-text-muted font-medium">Caption</th>
                    <th className="py-2 px-2 text-left text-text-muted font-medium">Status</th>
                    <th className="py-2 px-2 text-left text-text-muted font-medium">Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                      <td className="py-2 px-2">
                        <img src={submission.foto_url} alt={`Foto ${submission.id}`} className="h-16 w-20 rounded-md object-cover" />
                      </td>
                      <td className="py-2 px-2 text-text">{submission.nama}</td>
                      <td className="py-2 px-2 text-text-muted max-w-xs truncate">{submission.caption || '-'}</td>
                      <td className="py-2 px-2 text-text">{submission.validasi_status}</td>
                      <td className="py-2 px-2 text-accent font-semibold">{submission.poin_diberikan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      return (
        <div className="rounded-xl border border-border-dashed bg-surface-alt p-6 text-center text-text-muted">
          <p className="text-sm">Belum ada foto yang diunggah untuk sesi ini.</p>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-warning/20 bg-warning-50 p-4 text-sm text-warning-dark">
        Sesi belum aktif atau berada di luar waktu aktif. Coba kembali ketika sesi sudah aktif.
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Submit Foto</h1>
            <p className="text-text-muted mt-1">Unggah foto untuk dinilai dan lihat leaderboard aktivitas foto.</p>
          </div>
          <Link to="/peta" className="inline-flex items-center gap-2 text-secondary hover:underline text-sm">
            <ArrowLeft size={16} /> Kembali ke Peta
          </Link>
        </div>

        {(isQuizLoading || leaderboardLoading) && (
          <div className="card p-8 text-center mb-6">
            <Loader2 size={28} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-text-muted">Memuat data...</p>
          </div>
        )}

        {quizError && (
          <div className="card p-6 mb-6 bg-danger-50 border border-danger/20 text-danger">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} />
              <div>
                <p className="font-medium">Gagal memuat data submit foto.</p>
                <p className="text-sm text-danger/80">Silakan muat ulang halaman atau coba lagi nanti.</p>
              </div>
            </div>
          </div>
        )}

        {!isQuizLoading && !currentQuiz && (
          <div className="card p-8 text-center mb-6">
            <Camera size={36} className="mx-auto text-text-muted mb-4" />
            <h2 className="text-xl font-semibold text-text mb-2">Tidak ada sesi aktif di lokasi Anda</h2>
            <p className="text-text-muted mb-4">Pastikan Anda berada di dalam radius POS yang aktif untuk dapat mengunggah foto.</p>
            <Link to="/peta" className="btn-primary">Kembali ke Peta</Link>
          </div>
        )}

        {currentQuiz && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary-50 grid place-items-center">
                    <Camera size={24} className="text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-text">Unggah Foto</h2>
                    <p className="text-sm text-text-muted">Sesi: {currentQuiz.sesi_nama} · Pos: {currentQuiz.pos_nama}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="rounded-xl bg-surface-alt p-4 border border-border">
                    <p className="text-xs text-text-muted uppercase tracking-[0.15em] mb-2">Waktu Mulai</p>
                    <p className="text-sm font-medium text-text">{new Date(currentQuiz.waktu_mulai).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="rounded-xl bg-surface-alt p-4 border border-border">
                    <p className="text-xs text-text-muted uppercase tracking-[0.15em] mb-2">Waktu Selesai</p>
                    <p className="text-sm font-medium text-text">{new Date(currentQuiz.waktu_selesai).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                {photoReviewSection}
              </div>

              <div className="card p-6 border border-border">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <p className="text-sm text-text-muted">Status Foto</p>
                    <h3 className="text-lg font-semibold text-text">Leaderboard Foto</h3>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                {leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {topEntries.map((entry) => (
                        <div key={entry.peserta_id} className="rounded-2xl border border-border p-4 bg-surface-alt">
                          <p className="text-xs text-text-muted uppercase tracking-[0.15em] mb-2">Rank {entry.rank}</p>
                          <p className="font-semibold text-text truncate">{entry.nama}</p>
                          <p className="text-sm text-accent font-bold mt-2">{entry.total_poin} poin</p>
                          <p className="text-xs text-text-muted mt-1">{entry.valid_count} foto valid</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="py-2 px-2 text-left text-text-muted font-medium">Rank</th>
                            <th className="py-2 px-2 text-left text-text-muted font-medium">Peserta</th>
                            <th className="py-2 px-2 text-left text-text-muted font-medium">Total Poin</th>
                            <th className="py-2 px-2 text-left text-text-muted font-medium">Valid</th>
                            <th className="py-2 px-2 text-left text-text-muted font-medium">Submit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((entry) => (
                            <tr key={entry.peserta_id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                              <td className="py-2 px-2 font-medium text-text">{entry.rank}</td>
                              <td className="py-2 px-2 text-text">{entry.nama}</td>
                              <td className="py-2 px-2 text-accent font-semibold">{entry.total_poin}</td>
                              <td className="py-2 px-2 text-text-muted">{entry.valid_count}</td>
                              <td className="py-2 px-2 text-text-muted">{entry.submission_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border-dashed bg-surface-alt p-6 text-center text-text-muted">
                    <CheckCircle size={24} className="mx-auto mb-3 text-text-muted" />
                    <p className="text-sm">Belum ada pengumpulan foto untuk sesi ini.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SubmitFotoPage;

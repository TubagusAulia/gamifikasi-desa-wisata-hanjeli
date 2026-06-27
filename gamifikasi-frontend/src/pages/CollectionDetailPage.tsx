import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, photoApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { Clock, MapPin, Loader2, AlertCircle, ArrowLeft, Camera, Trophy } from 'lucide-react';
import type { PhotoSubmission } from '@/types';

function InlinePhotoGrader({
  submission,
  onGrade,
  disabled,
}: Readonly<{
  submission: PhotoSubmission;
  onGrade: (payload: { validasi_status: 'valid' | 'rejected' | 'pending'; validasi_note?: string; poin_adjustment?: number }) => void;
  disabled?: boolean;
}>) {
  const [nilai, setNilai] = useState<number | undefined>(submission.poin_diberikan ?? undefined);

  const saveValid = () => {
    if (nilai === undefined || nilai < 0 || nilai > 100) return;
    onGrade({ validasi_status: 'valid', poin_adjustment: nilai });
  };

  const saveReject = () => onGrade({ validasi_status: 'rejected', poin_adjustment: 0 });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        max={100}
        value={nilai ?? ''}
        onChange={(e) => setNilai(e.target.value === '' ? undefined : Number(e.target.value))}
        className="input-field text-xs w-24 py-1"
        placeholder="0-100"
        disabled={disabled}
      />
      <button onClick={saveValid} disabled={disabled || nilai === undefined} className="btn-success text-xs py-1 px-2">
        Simpan
      </button>
      <button onClick={saveReject} disabled={disabled} className="btn-danger text-xs py-1 px-2">
        Tolak
      </button>
    </div>
  );
}

export function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collectionId = Number(id);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canGrade = user?.role === 'admin' || user?.role === 'worker';

  const { data: collection, isLoading, error } = useQuery({
    queryKey: ['quiz', collectionId],
    queryFn: () => quizApi.getById(collectionId),
    enabled: !!collectionId,
  });

  const { data: submissions, isLoading: loadingSubmissions, isError: submissionsError } = useQuery({
    queryKey: ['photo-submissions', collectionId],
    queryFn: () => photoApi.getGallery(collectionId),
    enabled: !!collectionId,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['photo-leaderboard', collectionId],
    queryFn: () => photoApi.getLeaderboard(collectionId),
    enabled: !!collectionId,
  });

  const validateMutation = useMutation({
    mutationFn: ({ submissionId, payload }: { submissionId: number; payload: { validasi_status: 'valid' | 'rejected' | 'pending'; validasi_note?: string; poin_adjustment?: number } }) =>
      photoApi.validate(submissionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-submissions', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['photo-leaderboard', collectionId] });
    },
  });

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to={collection?.quiz_id ? `/agenda/${collection.quiz_id}` : '/agenda'} className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Agenda
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data collection.
          </div>
        )}

        {collection && (
          <>
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-secondary-50 rounded-lg flex items-center justify-center">
                  <Camera size={24} className="text-secondary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text">{collection.nama}</h1>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={collection.status === 'active' ? 'badge-success' : 'badge-warning bg-gray-100 text-text-muted'}>
                      {collection.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className="badge-secondary">Collection Foto</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Pos</p>
                    <p className="text-sm font-medium text-text">{collection.pos_nama ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Mulai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(collection.waktu_mulai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Waktu Selesai</p>
                    <p className="text-sm font-medium text-text">
                      {new Date(collection.waktu_selesai).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Camera size={18} className="text-secondary" />
                Daftar Foto yang Dikirim
              </h3>

              {(() => {
                if (loadingSubmissions) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="animate-spin text-primary" />
                    </div>
                  );
                }

                if (submissionsError) {
                  return <div className="p-4 bg-danger-50 text-danger rounded">Gagal memuat foto yang dikirim.</div>;
                }

                if (submissions && submissions.length > 0) {
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {submissions.map((sub, idx) => (
                    <div key={sub.id} className="rounded-2xl border border-border p-3 bg-white">
                      <div className="mb-2 text-xs text-text-muted">Foto #{idx + 1}</div>
                      <img src={sub.foto_url} alt={`upload-${sub.id}`} className="w-full h-40 object-cover rounded-md mb-2" />
                      <div className="text-sm font-medium text-text">Diunggah oleh {sub.nama}</div>
                      <div className="text-xs text-text-muted">{new Date(sub.created_at).toLocaleString('id-ID')}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-text-muted">Status: {sub.validasi_status}</span>
                        <span className="text-accent font-semibold">Skor: {typeof sub.poin_diberikan === 'number' ? sub.poin_diberikan : '-'}</span>
                      </div>
                      <div className="mt-3">
                        {canGrade ? (
                          <InlinePhotoGrader
                            submission={sub}
                            onGrade={(payload) => validateMutation.mutate({ submissionId: sub.id, payload })}
                            disabled={validateMutation.isPending}
                          />
                        ) : (
                          <p className="text-xs text-text-muted">Menunggu validasi dari admin atau worker.</p>
                        )}
                      </div>
                    </div>
                      ))}
                    </div>
                  );
                }

                return <p className="text-text-muted text-center py-4">Belum ada foto yang dikirim untuk collection ini.</p>;
              })()}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-accent" />
                Leaderboard Foto Submission
              </h3>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-text-muted font-medium">Rank</th>
                        <th className="text-left py-2 px-2 text-text-muted font-medium">Peserta</th>
                        <th className="text-left py-2 px-2 text-text-muted font-medium">Total Poin</th>
                        <th className="text-left py-2 px-2 text-text-muted font-medium">Subm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry) => (
                        <tr key={entry.peserta_id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                          <td className="py-2 px-2 font-medium">{entry.rank}</td>
                          <td className="py-2 px-2">{entry.nama}</td>
                          <td className="py-2 px-2 text-accent font-semibold">{entry.total_poin}</td>
                          <td className="py-2 px-2 text-text-muted">{entry.submission_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-text-muted text-center py-4">Belum ada leaderboard untuk collection ini.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

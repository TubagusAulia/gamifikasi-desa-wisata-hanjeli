import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { reviewApi, posApi, kelompokApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Camera, MapPin, Upload, Loader2, AlertCircle, CheckCircle, Clock, Star } from 'lucide-react';

export function PesertaReviewPage() {
  const { user } = useAuthStore();
  const kelompokId = user?.kelompok_id;
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();

  const { data: kelompok, isLoading: loadingKelompok } = useQuery({
    queryKey: ['kelompok', kelompokId],
    queryFn: () => kelompokApi.getById(kelompokId!),
    enabled: !!kelompokId,
  });

  const { data: reviewList, isLoading: loadingReview } = useQuery({
    queryKey: ['review', 'kelompok', kelompokId],
    queryFn: async () => {
      const allReviews = await reviewApi.getAll();
      return allReviews.filter((r) =>
        r.kelompok?.some((k) => k.id === kelompokId)
      );
    },
    enabled: !!kelompokId,
  });

  const { data: posList } = useQuery({
    queryKey: ['pos'],
    queryFn: posApi.getAll,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ reviewId, formData }: { reviewId: number; formData: FormData }) =>
      reviewApi.upload(reviewId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review'] });
      setSelectedFiles({});
      setCaptions({});
    },
  });

  const handleFileChange = (posId: number, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [posId]: file }));
  };

  const handleUpload = (reviewId: number, posId: number) => {
    const file = selectedFiles[posId];
    if (!file) return;

    const formData = new FormData();
    formData.append('foto', file);
    formData.append('pos_id', String(posId));
    formData.append('kelompok_id', String(kelompokId));
    if (captions[posId]) {
      formData.append('caption', captions[posId]);
    }
    uploadMutation.mutate({ reviewId, formData });
  };

  const getSubmissionForPos = (review: any, posId: number) => {
    return review.submissions?.find(
      (s: any) => s.pos_id === posId && s.kelompok_id === kelompokId
    );
  };

  const isLoading = loadingKelompok || loadingReview;

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-text mb-6">Review Saya</h1>
        <p className="text-text-muted mb-6">
          Aktivitas foto untuk kelompok: <span className="font-medium text-text">{kelompok?.nama ?? '-'}</span>
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {reviewList && reviewList.length > 0 ? (
          <div className="space-y-6">
            {reviewList.map((review) => (
              <div key={review.id} className="card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-accent-50 rounded-lg flex items-center justify-center">
                    <Camera size={20} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text">{review.nama}</h3>
                    {review.deskripsi && (
                      <p className="text-sm text-text-muted mt-0.5">{review.deskripsi}</p>
                    )}
                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${
                      review.status === 'active'
                        ? 'bg-success-50 text-success-dark'
                        : 'bg-gray-100 text-text-muted'
                    }`}>
                      {review.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>

                {/* Pos list with upload */}
                {posList && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-border-light">
                    <p className="text-sm font-medium text-text mb-2 flex items-center gap-1">
                      <MapPin size={14} />
                      Daftar Pos
                    </p>
                    {posList.map((pos) => {
                      const submission = getSubmissionForPos(review, pos.id);
                      return (
                        <div key={pos.id} className="p-3 bg-surface-alt rounded-lg border border-border-light">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-text">{pos.nama}</p>
                            {submission && (
                              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                submission.status === 'graded'
                                  ? 'bg-success-50 text-success-dark'
                                  : 'bg-warning-50 text-warning-dark'
                              }`}>
                                {submission.status === 'graded' ? (
                                  <CheckCircle size={12} />
                                ) : (
                                  <Clock size={12} />
                                )}
                                {submission.status === 'graded' ? 'Dinilai' : 'Menunggu'}
                              </span>
                            )}
                          </div>

                          {submission ? (
                            <div className="space-y-2">
                              {submission.foto_url && (
                                <img
                                  src={submission.foto_url}
                                  alt={submission.caption || ''}
                                  className="w-full h-32 object-cover rounded"
                                />
                              )}
                              <p className="text-xs text-text-muted">
                                {submission.caption || 'Tanpa caption'}
                              </p>
                              {submission.status === 'graded' && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Star size={14} className="text-accent" />
                                  <span className="font-bold text-accent">{submission.nilai}</span>
                                  <span className="text-xs text-text-muted">poin</span>
                                </div>
                              )}
                            </div>
                          ) : review.status === 'active' ? (
                            <div className="space-y-2">
                              <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline">
                                <Upload size={12} />
                                Pilih file
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFileChange(pos.id, e.target.files?.[0] || null)}
                                />
                              </label>
                              {selectedFiles[pos.id] && (
                                <span className="text-xs text-text-muted truncate block">
                                  {selectedFiles[pos.id]?.name}
                                </span>
                              )}
                              <input
                                type="text"
                                placeholder="Caption (opsional)"
                                className="input-field text-xs py-1"
                                value={captions[pos.id] || ''}
                                onChange={(e) => setCaptions({
                                  ...captions,
                                  [pos.id]: e.target.value,
                                })}
                              />
                              <button
                                onClick={() => handleUpload(review.id, pos.id)}
                                disabled={!selectedFiles[pos.id] || uploadMutation.isPending}
                                className="btn-secondary text-xs w-full py-1.5"
                              >
                                {uploadMutation.isPending ? 'Mengunggah...' : 'Unggah'}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-text-muted">Review tidak aktif</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-12">
              <Camera size={48} className="mx-auto text-text-muted mb-3" />
              <p className="text-text-muted">Belum ada review aktif untuk kelompok Anda.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

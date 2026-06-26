import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi, posApi, leaderboardApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Camera, MapPin, Loader2, AlertCircle, ArrowLeft, Trophy, Upload, Star } from 'lucide-react';

export function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();

  const { data: review, isLoading, error } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewApi.getById(reviewId),
    enabled: !!reviewId,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard', 'review', reviewId],
    queryFn: () => leaderboardApi.getReview(reviewId),
    enabled: !!reviewId,
  });

  const { data: posList } = useQuery({
    queryKey: ['pos'],
    queryFn: posApi.getAll,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => reviewApi.upload(reviewId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId, 'submissions'] });
      setSelectedFiles({});
      setCaptions({});
    },
  });

  const gradeMutation = useMutation({
    mutationFn: (data: { submission_id: number; nilai: number }) =>
      reviewApi.grade(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', reviewId, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard', 'review', reviewId] });
    },
  });

  const handleFileChange = (key: string, file: File | null) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: file }));
  };

  const handleUpload = (posId: number, kelompokId: number) => {
    const key = `${posId}-${kelompokId}`;
    const file = selectedFiles[key];
    if (!file) return;

    const formData = new FormData();
    formData.append('foto', file);
    formData.append('pos_id', String(posId));
    formData.append('kelompok_id', String(kelompokId));
    if (captions[key]) {
      formData.append('caption', captions[key]);
    }
    uploadMutation.mutate(formData);
  };

  const handleGrade = (submissionId: number) => {
    const nilai = grades[submissionId];
    if (nilai === undefined || nilai < 0 || nilai > 100) return;
    gradeMutation.mutate({ submission_id: submissionId, nilai });
  };

  const getSubmissionForPosKelompok = (posId: number, kelompokId: number) => {
    return review?.submissions?.find((s) => s.pos_id === posId && s.kelompok_id === kelompokId);
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/review" className="inline-flex items-center gap-1 text-accent hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali ke Daftar Review
        </Link>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger rounded-lg">
            <AlertCircle size={18} />
            Gagal memuat data review.
          </div>
        )}

        {review && (
          <>
            {/* Review Info */}
            <div className="card mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-50 rounded-lg flex items-center justify-center">
                  <Camera size={24} className="text-accent" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-text">{review.nama}</h1>
                  {review.deskripsi && <p className="text-text-muted mt-1">{review.deskripsi}</p>}
                  <span className={`inline-block mt-2 ${review.status === 'active' ? 'badge-success' : 'badge-warning bg-gray-100 text-text-muted'}`}>
                    {review.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <Link
                  to={`/leaderboard/review/${reviewId}`}
                  className="btn-accent text-sm flex items-center gap-1"
                >
                  <Trophy size={14} />
                  Leaderboard
                </Link>
              </div>
            </div>

            {/* Pos and Kelompok Grid */}
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-accent" />
                Status Upload per Pos & Kelompok
              </h3>

              {review.kelompok && posList && (
                <div className="space-y-6">
                  {posList.map((pos) => (
                    <div key={pos.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} className="text-secondary" />
                        <h4 className="font-medium text-text">{pos.nama}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(review.kelompok ?? []).map((kelompok) => {
                          const submission = getSubmissionForPosKelompok(pos.id, kelompok.id);
                          const fileKey = `${pos.id}-${kelompok.id}`;
                          return (
                            <div key={kelompok.id} className="p-3 bg-surface-alt rounded-lg border border-border-light">
                              <p className="text-sm font-medium text-text mb-2">{kelompok.nama}</p>

                              {submission ? (
                                <div className="space-y-2">
                                  {submission.foto_url && (
                                    <img
                                      src={submission.foto_url}
                                      alt={submission.caption || ''}
                                      className="w-full h-32 object-cover rounded"
                                    />
                                  )}
                                  <p className="text-xs text-text-muted">{submission.caption || 'Tanpa caption'}</p>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      submission.status === 'graded'
                                        ? 'bg-success-50 text-success-dark'
                                        : 'bg-warning-50 text-warning-dark'
                                    }`}>
                                      {submission.status === 'graded' ? 'Dinilai' : 'Pending'}
                                    </span>
                                    {submission.status === 'graded' && (
                                      <span className="text-xs font-bold text-accent">{submission.nilai} poin</span>
                                    )}
                                  </div>
                                  {submission.status === 'pending' && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        placeholder="Nilai (0-100)"
                                        className="input-field text-xs w-24 py-1"
                                        onChange={(e) => setGrades({
                                          ...grades,
                                          [submission.id]: Number(e.target.value),
                                        })}
                                      />
                                      <button
                                        onClick={() => handleGrade(submission.id)}
                                        disabled={gradeMutation.isPending || grades[submission.id] === undefined}
                                        className="btn-accent text-xs py-1 px-2"
                                      >
                                        Nilai
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-xs text-text-muted">Belum diunggah</p>
                                  <label className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:underline">
                                    <Upload size={12} />
                                    Pilih file
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFileChange(fileKey, e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Caption (opsional)"
                                    className="input-field text-xs py-1"
                                    value={captions[fileKey] || ''}
                                    onChange={(e) => setCaptions({
                                      ...captions,
                                      [fileKey]: e.target.value,
                                    })}
                                  />
                                  <button
                                    onClick={() => handleUpload(pos.id, kelompok.id)}
                                    disabled={!selectedFiles[fileKey] || uploadMutation.isPending}
                                    className="btn-secondary text-xs w-full py-1.5"
                                  >
                                    {uploadMutation.isPending ? 'Mengunggah...' : 'Unggah'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                <Star size={18} className="text-accent" />
                Leaderboard per Kelompok
              </h3>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Rank</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Kelompok</th>
                        <th className="text-left py-2.5 px-2 text-text-muted font-medium">Total Nilai</th>
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

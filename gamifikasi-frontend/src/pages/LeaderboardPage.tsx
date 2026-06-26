import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { leaderboardApi } from '@/services/api';
import { Navbar } from '@/components/Navbar';
import { Trophy, Medal, TrendingUp, ArrowLeft, Users, RefreshCw } from 'lucide-react';

export function LeaderboardPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const entityId = Number(id);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    if (type === 'sesi') {
      return leaderboardApi.getSesi(entityId);
    } else if (type === 'quiz') {
      return leaderboardApi.getQuiz(entityId);
    } else if (type === 'review') {
      return leaderboardApi.getReview(entityId);
    }
    return [];
  };

  const { data: entries, isLoading, error, refetch } = useQuery({
    queryKey: ['leaderboard', type, entityId],
    queryFn: fetchLeaderboard,
    enabled: !!entityId && !!type,
    refetchInterval: 30000,
  });

  const isKelompokType = type === 'review';

  const getBackLink = () => {
    if (type === 'sesi') return `/sesi/${entityId}`;
    if (type === 'quiz') return `/quiz/${entityId}`;
    if (type === 'review') return `/review/${entityId}`;
    return '/';
  };

  const getTitle = () => {
    if (type === 'sesi') return 'Leaderboard Sesi';
    if (type === 'quiz') return 'Leaderboard Quiz';
    if (type === 'review') return 'Leaderboard Review';
    return 'Leaderboard';
  };

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to={getBackLink()} className="inline-flex items-center gap-1 text-secondary hover:underline mb-4">
          <ArrowLeft size={16} />
          Kembali
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              <Trophy size={24} className="text-accent" />
              {getTitle()}
            </h1>
            <p className="text-text-muted mt-1">
              {isKelompokType ? 'Ranking per kelompok' : 'Ranking peserta'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Top 3 podium */}
        {entries && entries.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* 2nd place */}
            <div className="card text-center mt-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Medal size={20} className="text-text-muted" />
              </div>
              <p className="font-medium text-text text-sm truncate">{entries[1].nama}</p>
              {entries[1].kelompok_nama && (
                <p className="text-xs text-text-muted truncate">{entries[1].kelompok_nama}</p>
              )}
              <p className="text-lg font-bold text-text-secondary">{entries[1].skor}</p>
              <p className="text-xs text-text-muted">2nd</p>
            </div>
            {/* 1st place */}
            <div className="card text-center border-2 border-warning/30 bg-warning-50/50">
              <div className="w-14 h-14 bg-warning-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Trophy size={24} className="text-warning-dark" />
              </div>
              <p className="font-bold text-text truncate">{entries[0].nama}</p>
              {entries[0].kelompok_nama && (
                <p className="text-xs text-text-muted truncate">{entries[0].kelompok_nama}</p>
              )}
              <p className="text-2xl font-bold text-warning-dark">{entries[0].skor}</p>
              <p className="text-xs text-warning-dark font-medium">1st</p>
            </div>
            {/* 3rd place */}
            <div className="card text-center mt-4">
              <div className="w-12 h-12 bg-accent-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Medal size={20} className="text-accent-dark" />
              </div>
              <p className="font-medium text-text text-sm truncate">{entries[2].nama}</p>
              {entries[2].kelompok_nama && (
                <p className="text-xs text-text-muted truncate">{entries[2].kelompok_nama}</p>
              )}
              <p className="text-lg font-bold text-accent-dark">{entries[2].skor}</p>
              <p className="text-xs text-text-muted">3rd</p>
            </div>
          </div>
        )}

        {/* Full table */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-accent" />
            <h3 className="font-bold text-text">Ranking Lengkap</h3>
            {lastUpdated && (
              <span className="text-xs text-text-muted ml-auto">
                Diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-surface-alt rounded" />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-danger">
              Gagal memuat data leaderboard.
            </div>
          )}

          {entries && entries.length > 0 && !isLoading && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">Rank</th>
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">
                      {isKelompokType ? 'Kelompok' : 'Peserta'}
                    </th>
                    {!isKelompokType && (
                      <th className="text-left py-2.5 px-2 text-text-muted font-medium">Kelompok</th>
                    )}
                    <th className="text-left py-2.5 px-2 text-text-muted font-medium">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr
                      key={entry.rank}
                      className={`border-b border-border-light last:border-0 hover:bg-surface-hover ${
                        entry.rank <= 3 ? 'bg-accent-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2">
                        <span
                          className={`w-8 h-8 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            entry.rank === 1
                              ? 'bg-warning-50 text-warning-dark text-base'
                              : entry.rank === 2
                              ? 'bg-gray-100 text-text-secondary'
                              : entry.rank === 3
                              ? 'bg-accent-50 text-accent-dark'
                              : 'bg-surface-alt text-text-muted'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-medium text-text">{entry.nama}</td>
                      {!isKelompokType && (
                        <td className="py-2.5 px-2 text-text-muted">{entry.kelompok_nama || '-'}</td>
                      )}
                      <td className="py-2.5 px-2 text-accent font-bold">{entry.skor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {entries && entries.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Users size={32} className="mx-auto text-text-muted mb-2" />
              <p className="text-text-muted">Belum ada data leaderboard.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

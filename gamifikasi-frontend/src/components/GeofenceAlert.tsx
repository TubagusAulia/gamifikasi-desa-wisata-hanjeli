import { MapPin, X } from 'lucide-react';
import type { Sesi } from '@/types';

interface Props {
  sesi: Sesi | null;
  onClose: () => void;
  onStart: () => void;
}

export function GeofenceAlert({ sesi, onClose, onStart }: Props) {
  if (!sesi) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-xl shadow-lg border-2 border-accent p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-accent-50 rounded-full flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-text">Sesi Ditemukan!</h4>
            <p className="text-sm text-text-muted mt-0.5">
              Anda berada di <strong className="text-accent">{sesi.pos?.nama || sesi.nama}</strong>
            </p>
            <p className="text-xs text-secondary mt-1">
              {sesi.nama} — {sesi.tipe === 'individu' ? 'Quiz Individu' : 'Quiz Kelompok'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onStart} className="btn-accent flex-1 text-sm">
            Mulai Sekarang
          </button>
          <button onClick={onClose} className="btn-ghost text-sm">
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}

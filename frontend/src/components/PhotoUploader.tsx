import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { photoApi } from '@/services/api';

interface Props {
  readonly quizId: number;
  readonly pesertaId: number;
  readonly lokasiPosId: number;
  readonly onUploaded?: () => void;
}

export function PhotoUploader({ quizId, pesertaId, lokasiPosId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) {
        setFile(f);
        setPreview(URL.createObjectURL(f));
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('peserta_id', String(pesertaId));
      formData.append('quiz_id', String(quizId));
      formData.append('lokasi_pos_id', String(lokasiPosId));
      if (caption) {
        formData.append('caption', caption);
      }
      await photoApi.upload(formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFile(null);
        setPreview(null);
        setCaption('');
        onUploaded?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal upload');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Camera size={28} className="text-success" />
        </div>
        <h4 className="font-semibold text-text">Foto berhasil diunggah!</h4>
        <p className="text-sm text-text-muted mt-1">Menunggu penilaian</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-secondary bg-secondary-50' : 'border-border hover:border-secondary/50'
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              className="absolute top-2 right-2 p-1 bg-danger text-white rounded-full"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="py-4">
            <Upload size={36} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">
              {isDragActive ? 'Lepaskan file di sini...' : 'Tarik & lepas foto atau klik untuk pilih'}
            </p>
            <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP (maks 5MB)</p>
          </div>
        )}
      </div>

      <button type="button" onClick={handleCameraCapture} className="flex items-center gap-2 text-sm text-secondary hover:text-secondary-dark">
        <Camera size={16} />
        Ambil foto dengan kamera
      </button>

      {file && (
        <>
          <div>
            <label htmlFor="photo-caption" className="block text-sm font-medium text-text mb-1">Caption</label>
            <textarea
              id="photo-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tambahkan caption..."
              className="input-field resize-none"
              rows={2}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <X size={14} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <ImageIcon size={16} />
            {uploading ? 'Mengunggah...' : 'Unggah Foto'}
          </button>
        </>
      )}
    </div>
  );
}

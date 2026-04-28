'use client';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  preview?: string;
}

export default function ImageUpload({ onImageSelect, preview }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(preview || null);
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format non supporté. Utilisez JPG, PNG ou WebP.');
      onImageSelect(null);
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux. Maximum 20MB, reçu ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      onImageSelect(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setFileName(file.name);
      onImageSelect(file);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setFileName('');
    setError('');
    onImageSelect(null);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
        <input
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          id="image-input"
        />
        <label htmlFor="image-input" className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-sm">
            <span className="font-medium text-blue-600 hover:text-blue-700">Cliquez pour sélectionner</span>
            <span className="text-gray-600"> ou déposez une image</span>
          </div>
          <span className="text-xs text-gray-500">JPG, PNG ou WebP jusqu'à 20MB</span>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="relative space-y-2">
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 truncate">{fileName}</p>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-red-100 rounded transition"
              type="button"
            >
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

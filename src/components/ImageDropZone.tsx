'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';

interface ImageDropZoneProps {
  currentUrl?: string | null;
  onUpload: (file: File) => Promise<string | null>;
  label?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ImageDropZone({
  currentUrl,
  onUpload,
  label,
  hint = 'Arrastra una imagen o haz clic · JPG, PNG, WebP · Máx 20MB',
  size = 'md',
  className = '',
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const sizeClasses = {
    sm: 'h-24',
    md: 'h-40',
    lg: 'h-56',
  };

  const processFile = useCallback(async (file: File) => {
    setError('');

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setError('Solo JPG, PNG o WebP');
      return;
    }

    // Validate size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('Máximo 20MB');
      return;
    }

    // Show local preview instantly
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      if (!url) {
        setError('Error al subir');
        setPreview(currentUrl || null);
      }
    } catch {
      setError('Error al subir');
      setPreview(currentUrl || null);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, currentUrl]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = '';
  }, [processFile]);

  const handleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setIsUploading(true);
    try {
      await onUpload(new File([], ''));
    } catch {}
    setIsUploading(false);
  }, [onUpload]);

  return (
    <div className={className}>
      {label && (
        <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1">
          <ImageIcon size={12} /> {label}
        </label>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed cursor-pointer
          transition-all duration-200 overflow-hidden
          ${sizeClasses[size]}
          ${isDragging
            ? 'border-brand bg-brand/10 scale-[1.02]'
            : 'border-surface-3 hover:border-gray-500 bg-surface-2 hover:bg-surface-1'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
        />

        <AnimatePresence mode="wait">
          {/* Uploading state */}
          {isUploading && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-surface-2/90 z-10"
            >
              <Loader2 size={24} className="text-brand animate-spin mb-2" />
              <span className="text-xs text-gray-400">Subiendo...</span>
            </motion.div>
          )}

          {/* Dragging state */}
          {isDragging && !isUploading && (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-brand/10 z-10"
            >
              <Upload size={28} className="text-brand mb-2" />
              <span className="text-sm font-medium text-brand">Suelta aquí</span>
            </motion.div>
          )}

          {/* Preview state */}
          {preview && !isDragging && !isUploading && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 group"
            >
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 text-white text-sm">
                  <Upload size={14} />
                  Cambiar
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {!preview && !isDragging && !isUploading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center mb-2">
                <Upload size={18} className="text-gray-400" />
              </div>
              <span className="text-sm text-gray-400 font-medium">Subir imagen</span>
              <span className="text-xs text-gray-500 mt-0.5">o arrastra aquí</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 mt-1.5"
        >
          {error}
        </motion.p>
      )}

      {/* Hint */}
      {!error && hint && (
        <p className="text-xs text-gray-500 mt-1.5">{hint}</p>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import './ImageViewer.css';

interface ImageViewerModalProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function ImageViewerModal({ images, initialIndex = 0, alt = '', onClose }: ImageViewerModalProps) {
  const [current, setCurrent] = useState(initialIndex);

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-modal" onClick={e => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose}>✕</button>
        <div className="image-viewer-main">
          {images.length > 1 && (
            <button className="image-viewer-nav image-viewer-prev" onClick={prev}>&#8249;</button>
          )}
          <img src={images[current]} alt={alt} className="image-viewer-img" />
          {images.length > 1 && (
            <button className="image-viewer-nav image-viewer-next" onClick={next}>&#8250;</button>
          )}
        </div>
        {images.length > 1 && (
          <div className="image-viewer-thumbs">
            {images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${alt} ${i + 1}`}
                className={`image-viewer-thumb ${i === current ? 'active' : ''}`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        )}
        <div className="image-viewer-counter">{current + 1} / {images.length}</div>
      </div>
    </div>
  );
}

interface ImageViewerProps {
  images: string; // comma-separated URLs
  alt?: string;
  thumbnailSize?: number;
}

export default function ImageViewer({ images, alt = '', thumbnailSize = 40 }: ImageViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const urls = images ? images.split(',').map(u => u.trim()).filter(Boolean) : [];

  if (urls.length === 0) {
    return (
      <div
        className="image-viewer-placeholder"
        style={{ width: thumbnailSize, height: thumbnailSize }}
      />
    );
  }

  return (
    <>
      <img
        src={urls[0]}
        alt={alt}
        className="image-viewer-thumbnail"
        style={{ width: thumbnailSize, height: thumbnailSize }}
        onClick={() => { setStartIndex(0); setIsOpen(true); }}
        title="Nhấn để xem ảnh"
      />
      {isOpen && (
        <ImageViewerModal
          images={urls}
          initialIndex={startIndex}
          alt={alt}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

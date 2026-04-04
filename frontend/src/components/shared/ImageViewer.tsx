import { useEffect } from 'react';
import './ImageViewer.css';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  productName?: string;
}

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  productName,
}: ImageViewerProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrev]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <button className="image-viewer-close" onClick={onClose} title="Đóng (ESC)">
          ×
        </button>

        {images.length > 1 && currentIndex > 0 && (
          <button className="image-viewer-nav image-viewer-prev" onClick={onPrev} title="Ảnh trước (←)">
            ‹
          </button>
        )}

        <div className="image-viewer-content">
          <img src={currentImage} alt={productName || 'Product'} />
          {productName && (
            <div className="image-viewer-caption">
              {productName}
              {images.length > 1 && (
                <span className="image-viewer-counter">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
            </div>
          )}
        </div>

        {images.length > 1 && currentIndex < images.length - 1 && (
          <button className="image-viewer-nav image-viewer-next" onClick={onNext} title="Ảnh tiếp (→)">
            ›
          </button>
        )}
      </div>
    </div>
  );
}

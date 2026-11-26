import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CourtImageGallery = ({ images, title, compact = false }) => {
  const validImages = Array.isArray(images)
    ? images.filter((image) => typeof image === "string" && image.length > 0)
    : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  if (validImages.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${
        compact ? "rounded-t-xl" : "mt-6 mb-8 rounded-xl"
      }`}
      aria-label={`Imágenes de ${title}`}
    >
      <img
        src={validImages[currentIndex % validImages.length]}
        alt={`Foto ${currentIndex % validImages.length + 1} de ${title}`}
        loading="lazy"
        className={`w-full object-contain ${
          compact ? "h-32" : "h-48 sm:h-56"
        }`}
      />
      {validImages.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((index) => (index - 1 + validImages.length) % validImages.length)
            }
            aria-label="Ver imagen anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-800 shadow hover:bg-white"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((index) => (index + 1) % validImages.length)
            }
            aria-label="Ver imagen siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-800 shadow hover:bg-white"
          >
            <ChevronRight size={18} />
          </button>
          <span
            aria-live="polite"
            className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-white"
          >
            {currentIndex % validImages.length + 1} / {validImages.length}
          </span>
        </>
      ) : null}
    </div>
  );
};

export default CourtImageGallery;

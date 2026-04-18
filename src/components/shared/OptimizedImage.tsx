interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  aspectRatio?: string;
  fit?: "cover" | "contain" | "fill";
  sizes?: string;
}

/**
 * Composant image optimisé pour réduire LCP/CLS sans dupliquer la logique.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = "",
  priority = false,
  aspectRatio,
  fit = "cover",
  sizes = "100vw",
}: OptimizedImageProps) {
  const hasSupportedExt = /\.(jpg|jpeg|png|webp|avif)$/i.test(src);
  const baseSrc = hasSupportedExt ? src.replace(/\.(jpg|jpeg|png|webp|avif)$/i, "") : src;
  const avifSrc = hasSupportedExt ? `${baseSrc}.avif` : null;
  const webpSrc = hasSupportedExt ? `${baseSrc}.webp` : null;

  const objectFitClass =
    fit === "contain" ? "object-contain" : fit === "fill" ? "object-fill" : "object-cover";

  const containerStyle = aspectRatio
    ? { aspectRatio }
    : { aspectRatio: `${width}/${height}` };

  return (
    <div className="relative w-full overflow-hidden bg-surface-raised" style={containerStyle}>
      <picture>
        {avifSrc ? <source srcSet={avifSrc} type="image/avif" sizes={sizes} /> : null}
        {webpSrc ? <source srcSet={webpSrc} type="image/webp" sizes={sizes} /> : null}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "low"}
          decoding="async"
          className={`h-full w-full ${objectFitClass} ${className}`.trim()}
        />
      </picture>
    </div>
  );
}

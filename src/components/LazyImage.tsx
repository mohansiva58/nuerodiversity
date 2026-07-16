import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  /** Image source URL */
  src: string;
  /** Alternative text for accessibility */
  alt: string;
  /** CSS class */
  className?: string;
  /** Placeholder image while loading */
  placeholder?: string;
  /** Intersection observer root margin (default: 50px) */
  rootMargin?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Width attribute */
  width?: number | string;
  /** Height attribute */
  height?: number | string;
  /** Object fit CSS */
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';

  /** Background while loading */
  bgColor?: string;
  /** Blur effect while loading */
  blur?: boolean;
}

/**
 * LazyImage Component
 * Uses Intersection Observer API to lazy load images when they come into view
 * Improves initial page load performance on mobile
 * 
 * @example
 * <LazyImage
 *   src="https://example.com/large-image.jpg"
 *   alt="Course thumbnail"
 *   className="w-full h-48"
 *   placeholder="https://example.com/tiny-placeholder.jpg"
 *   blur
 * />
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  rootMargin = '50px',
  onLoad,
  width,
  height,
  objectFit = 'cover',
  bgColor = '#f0f0f0',
  blur = true,
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder || bgColor);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // If image is already loaded or placeholder is the same as src, don't use observer
    if (!imageRef.current || imageSrc === src) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin,
      }
    );

    observer.observe(imageRef.current);

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [rootMargin, src, imageSrc]);

  useEffect(() => {
    if (!isInView) return;

    // Create a new image to preload
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };

    img.onerror = () => {
      console.warn(`Failed to load image: ${src}`);
      setImageSrc(placeholder || '');
    };
  }, [isInView, src, placeholder, onLoad]);

  return (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={alt}
      className={`${blur && !isLoaded ? 'blur-sm' : 'blur-0'} transition-all duration-300 ${className}`}
      style={{
        width: width || '100%',
        height: height || '100%',
        objectFit,
        backgroundColor: bgColor,
      }}
    />
  );
};

/**
 * ViewportTracker Component
 * Renders content only when it comes into viewport (removes from DOM when out of view)
 * Useful for expensive components in long lists
 * 
 * @example
 * <ViewportTracker>
 *   <ExpensiveComponent />
 * </ViewportTracker>
 */
interface ViewportTrackerProps {
  children: React.ReactNode;
  /** Show content before it enters viewport (for animations) */
  preloadMargin?: string;
  /** Component to show while in viewport */
  fallback?: React.ReactNode;
}

export const ViewportTracker: React.FC<ViewportTrackerProps> = ({
  children,
  preloadMargin = '100px',
  fallback = null,
}) => {
  const [isInView, setIsInView] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        rootMargin: preloadMargin,
      }
    );

    observer.observe(elementRef.current);

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [preloadMargin]);

  return <div ref={elementRef}>{isInView ? children : fallback}</div>;
};

export default LazyImage;

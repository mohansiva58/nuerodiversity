import React, { useState, useEffect, useCallback } from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveImageProps {
  /** Mobile image URL (for screens under 768px) */
  mobileSrc: string;
  /** Tablet image URL (for screens 768px-1024px) */
  tabletSrc?: string;
  /** Desktop image URL (for screens 1024px and above) */
  desktopSrc: string;
  /** Large desktop image URL (for screens 1536px and above) */
  lgDesktopSrc?: string;
  /** Alt text for accessibility */
  alt: string;
  /** CSS class name */
  className?: string;
  /** Loading strategy: lazy or eager */
  loading?: 'lazy' | 'eager';
  /** Whether to blur while loading */
  blur?: boolean;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback on error */
  onError?: () => void;
  /** Width attribute */
  width?: number | string;
  /** Height attribute */
  height?: number | string;
  /** Object fit CSS property */
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  /** Background color while loading */
  bgColor?: string;
}

/**
 * ResponsiveImage Component
 * Serves appropriate image quality/size based on device type and screen size
 * Improves performance by loading lightweight images on mobile
 * 
 * @example
 * <ResponsiveImage
 *   mobileSrc="https://example.com/img-mobile.jpg"
 *   desktopSrc="https://example.com/img-desktop.jpg"
 *   alt="Hero banner"
 *   className="w-full h-96"
 *   loading="lazy"
 *   blur
 * />
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  mobileSrc,
  tabletSrc,
  desktopSrc,
  lgDesktopSrc,
  alt,
  className = '',
  loading = 'lazy',
  blur = true,
  onLoad,
  onError,
  width,
  height,
  objectFit = 'cover',
  bgColor = '#f0f0f0',
}) => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop, screenWidth } = useResponsive();
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');

  // Determine which image source to use
  useEffect(() => {
    let src = desktopSrc;

    if (lgDesktopSrc && isLargeDesktop) {
      src = lgDesktopSrc;
    } else if (isDesktop) {
      src = desktopSrc;
    } else if (tabletSrc && isTablet) {
      src = tabletSrc;
    } else if (isMobile) {
      src = mobileSrc;
    }

    setImageSrc(src);
    setIsLoaded(false);
  }, [isMobile, isTablet, isDesktop, isLargeDesktop, mobileSrc, tabletSrc, desktopSrc, lgDesktopSrc]);

  const handleImageLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    console.warn(`Failed to load image: ${imageSrc}`);
    onError?.();
  }, [imageSrc, onError]);

  return (
    <div
      className={`responsive-image-container relative overflow-hidden ${className}`}
      style={{
        backgroundColor: bgColor,
      }}
    >
      <img
        src={imageSrc}
        alt={alt}
        loading={loading}
        className={`w-full h-full ${blur && !isLoaded ? 'blur-sm' : ''} transition-all duration-300`}
        style={{
          objectFit,
          opacity: isLoaded ? 1 : 0.8,
          width: width || '100%',
          height: height || '100%',
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Loading skeleton */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            backgroundColor: 'rgba(0,0,0,0.1)',
          }}
        />
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded"
          style={{ display: 'none' }}
        >
          {isMobile && 'Mobile'}
          {isTablet && 'Tablet'}
          {isDesktop && !isLargeDesktop && 'Desktop'}
          {isLargeDesktop && 'Large Desktop'}
          {` (${screenWidth}px)`}
        </div>
      )}
    </div>
  );
};

export default ResponsiveImage;

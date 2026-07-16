import React, { ReactNode, useRef } from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface TouchAwareProps {
  children: ReactNode;
  /** Callback when user swipes left */
  onSwipeLeft?: () => void;
  /** Callback when user swipes right */
  onSwipeRight?: () => void;
  /** Callback when user swipes up */
  onSwipeUp?: () => void;
  /** Callback when user swipes down */
  onSwipeDown?: () => void;
  /** Minimum distance to register as swipe (default: 50px) */
  minDistance?: number;
  /** Allow vertical swipes */
  allowVerticalSwipe?: boolean;
  /** Allow horizontal swipes */
  allowHorizontalSwipe?: boolean;
  className?: string;
}

/**
 * TouchAware Component
 * Wraps children with touch gesture detection
 * Only active on touch devices (mobile, tablet)
 * 
 * @example
 * <TouchAware
 *   onSwipeLeft={() => console.log('Swiped left')}
 *   onSwipeRight={() => console.log('Swiped right')}
 * >
 *   <Carousel />
 * </TouchAware>
 */
export const TouchAware: React.FC<TouchAwareProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = 50,
  allowVerticalSwipe = true,
  allowHorizontalSwipe = true,
  className = '',
}) => {
  const { isTouchDevice } = useResponsive();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const distanceX = touchStartRef.current.x - endX;
    const distanceY = touchStartRef.current.y - endY;

    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    // Horizontal swipes
    if (allowHorizontalSwipe && isHorizontalSwipe) {
      if (Math.abs(distanceX) > minDistance) {
        if (distanceX > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }
    }

    // Vertical swipes
    if (allowVerticalSwipe && !isHorizontalSwipe) {
      if (Math.abs(distanceY) > minDistance) {
        if (distanceY > 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    }

    touchStartRef.current = null;
  };

  // Don't add touch listeners to non-touch devices
  if (!isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

/**
 * Container Component
 * Responsive container with automatic padding and max-width
 */
interface ContainerProps {
  children: ReactNode;
  /** Container type: full, max, or centered */
  type?: 'full' | 'max' | 'centered';
  /** Max width (Tailwind classes like max-w-7xl) */
  maxWidth?: string;
  className?: string;
  /** Whether to add top/bottom padding (for main content) */
  withPadding?: boolean;
  /** Add background color */
  bgColor?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  type = 'centered',
  maxWidth = 'max-w-7xl',
  className = '',
  withPadding = true,
  bgColor,
}) => {
  const { isMobile } = useResponsive();

  let containerClass = '';

  if (type === 'full') {
    containerClass = 'w-full';
  } else if (type === 'max') {
    containerClass = `w-full ${maxWidth} mx-auto`;
  } else {
    containerClass = `w-full max-w-6xl mx-auto`;
  }

  const padding = withPadding ? (isMobile ? 'px-4 py-4' : 'px-6 py-6') : '';

  return (
    <div
      className={`${containerClass} ${padding} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {children}
    </div>
  );
};

/**
 * SafeArea Component
 * Adds safe area insets for devices with notches (iPhone X, etc.)
 */
interface SafeAreaProps {
  children: ReactNode;
  className?: string;
}

export const SafeArea: React.FC<SafeAreaProps> = ({ children, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
};

/**
 * BottomSheet Component
 * Mobile-optimized bottom sheet/drawer
 */
interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  isOpen,
  onClose,
  title,
  height = 'half',
  className = '',
}) => {
  const { isMobile } = useResponsive();

  if (!isMobile) {
    return null;
  }

  if (!isOpen) {
    return null;
  }

  const heightClass =
    height === 'full' ? 'max-h-[95vh]' : height === 'half' ? 'max-h-[50vh]' : 'max-h-auto';

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl overflow-y-auto ${heightClass} ${className}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="sticky top-0 px-4 py-3 bg-white border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4 pb-24">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Container;

import React, { ReactNode } from 'react';
import { useResponsive } from '../hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: ReactNode;
  /** Mobile layout (under 768px) */
  mobile?: ReactNode;
  /** Tablet layout (768px - 1024px) */
  tablet?: ReactNode;
  /** Desktop layout (1024px and above) */
  desktop?: ReactNode;
  /** Whether to use full width on mobile */
  fullWidthMobile?: boolean;
  /** Padding on mobile */
  mobilePadding?: string;
  /** Padding on tablet */
  tabletPadding?: string;
  /** Padding on desktop */
  desktopPadding?: string;
}

/**
 * ResponsiveLayout Component
 * Provides layout-aware rendering based on device type
 * Useful for showing different content structures on different devices
 * 
 * @example
 * <ResponsiveLayout
 *   mobile={<MobileLayout />}
 *   desktop={<DesktopLayout />}
 * />
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  mobile,
  tablet,
  desktop,
  fullWidthMobile = true,
  mobilePadding = 'px-4 py-4',
  tabletPadding = 'px-6 py-6',
  desktopPadding = 'px-8 py-8',
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  // Render device-specific layout if provided
  if (isMobile && mobile) return <>{mobile}</>;
  if (isTablet && tablet) return <>{tablet}</>;
  if (isDesktop && desktop) return <>{desktop}</>;

  // Otherwise, render default children with responsive padding
  const padding = isMobile ? mobilePadding : isTablet ? tabletPadding : desktopPadding;
  const width = fullWidthMobile && isMobile ? 'w-full' : 'container mx-auto';

  return (
    <div className={`${width} ${padding}`}>
      {children}
    </div>
  );
};

/**
 * ResponsiveGrid Component
 * Automatically adjusts grid columns based on screen size
 */
interface ResponsiveGridProps {
  children: ReactNode;
  /** Mobile columns (default: 1) */
  mobileColsCount?: 1 | 2;
  /** Tablet columns (default: 2) */
  tabletColsCount?: 2 | 3;
  /** Desktop columns (default: 3) */
  desktopColsCount?: 2 | 3 | 4;
  /** Large desktop columns */
  lgDesktopColsCount?: 4 | 5 | 6;
  /** Gap size */
  gap?: 'gap-2' | 'gap-3' | 'gap-4' | 'gap-6' | 'gap-8';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  mobileColsCount = 1,
  tabletColsCount = 2,
  desktopColsCount = 3,
  lgDesktopColsCount = 4,
  gap = 'gap-4',
}) => {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useResponsive();

  let cols = 'grid-cols-1';
  if (isMobile && mobileColsCount === 2) cols = 'grid-cols-2';
  if (isTablet && tabletColsCount === 3) cols = 'grid-cols-3';
  if (isDesktop) {
    if (desktopColsCount === 2) cols = 'grid-cols-2';
    else if (desktopColsCount === 4) cols = 'grid-cols-4';
    else cols = 'grid-cols-3';
  }
  if (isLargeDesktop) {
    if (lgDesktopColsCount === 5) cols = 'grid-cols-5';
    else if (lgDesktopColsCount === 6) cols = 'grid-cols-6';
    else cols = 'grid-cols-4';
  }

  return <div className={`grid ${cols} ${gap}`}>{children}</div>;
};

/**
 * ShowOn Component
 * Conditionally show content based on device type or breakpoint
 */
interface ShowOnProps {
  children: ReactNode;
  on: 'mobile' | 'tablet' | 'desktop' | 'touch' | 'mobileUp' | 'tabletUp' | 'desktopUp';
  className?: string;
}

export const ShowOn: React.FC<ShowOnProps> = ({ children, on, className = '' }) => {
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useResponsive();

  let show = false;
  switch (on) {
    case 'mobile':
      show = isMobile;
      break;
    case 'tablet':
      show = isTablet;
      break;
    case 'desktop':
      show = isDesktop;
      break;
    case 'touch':
      show = isTouchDevice;
      break;
    case 'mobileUp':
      show = true; // Always show (mobile and up)
      break;
    case 'tabletUp':
      show = isTablet || isDesktop;
      break;
    case 'desktopUp':
      show = isDesktop;
      break;
  }

  if (!show) return null;

  return <div className={className}>{children}</div>;
};

/**
 * HideOn Component
 * Conditionally hide content based on device type or breakpoint
 */
interface HideOnProps {
  children: ReactNode;
  on: 'mobile' | 'tablet' | 'desktop' | 'touch' | 'mobileOnly' | 'tabletOnly';
  className?: string;
}

export const HideOn: React.FC<HideOnProps> = ({ children, on, className = '' }) => {
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useResponsive();

  let hide = false;
  switch (on) {
    case 'mobile':
      hide = isMobile;
      break;
    case 'tablet':
      hide = isTablet;
      break;
    case 'desktop':
      hide = isDesktop;
      break;
    case 'touch':
      hide = isTouchDevice;
      break;
    case 'mobileOnly':
      hide = isMobile;
      break;
    case 'tabletOnly':
      hide = isTablet;
      break;
  }

  if (hide) return null;

  return <div className={className}>{children}</div>;
};

export default ResponsiveLayout;

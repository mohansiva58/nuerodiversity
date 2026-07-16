import { useEffect, useState } from 'react';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  activeBreakpoint: Breakpoint;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  isPortrait: boolean;
  isTouchDevice: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * useResponsive Hook
 * Provides reactive responsive design state based on window size and device characteristics
 * 
 * @returns {ResponsiveState} Current responsive state
 * 
 * @example
 * const { isMobile, isDesktop, deviceType } = useResponsive();
 * return isMobile ? <MobileLayout /> : <DesktopLayout />;
 */
export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? (window.innerWidth >= 768 && window.innerWidth < 1024) : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    isLargeDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1536 : false,
    activeBreakpoint: 'md' as Breakpoint,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
    isPortrait: typeof window !== 'undefined' ? window.innerHeight >= window.innerWidth : true,
    isTouchDevice: typeof window !== 'undefined' ? 'ontouchstart' in window : false,
    deviceType: 'desktop' as 'mobile' | 'tablet' | 'desktop',
  }));

  useEffect(() => {
    const getBreakpoint = (width: number): Breakpoint => {
      if (width < 640) return 'xs';
      if (width < 768) return 'sm';
      if (width < 1024) return 'md';
      if (width < 1280) return 'lg';
      if (width < 1536) return 'xl';
      return '2xl';
    };

    const getDeviceType = (width: number): 'mobile' | 'tablet' | 'desktop' => {
      if (width < 768) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    };

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isLargeDesktop: width >= 1536,
        activeBreakpoint: getBreakpoint(width),
        screenWidth: width,
        screenHeight: height,
        isLandscape: width > height,
        isPortrait: height >= width,
        isTouchDevice: 'ontouchstart' in window,
        deviceType: getDeviceType(width),
      });
    };

    const handleOrientationChange = () => {
      setTimeout(handleResize, 100); // Delay to get new dimensions
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return state;
};

/**
 * Helper to check if screen matches a breakpoint and above
 */
export const useBreakpointUp = (breakpoint: Breakpoint): boolean => {
  const { screenWidth } = useResponsive();
  return screenWidth >= BREAKPOINTS[breakpoint];
};

/**
 * Helper to check if screen matches a breakpoint and below
 */
export const useBreakpointDown = (breakpoint: Breakpoint): boolean => {
  const { screenWidth } = useResponsive();
  return screenWidth < BREAKPOINTS[breakpoint] + 1;
};

/**
 * Helper to check if screen is only this breakpoint
 */
export const useBreakpointOnly = (breakpoint: Breakpoint): boolean => {
  const { activeBreakpoint } = useResponsive();
  return activeBreakpoint === breakpoint;
};

'use client';

import { useEffect, useState } from 'react';

export type ViewportSize = 'phone' | 'tablet' | 'laptop' | 'desktop';

export function useBreakpoint() {
  const [width, setWidth] = useState<number>(1280);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isPhone = width < 760;
  const isTablet = width >= 760 && width < 1100;
  const isLaptop = width >= 1100 && width < 1280;
  const isDesktop = width >= 1280;

  const size: ViewportSize = isPhone
    ? 'phone'
    : isTablet
      ? 'tablet'
      : isLaptop
        ? 'laptop'
        : 'desktop';

  return { width, size, isPhone, isTablet, isLaptop, isDesktop };
}

import { useLocation } from '@remix-run/react';
import { useEffect } from 'react';

export default function ScrollToTop({ element }: { element?: Element }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (element && pathname) {
      element.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [element, pathname]);

  return null;
}

import { useEffect, useState } from 'react';

/**
 * A hash router in twenty lines. The app has eight fixed screens and no dynamic
 * segments, so a routing library would be more moving parts than the problem needs —
 * and hash routing means the built app works from any static host or the file system.
 */

export const ROUTES = [
  'dashboard',
  'monthly',
  'scenarios',
  'inputs',
  'operating-costs',
  'financing',
  'actuals',
  'reconciliation',
] as const;

export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const candidate = hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(candidate) ? candidate : 'dashboard';
}

export function useRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (next: Route) => {
    window.location.hash = `#/${next}`;
    // Landing on a new screen should start at the top, like a real page load.
    window.scrollTo({ top: 0 });
  };

  return [route, navigate];
}

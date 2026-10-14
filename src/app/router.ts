import { useEffect, useState } from 'react'

export type Route =
  | { name: 'board'; id: string | null }
  | { name: 'library' }
  | { name: 'teams' }
  | { name: 'share'; payload: string }

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [segment, id] = raw.split('/')
  if (segment === 'library') return { name: 'library' }
  if (segment === 'teams') return { name: 'teams' }
  if (segment === 's' && id) return { name: 'share', payload: id }
  if (segment === 'board' && id) return { name: 'board', id }
  return { name: 'board', id: null }
}

export function routeToHash(route: Route): string {
  if (route.name === 'library') return '#/library'
  if (route.name === 'teams') return '#/teams'
  if (route.name === 'share') return `#/s/${route.payload}`
  return route.id ? `#/board/${route.id}` : '#/'
}

/** Navegacion por hash, sin dependencias externas. */
export function navigate(route: Route): void {
  const hash = routeToHash(route)
  if (window.location.hash !== hash) window.location.hash = hash
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return route
}

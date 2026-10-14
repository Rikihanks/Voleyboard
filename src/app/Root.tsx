import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { BoardScreen } from './BoardScreen'
import { navigate, useRoute } from './router'

const LibraryScreen = lazy(() =>
  import('@/features/library/LibraryScreen').then((module) => ({ default: module.LibraryScreen })),
)
const TeamsScreen = lazy(() =>
  import('@/features/teams/TeamsScreen').then((module) => ({ default: module.TeamsScreen })),
)

/** Conmuta entre pizarra, biblioteca y equipos segun la ruta. */
export function Root() {
  const { t } = useTranslation()
  const route = useRoute()

  if (route.name === 'library') {
    return (
      <Suspense fallback={<div className="screen-loading">{t('library.title')}…</div>}>
        <LibraryScreen onOpenBoard={(id) => navigate({ name: 'board', id })} />
      </Suspense>
    )
  }

  if (route.name === 'teams') {
    return (
      <Suspense fallback={<div className="screen-loading">{t('teams.title')}…</div>}>
        <TeamsScreen />
      </Suspense>
    )
  }

  if (route.name === 'share') {
    return <BoardScreen boardId={null} sharedPayload={route.payload} />
  }

  return <BoardScreen boardId={route.id} />
}

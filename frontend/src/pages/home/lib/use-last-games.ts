import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listRounds } from '@shared/api'

export function useLastGames() {
  const query = useQuery({
    queryKey: ['rounds'],
    queryFn: listRounds,
  })

  const rounds = useMemo(() => {
    if (!query.data?.rounds) return []
    return [...query.data.rounds]
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 5)
  }, [query.data])

  return {
    rounds,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

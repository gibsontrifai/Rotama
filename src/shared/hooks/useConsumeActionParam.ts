import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useConsumeActionParam() {
  const [searchParams, setSearchParams] = useSearchParams()

  return useCallback(
    (expectedAction?: string) => {
      const actionValue = searchParams.get('action')

      if (!actionValue) {
        return null
      }

      if (expectedAction && actionValue !== expectedAction) {
        return null
      }

      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        next.delete('action')
        return next
      })

      return actionValue
    },
    [searchParams, setSearchParams],
  )
}
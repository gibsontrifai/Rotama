import { useCallback, useState } from 'react'

export function useAsyncAction<TArgs extends unknown[]>(action: (...args: TArgs) => Promise<void> | void) {
  const [isRunning, setIsRunning] = useState(false)

  const run = useCallback(
    async (...args: TArgs) => {
      setIsRunning(true)
      try {
        await action(...args)
      } finally {
        setIsRunning(false)
      }
    },
    [action],
  )

  return {
    isRunning,
    run,
  }
}
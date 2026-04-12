import { useMemo, useState } from 'react'

export function useConfirmAction<T>() {
  const [target, setTarget] = useState<T | null>(null)

  const isOpen = useMemo(() => target !== null, [target])

  const open = (nextTarget: T) => {
    setTarget(nextTarget)
  }

  const close = () => {
    setTarget(null)
  }

  return {
    target,
    isOpen,
    open,
    close,
  }
}
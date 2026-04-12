import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseQueryParamNumberOptions = {
  key: string
  defaultValue: number
  min?: number
  max?: number
}

function clamp(value: number, min?: number, max?: number) {
  const withMin = min !== undefined ? Math.max(min, value) : value
  return max !== undefined ? Math.min(max, withMin) : withMin
}

export function useQueryParamNumber({ key, defaultValue, min, max }: UseQueryParamNumberOptions) {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = useMemo(() => {
    const raw = searchParams.get(key)
    const parsed = raw ? Number(raw) : Number.NaN
    if (Number.isFinite(parsed)) {
      return clamp(parsed, min, max)
    }

    return clamp(defaultValue, min, max)
  }, [defaultValue, key, max, min, searchParams])

  const setValue = (nextValue: number) => {
    const normalized = clamp(nextValue, min, max)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (normalized === clamp(defaultValue, min, max)) {
        next.delete(key)
      } else {
        next.set(key, String(normalized))
      }

      return next
    })
  }

  return {
    value,
    setValue,
  }
}
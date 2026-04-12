import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseQueryParamBooleanOptions = {
  key: string
  defaultValue: boolean
}

export function useQueryParamBoolean({ key, defaultValue }: UseQueryParamBooleanOptions) {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = useMemo(() => {
    const raw = searchParams.get(key)
    if (raw === '1' || raw === 'true') {
      return true
    }

    if (raw === '0' || raw === 'false') {
      return false
    }

    return defaultValue
  }, [defaultValue, key, searchParams])

  const setValue = (nextValue: boolean) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (nextValue === defaultValue) {
        next.delete(key)
      } else {
        next.set(key, nextValue ? '1' : '0')
      }

      return next
    })
  }

  return {
    value,
    setValue,
  }
}
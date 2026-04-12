import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseQueryParamStringOptions = {
  key: string
  defaultValue: string
}

export function useQueryParamString({ key, defaultValue }: UseQueryParamStringOptions) {
  const [searchParams, setSearchParams] = useSearchParams()

  const value = useMemo(() => searchParams.get(key) ?? defaultValue, [defaultValue, key, searchParams])

  const setValue = (nextValue: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (!nextValue || nextValue === defaultValue) {
        next.delete(key)
      } else {
        next.set(key, nextValue)
      }

      return next
    })
  }

  return {
    value,
    setValue,
  }
}
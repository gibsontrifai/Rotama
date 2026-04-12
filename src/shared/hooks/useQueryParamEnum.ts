import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseQueryParamEnumOptions<T extends string> = {
  key: string
  values: readonly T[]
  defaultValue: T
}

export function useQueryParamEnum<T extends string>({ key, values, defaultValue }: UseQueryParamEnumOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const currentValue = useMemo(() => {
    const rawValue = searchParams.get(key)
    if (rawValue && values.includes(rawValue as T)) {
      return rawValue as T
    }

    return defaultValue
  }, [defaultValue, key, searchParams, values])

  const setValue = (nextValue: T) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      if (nextValue === defaultValue) {
        next.delete(key)
      } else {
        next.set(key, nextValue)
      }

      return next
    })
  }

  return {
    value: currentValue,
    setValue,
  }
}
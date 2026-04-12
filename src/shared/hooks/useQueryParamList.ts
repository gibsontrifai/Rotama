import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

type UseQueryParamListOptions<T extends string> = {
  key: string
  values: readonly T[]
  defaultValues: readonly T[]
}

function normalizeValues<T extends string>(input: readonly T[], allowedValues: readonly T[]) {
  const unique = Array.from(new Set(input))
  return unique
    .filter((value) => allowedValues.includes(value))
    .sort((first, second) => allowedValues.indexOf(first) - allowedValues.indexOf(second))
}

export function useQueryParamList<T extends string>({ key, values, defaultValues }: UseQueryParamListOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams()

  const normalizedDefaults = useMemo(() => normalizeValues(defaultValues, values), [defaultValues, values])

  const currentValues = useMemo(() => {
    const rawValue = searchParams.get(key)
    if (!rawValue) {
      return normalizedDefaults
    }

    const parsed = rawValue
      .split(',')
      .map((item) => item.trim() as T)

    const normalized = normalizeValues(parsed, values)
    return normalized.length > 0 ? normalized : normalizedDefaults
  }, [key, normalizedDefaults, searchParams, values])

  const setValues = (nextValues: readonly T[]) => {
    const normalizedNext = normalizeValues(nextValues, values)

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)

      const nextJoined = normalizedNext.join(',')
      const defaultJoined = normalizedDefaults.join(',')

      if (!nextJoined || nextJoined === defaultJoined) {
        next.delete(key)
      } else {
        next.set(key, nextJoined)
      }

      return next
    })
  }

  const toggleValue = (value: T, keepAtLeastOne = true) => {
    if (!values.includes(value)) {
      return
    }

    if (currentValues.includes(value)) {
      const next = currentValues.filter((item) => item !== value)
      if (keepAtLeastOne && next.length === 0) {
        return
      }

      setValues(next)
      return
    }

    setValues([...currentValues, value])
  }

  return {
    values: currentValues,
    setValues,
    toggleValue,
  }
}
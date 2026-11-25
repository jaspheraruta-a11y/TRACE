import { useCallback, useEffect, useRef, useState } from 'react'
import { archiveErrorMessage } from '@/lib/archive/errors'

export interface AsyncDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (value: T | null) => void
}

/**
 * Small fetch-on-mount helper for Supabase reads. The dependency list is
 * serialized so callers can pass primitive filter values without recreating a
 * loader function on every render.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const key = JSON.stringify(deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    void loaderRef
      .current()
      .then((result) => {
        if (!active) return
        setData(result)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(archiveErrorMessage(cause))
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [key, reloadToken])

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return { data, loading, error, reload, setData }
}

import { useCallback, useEffect, useState } from 'react'
import { fetchFromTMDB } from '../api.js'

// Seperti useFetch, tapi mendukung paging: memuat halaman demi halaman lalu
// menumpuk hasilnya. `params` harus stabil (mis. object literal dari render
// yang sama tidak masalah karena dibandingkan lewat JSON).
export function usePaginatedFetch(path, params = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(0)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setItems([])
    setPage(0)
    setTotalPages(1)

    fetchFromTMDB(path, { ...params, page: 1 })
      .then((json) => {
        if (cancelled) return
        setItems(json?.results ?? [])
        setTotalPages(json?.total_pages ?? 1)
        setPage(1)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey])

  const loadMore = useCallback(async () => {
    const nextPage = page + 1
    if (loadingMore || nextPage > totalPages) return

    setLoadingMore(true)
    try {
      const json = await fetchFromTMDB(path, { ...params, page: nextPage })
      const results = json?.results ?? []
      setItems((prev) => [...prev, ...results])
      setTotalPages(json?.total_pages ?? totalPages)
      setPage(nextPage)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, loadingMore, page, totalPages])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: page < totalPages,
    loadMore,
  }
}

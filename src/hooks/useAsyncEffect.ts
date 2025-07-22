import { useEffect, DependencyList } from 'react'

export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void>,
  deps?: DependencyList
) {
  useEffect(() => {
    const controller = new AbortController()
    effect(controller.signal).catch(e => console.error(e))
    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { metalRatesApi } from '../api/metalRates'

export function useSilverRate() {
  const queryClient = useQueryClient()

  const { data: rate, isLoading, refetch } = useQuery({
    queryKey: ['silver-rate-current'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
    staleTime: 30000,
  })

  // Keep a small slice of history so widgets can show how much the rate
  // changed vs. the previous change (same logic as the MetalRates page).
  const { data: history } = useQuery({
    queryKey: ['metal-rates-history'],
    queryFn: () => metalRatesApi.getHistory({ limit: 2 }).then((r) => r.data.data),
    staleTime: 30000,
  })

  const currentRate = rate?.rate ? parseFloat(rate.rate) : 0
  const lastUpdated = rate?.updatedAt

  // Previous rate = the one before the latest recorded change.
  const previousRate =
    history?.length > 1
      ? parseFloat(history[1].newRate)
      : history?.length === 1
        ? parseFloat(history[0].oldRate)
        : null

  const change = previousRate && currentRate ? currentRate - previousRate : 0
  const changePct = previousRate ? (change / previousRate) * 100 : 0
  const trend = !previousRate || change === 0 ? 'flat' : change > 0 ? 'up' : 'down'

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['silver-rate-current'] })
    queryClient.invalidateQueries({ queryKey: ['metal-rates'] })
    queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] })
  }

  return { currentRate, lastUpdated, previousRate, change, changePct, trend, isLoading, refetch, invalidate }
}
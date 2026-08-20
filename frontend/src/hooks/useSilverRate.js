import { useQuery, useQueryClient } from '@tanstack/react-query'
import { metalRatesApi } from '../api/metalRates'

export function useSilverRate() {
  const queryClient = useQueryClient()

  const { data: rate, isLoading, refetch } = useQuery({
    queryKey: ['silver-rate-current'],
    queryFn: () => metalRatesApi.getCurrent().then((r) => r.data.data),
    staleTime: 30000,
  })

  const currentRate = rate?.rate ? parseFloat(rate.rate) : 0
  const lastUpdated = rate?.updatedAt

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['silver-rate-current'] })
    queryClient.invalidateQueries({ queryKey: ['metal-rates'] })
    queryClient.invalidateQueries({ queryKey: ['metal-rates-history'] })
  }

  return { currentRate, lastUpdated, isLoading, refetch, invalidate }
}
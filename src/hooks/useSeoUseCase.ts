import { useQuery } from '@tanstack/react-query';
import { SeoUseCaseRepository } from '@/repositories/seo-use-case.repository';
import { SeoUseCaseService } from '@/services/seo-use-case.service';

const seoUseCaseRepository = new SeoUseCaseRepository();
const seoUseCaseService = new SeoUseCaseService(seoUseCaseRepository);

export const seoUseCaseQueryKeys = {
  all: ['seo-use-cases'] as const,
  index: () => [...seoUseCaseQueryKeys.all, 'index'] as const,
  detail: (slug: string) => [...seoUseCaseQueryKeys.all, 'detail', slug] as const,
  taxonomy: () => [...seoUseCaseQueryKeys.all, 'taxonomy'] as const,
};

export function useSeoUseCaseIndex() {
  return useQuery({
    queryKey: seoUseCaseQueryKeys.index(),
    queryFn: () => seoUseCaseService.getPublishedIndex(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSeoUseCase(slug: string | undefined) {
  return useQuery({
    queryKey: seoUseCaseQueryKeys.detail(slug ?? ''),
    queryFn: () => {
      if (!slug) return Promise.resolve(null);
      return seoUseCaseService.getPublishedPage(slug);
    },
    enabled: Boolean(slug?.trim()),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSeoUseCaseTaxonomy() {
  return useQuery({
    queryKey: seoUseCaseQueryKeys.taxonomy(),
    queryFn: () => seoUseCaseService.getTaxonomy(),
    staleTime: 30 * 60 * 1000,
  });
}

export { seoUseCaseService };

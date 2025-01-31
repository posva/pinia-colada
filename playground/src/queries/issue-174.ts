import { defineQuery, useQuery } from '@pinia/colada'
import { useRoute } from 'vue-router'

// ~/queries/page.ts
export const usePage = defineQuery(() => {
  const route = useRoute('/bug-reports/issue-174/[slug]')
  return useQuery({
    key: () => ['pages', route.params.slug],
    query: () => delay(route.params.slug),
    gcTime: 2000,
  })
})

// delay to imitate fetch
function delay(str: string) {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve(str)
    }, 200),
  )
}

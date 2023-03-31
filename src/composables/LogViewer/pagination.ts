import { computed } from 'vue'

export const getPaginationData = (page: number, perPage: number, totalItems: number) => {
    const totalPages = computed(() => Math.ceil(totalItems / perPage))
    const hasPreviousPage = computed(() => page > 1)
    const hasNextPage = computed(() => page < totalPages.value)
    const paginationLinks = computed(() => {
        // two pages before and after the current page but not beyond the start or end
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages.value, page + 2);
        const links = [];
        for (let i = start; i <= end; i++) {
            links.push(i);
        }
        return links;
    });

    return {
        totalPages,
        hasPreviousPage,
        hasNextPage,
        paginationLinks,
    }
}
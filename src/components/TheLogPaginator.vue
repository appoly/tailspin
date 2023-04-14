<template>
    <div class="my-5" v-if="totalItems">
        <div class="row justify-content-center">
            <div class="col-8 text-center align-content-center">
                <nav id="pagination">
                    <ul class="pagination">
                        <!-- pagination buttons -->
                        <li v-if="page !== 1" class="page-item">
                            <button class="page-link" @click="() => changePage(1)">
                                First
                            </button>
                        </li>
                        <li class="page-item">
                            <button class="page-link" @click="() => changePage(page - 1)" :disabled="!hasPreviousPage">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                        </li>
                        <!-- paginationLinks -->
                        <li class="page-item" v-for="pageNumber in paginationLinks"
                            :class="{ 'active': pageNumber === page }">
                            <button class="page-link" @click="() => changePage(pageNumber)">
                                {{ pageNumber }}
                            </button>
                        </li>

                        <!-- next -->
                        <li class="page-item">
                            <button class="page-link" @click="() => changePage(page + 1)" :disabled="!hasNextPage">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        </li>
                        <li v-if="page !== totalPages" class="page-item">
                            <button class="page-link" @click="() => changePage(totalPages)">
                                Last
                            </button>
                        </li>
                    </ul>
                </nav>
                Showing {{ (page - 1) * itemsPerPage + 1 }} - {{ page * itemsPerPage }} of {{ totalItems }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    totalItems: number;
    itemsPerPage: number;
    page: number;
}>();

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage));
const hasPreviousPage = computed(() => props.page > 1);
const hasNextPage = computed(() => props.page < totalPages.value);
const paginationLinks = computed(() => {
    // two pages before and after the current page but not beyond the start or end
    const start = Math.max(1, props.page - 2);
    const end = Math.min(totalPages.value, props.page + 2);
    const links = [];
    for (let i = start; i <= end; i++) {
        links.push(i);
    }
    return links;
});

const emit = defineEmits(['changePage']);
function changePage(type: number) {
    emit('changePage', type);
}
</script>

<style lang="scss" scoped>
#pagination {
    // center pagination
    display: flex;
    justify-content: center;
    align-items: center;

}
</style>
<template>
    <div class="mt-2 mb-4">
        <!-- Search Bar -->
        <div class="input-group mb-3">
            <SearchBar placeholder="Filter by level, time or message" :disabled="isLoading"
                v-model:search-term="searchTerm" />
        </div>

        <!-- Filter by severity -->
        <div class="d-flex">
            <div class="d-flex justify-content-between flex-grow-1">
                <div class="d-flex">
                    <SeverityFilter v-for="filter in severityFilters" class="me-2" :severity="filter.severity"
                        :count="filter.count" :selected="filter.selected.value"
                        @click="filterBySeverity(filter.severity)" />
                </div>
                <div>
                    <select v-model="itemsPerPage" class="form-select w-fit" :disabled="isLoading">
                        <option :value="20">20 Per Page</option>
                        <option :value="50">50 Per Page</option>
                        <option :value="100">100 Per Page</option>
                        <option :value="200">200 Per Page</option>
                    </select>
                </div>
            </div>
            <slot name="additional-filters" />
        </div>
    </div>

    <slot name="above-table" />

    <div class="row mt-4">
        <div class="col-2 log-item-severity">
            Severity
        </div>
        <div class="col-2 log-item-time">
            Time
        </div>
        <div class="col">
            Message
        </div>
    </div>
    <div v-if="errorMsg" class="mt-2 alert alert-danger">
        {{ errorMsg }}
    </div>
    <Transition>
        <div key="placeholder" v-if="isLoading">
            <div v-for="row in 25" class="row p-2 my-2 cursor-none">
                <div class="col-2 log-item-severity placeholder-glow">
                    <span class="col-4 placeholder rounded"
                        :class="'bg-' + selectRandomFromArray(['primary', 'warning', 'danger', 'secondary'])"></span>
                </div>
                <div class="col-2 log-item-time placeholder-glow">
                    <span class="col-4 placeholder rounded"></span>
                </div>
                <div class="col log-item-text placeholder-glow">
                    <span class="col-10 placeholder rounded"></span>
                </div>
            </div>
        </div>
    </Transition>
    <div key="entries" v-if="!isLoading">
        <div class="log-container">
            <TheLogEntry v-for="logItem in currentPageItems" :logItem="logItem" />
        </div>

        <!-- pagination -->
        <TheLogPaginator :totalItems="filteredLogItems.length" :itemsPerPage="itemsPerPage" :page="page"
            @changePage="changePage" />

        <div class="d-flex justify-content-end" v-if="filteredLogItems.length > 0">
            <button class="btn btn-outline-secondary" type="button" @click="jumpToTop">
                <i class="bi bi-arrow-up"></i>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { LogStatuses } from "@/constants/LogStatuses"
import TheLogEntry from "@/components/TheLogEntry.vue"
import TheLogPaginator from "@/components/TheLogPaginator.vue";
import SeverityFilter from "@/components/SeverityFilter.vue";
import { LogEntry } from "$/interfaces";
import { selectRandomFromArray } from "@/helpers";
import { useFilterLogs } from "@/composables/LogViewer/filterLogs";
import SearchBar from "./SearchBar.vue";

const props = defineProps<{
    logEntries: LogEntry[];
    isLoading: boolean;
    errorMsg: string;
}>();

const searchTerm = ref('');
const selectedSeverity = ref('');

const page = ref(1);
const itemsPerPage = ref(20);

const filteredLogItems = computed(() => {
    const search = searchTerm.value.toLowerCase();
    let items = props.logEntries;

    return useFilterLogs(items, search, selectedSeverity.value);
});

// When a search tem is entered, reset the page to 1:
watch(searchTerm, () => {
    changePage(1);
});

// We want to be able to access the changePage function from outside this component:
defineExpose({ changePage });

const currentPageItems = computed(() => {
    return filteredLogItems.value.slice((page.value - 1) * itemsPerPage.value, page.value * itemsPerPage.value);
});

const severityFilters = computed(() => {
    const filters = [];
    for (const severity of LogStatuses) {
        const upperCaseSeverity = severity.toUpperCase();
        const count = props.logEntries.filter((logItem) => logItem.severity === upperCaseSeverity).length;
        if (count > 0) {
            filters.push({
                severity: upperCaseSeverity,
                count: count,
                selected: computed(() => selectedSeverity.value === upperCaseSeverity)
            });
        }
    }
    return filters;
});

function changePage(pageNumber: number) {
    page.value = pageNumber;
}

function filterBySeverity(severity: string) {
    if (selectedSeverity.value === severity) {
        selectedSeverity.value = '';
    } else {
        selectedSeverity.value = severity;
    }
}

function jumpToTop() {
    document.getElementById('logViewerHeader')?.scrollIntoView({ behavior: 'smooth' });
}

</script>

<style scoped lang="scss">
.v-enter-active {
    transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}
</style>
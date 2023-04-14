<template>
    <div class="mt-2 mb-4">
        <!-- Search Bar -->
        <div class="input-group mb-3">
            <input type="text" class="form-control" placeholder="Filter by level, time or message" v-model="searchTerm"
                :disabled="isLoading" />
        </div>

        <!-- Filter by severity -->
        <div class="d-flex mb-4 ">
            <SeverityFilter v-for="filter in severityFilters" class="me-2" :severity="filter.severity" :count="filter.count"
                :selected="filter.selected.value" @click="filterBySeverity(filter.severity)" />
        </div>
    </div>

    <div class="row">
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
    <template v-if="isLoading">
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
    </template>
    <template v-else>
        <div class="log-container">
            <TheLogEntry v-for="logItem in currentPageItems" :logItem="logItem" />
        </div>

        <!-- pagination -->
        <TheLogPaginator :totalItems="filteredLogItems.length" :itemsPerPage="itemsPerPage" :page="page"
            @changePage="changePage" />
    </template>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { LogStatuses } from "@/constants/LogStatuses"
import TheLogEntry from "@/components/TheLogEntry.vue"
import TheLogPaginator from "@/components/TheLogPaginator.vue";
import SeverityFilter from "@/components/SeverityFilter.vue";
import { LogEntry } from "@/interfaces";
import { selectRandomFromArray } from "@/helpers";
import { useFilterLogs } from "@/composables/LogViewer/filterLogs";

const props = defineProps<{
    logEntries: LogEntry[];
    isLoading: boolean;
    errorMsg: string;
}>();

const searchTerm = ref('');
const selectedSeverity = ref('');

const page = ref(1);
const itemsPerPage = 20;

const filteredLogItems = computed(() => {
    const search = searchTerm.value.toLowerCase();
    let items = props.logEntries;

    return useFilterLogs(items, search, selectedSeverity.value);
});

const currentPageItems = computed(() => {
    return filteredLogItems.value.slice((page.value - 1) * itemsPerPage, page.value * itemsPerPage);
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

</script>
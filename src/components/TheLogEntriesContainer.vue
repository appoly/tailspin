<template>
    <div>
        <div class="log-container">
            <TheLogEntry v-for="logItem in currentPageItems" :logItem="logItem" />
        </div>

        <!-- pagination -->
        <TheLogPaginator :totalItems="filteredLogItems.length" :itemsPerPage="itemsPerPage" :page="page"
            @change-page="changePage" />
    </div>
</template>

<script setup lang="ts">
import { LogEntry } from '$/interfaces';
import { computed, ref, watch } from 'vue';
import TheLogEntry from './TheLogEntry.vue';
import TheLogPaginator from './TheLogPaginator.vue';
import { debounce } from '@/helpers';

const props = defineProps<{
    page: number;
    itemsPerPage: number;
    searchTerm: string;
    selectedSeverity: string;
    logEntries: LogEntry[];
}>();

const emits = defineEmits(['change-page']);

// On load, there are no filters so we can just use the log entries as-is:
const filteredLogItems = ref<LogEntry[]>(props.logEntries);

const currentPageItems = computed(() => {
    return filteredLogItems.value.slice((props.page - 1) * props.itemsPerPage, props.page * props.itemsPerPage);
});

// Whenever the log entries change, we need to re-filter them:
watch(() => props.logEntries.length, () => loadAndFilterLogEntries(false));

// Delay the filtering of the log entries until the user has stopped typing for 250ms:
watch(() => props.searchTerm, debounce(loadAndFilterLogEntries, 250));
// Filter the log entries when the selected severity changes:
watch(() => props.selectedSeverity, () => loadAndFilterLogEntries());

function loadAndFilterLogEntries(resetPageToOne = true) {
    if (resetPageToOne) {
        changePage(1);
    }
    filteredLogItems.value = filterLogs(props.logEntries, props.searchTerm.toLowerCase(), props.selectedSeverity);
}

function changePage(pageNumber: number) {
    emits('change-page', pageNumber);
}

function filterLogs(logs: LogEntry[], search?: string, severity?: string) {
    let items = logs;

    if (severity) {
        items = items.filter((item: any) => item.severity === severity);
    }

    if (search) {
        const lowerSearch = search.toLowerCase();
        items = items.filter((item: any) => {
            return (
                item.text.toLowerCase().includes(lowerSearch) ||
                item.severity.toLowerCase().includes(lowerSearch) ||
                item.timestamp.includes(lowerSearch)
            );
        });
    }

    return items;
};
</script>
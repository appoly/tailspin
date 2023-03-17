<template>
    <div class="log-item p-2" @click="showAll = !showAll" role="button">
        <div class="log-item-severity">
            <span :class="['badge', severityColour(logItem.severity)]">
                <i :class="severityIcon(logItem.severity)"></i>
                {{ logItem.severity }}
            </span>
        </div>
        <div class="log-item-time">
            <span>
                {{ logItem.timestamp }}
            </span>
        </div>
        <div class="log-item-text text-muted">
            <span>
                {{ logItem.text }}
            </span>
        </div>
    </div>

    <div :class="['container-fluid expanded', { 'show': showAll }]">
        <span>
            {{ logItem.text }}
        </span>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { LogEntry } from "../interfaces";

// define props
defineProps<{
    logItem: LogEntry;
}>();

const showAll = ref(false);

const severityColour = (severity: string) => {
    switch (severity) {
        case "INFO":
            return "bg-primary";
        case "WARN":
            return "bg-warning";
        case "ERROR":
            return "bg-danger";
        default:
            return "bg-secondary";
    }
};

const severityIcon = (severity: string) => {
    switch (severity) {
        case "INFO":
            return "bi bi-info-circle";
        case "WARN":
            return "bi bi-exclamation-triangle";
        case "ERROR":
            return "bi bi-exclamation-circle";
        default:
            return "bi bi-question-circle";
    }
};

</script>
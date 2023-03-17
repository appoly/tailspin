<template>
    <div class="list-group-item p-2 log-ite" @click="showAll = !showAll" role="button">
        <div class="row">
            <div class="col-2 log-item-severity">
                <span :class="['badge', severityColour(logItem.severity)]">
                    <i :class="severityIcon(logItem.severity)"></i>
                    {{ logItem.severity }}
                </span>
            </div>
            <div class="col-2 log-item-time">
                <span>
                    {{ logItem.timestamp }}
                </span>
            </div>
            <div class="col">
                <div class="log-item-text">
                    <span class="text-muted">
                        {{ getEllipsis(logItem.text, 200) }}
                    </span>
                </div>
            </div>
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

function getEllipsis(text: string, maxLength: number) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
    }
    return text;
}

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
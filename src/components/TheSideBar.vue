<template>
    <div class="min-vh-100 d-flex flex-column flex-shrink-0 bg-body-tertiary h-100" style="width: 4.5rem;">
        <ul class="nav nav-pills nav-flush flex-column mb-auto text-center">
            <li class="nav-item">
                <a href="#" class="nav-link active py-3 border-bottom rounded-0" aria-current="page"
                    data-bs-toggle="tooltip" data-bs-placement="right" aria-label="Add new connection"
                    data-bs-original-title="Add new connection">
                    <i class="bi bi-plus-square h2"></i>
                </a>
            </li>
        </ul>
        <div class="dropdown border-top">
            <a href="#" class="nav-link text-center active py-3 border-bottom rounded-0" aria-current="page"
                data-bs-toggle="tooltip" data-bs-placement="right" aria-label="Settings" data-bs-original-title="Settings">
                <i class="bi bi-gear-wide-connected h2"></i>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Tooltip } from 'bootstrap'
import { onMounted } from 'vue';

onMounted(() => {
    new Tooltip(document.body, {
        selector: "[data-bs-toggle='tooltip']",
    });
})
</script>

<style scoped></style>
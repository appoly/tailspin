<template>
    <div ref="genericModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body">
                    <slot />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Modal } from 'bootstrap';

defineExpose({ open, close });

const genericModal = ref(null as unknown as HTMLElement);
const bootstrapModal = ref<Modal>();

onMounted(() => {
    bootstrapModal.value = new Modal(genericModal.value);
});

onUnmounted(() => {
    bootstrapModal.value?.dispose();
});

function open() {
    bootstrapModal.value?.show();
}

function close() {
    bootstrapModal.value?.hide();
}
</script>
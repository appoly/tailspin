<template>
    <div id="sshPassphraseModal" class="modal fade" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body">
                    <form @submit.prevent="handleSubmit">
                        <label class="mb-2">Enter Passphrase</label>
                        <div class="input-group">
                            <input type="password" class="form-control" placeholder="Passphrase" :value="modelValue"
                                @input="handleInputChange" required aria-label="Passphrase" id="passphraseInput" />
                            <button class="btn btn-secondary">Go</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { Modal } from 'bootstrap';

defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue', 'submit']);
defineExpose({ open, close });

const sshPassphraseModal = ref<Modal>();
onMounted(() => {
    sshPassphraseModal.value = new Modal('#sshPassphraseModal');
    document.querySelector('#sshPassphraseModal')!.addEventListener('shown.bs.modal', focusOnInput)
});

onUnmounted(() => {
    sshPassphraseModal.value?.dispose();
});

function handleInputChange(event: Event) {
    emit('update:modelValue', (event.target as HTMLInputElement).value);
}

function handleSubmit() {
    // Give time for the modelValue to change, then emit submit
    nextTick(() => {
        emit('submit');
        close();
    });
}

function open() {
    sshPassphraseModal.value?.show();
}

function close() {
    sshPassphraseModal.value?.hide();
}

function focusOnInput() {
    document.getElementById('passphraseInput')!.focus()
}
</script>
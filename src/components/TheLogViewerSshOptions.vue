<template>
    <div class="card p-3 bg-body-tertiary">
        <form @submit.prevent="submit">
            <h3>Ssh Options</h3>
            <div class="form-group my-4">
                <label for="ssh-number-of-lines">
                    SSH - Number of Lines Override
                </label>
                <div class="input-group">
                    <select class="form-select" v-model="modelValue.numberOfLines" id="ssh-number-of-lines">
                        <option :disabled="!canLoadEntireFile" value="0">
                            Load Entire File <span v-if="!canLoadEntireFile" class="text-muted">(File is too large)</span>
                        </option>
                        <option :value="1000">{{ Number(1000).toLocaleString() }}</option>
                        <option :value="10000">{{ Number(10000).toLocaleString() }}</option>
                        <option :value="50000">{{ Number(50000).toLocaleString() }}</option>
                        <option :value="100000">{{ Number(100000).toLocaleString() }}</option>
                        <option :value="200000">{{ Number(200000).toLocaleString() }}</option>
                    </select>
                    <button @click="() => modelValue.numberOfLines = 0" class="btn btn-secondary" type="button"
                        :disabled="!canLoadEntireFile || modelValue.numberOfLines === 0">Load All
                    </button>
                </div>
                <small class="text-muted">
                    This is the number of lines that will be requested from the log. A larger number will take longer to
                    load, but provide more log entries.
                </small>
                <small class="text-info" v-if="!canLoadEntireFile">
                    <span v-if="props.currentFile">Note: File too large to load all lines.</span>
                </small>
                <small class="text-warning" v-if="modelValue.numberOfLines === 0">
                    This will load the entire file. If the file is too large, this may cause an error to occur.
                </small>
            </div>

            <div class="text-end">
                <button :disabled="isLoading" class="btn btn-primary">
                    {{ buttonText }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { SshOptions } from "$/interfaces";

const props = defineProps<{
    modelValue: SshOptions;
    originalOptions: SshOptions;
    isLoading: boolean;
    currentFile?: { path: string; size: number };
}>();
const emit = defineEmits(['submitted', 'update:modelValue']);

computed({
    get() {
        return props.modelValue;
    },
    set(value) {
        emit('update:modelValue', value);
    }
})

const buttonText = ref("Apply");

// Can only load the entire file if it less than 500Mb:
const canLoadEntireFile = computed(() => {
    if (!props.currentFile) {
        return true;
    }
    return props.currentFile.size < 500000
});

function submit() {
    buttonText.value = "Applying...";
    setTimeout(() => {
        buttonText.value = "Apply";
    }, 500);
    emit('submitted');
}
</script>

<style lang="scss" scoped></style>
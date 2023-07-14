<template>
    <div class="card p-3 bg-body-tertiary">
        <form @submit.prevent="submit">
            <h3>Ssh Options</h3>
            <div class="form-group my-4">
                <label for="ssh-number-of-lines">
                    SSH - File Size Override
                </label>
                <div class="input-group">
                    <select class="form-select" v-model="modelValue.numberOfKilobytes" id="ssh-number-of-lines">
                        <option :disabled="!canLoadEntireFile" value="0">
                            Load Entire File <span v-if="!canLoadEntireFile" class="text-muted">(File is too large)</span>
                        </option>
                        <option v-for="size in FileSizesInKb" :value="size" :key="size">
                            {{ kilobytesToHumanReadableFileSize(size) }}
                        </option>
                    </select>
                    <button @click="() => modelValue.numberOfKilobytes = 0" class="btn btn-secondary" type="button"
                        :disabled="!canLoadEntireFile || modelValue.numberOfKilobytes === 0">Load All
                    </button>
                </div>
                <small class="text-muted">
                    This is the amount of the file that will be retrieved when viewing the log, from the end of the
                    file. A larger value will give more entries, but take longer to load.
                </small>
                <small class="text-info" v-if="!canLoadEntireFile">
                    <span v-if="props.currentFileSize !== 0">Note: File too large to load all lines.</span>
                </small>
                <small class="text-warning" v-if="modelValue.numberOfKilobytes === 0">
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
import { FileSizesInKb, MaxFileSizeToLoadKb } from "@/constants/Ssh";
import { kilobytesToHumanReadableFileSize } from "@/helpers";

const props = defineProps<{
    modelValue: SshOptions;
    originalOptions: SshOptions;
    isLoading: boolean;
    currentFileSize: number;
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
const canLoadEntireFile = computed(() => props.currentFileSize < MaxFileSizeToLoadKb);

function submit() {
    buttonText.value = "Applying...";
    setTimeout(() => {
        buttonText.value = "Apply";
    }, 500);
    emit('submitted');
}
</script>

<style lang="scss" scoped></style>
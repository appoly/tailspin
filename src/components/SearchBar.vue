<template>
    <input id="search-bar" type="text" class="form-control" :placeholder="placeholder" v-model="searchTerm"
        @change="handleChange" :disabled="disabled" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

defineProps({
    placeholder: { type: String, default: "Search..." },
    disabled: { type: Boolean, default: false },
    searchTerm: { type: String, default: "" }
});

const searchTerm = ref('');
const emit = defineEmits(['update:searchTerm']);

function handleChange(e: Event) {
    let value = (e.target as HTMLInputElement).value;
    emit('update:searchTerm', value);
}

onMounted(() => {
    window.addEventListener('keydown', keydownHandler);
})

onUnmounted(() => {
    window.removeEventListener('keydown', keydownHandler);
})

function keydownHandler(e: KeyboardEvent) {
    if (e.key === '/') {
        // check if the search bar is already focused
        if (document.activeElement?.id === 'search-bar') {
            return;
        }
        // prevent the '/' from being typed into the search bar
        e.preventDefault();
        document.getElementById('search-bar')?.focus();
        searchTerm.value = '';
    }
}
</script>
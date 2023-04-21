<template>
    <input id="search-bar" type="text" class="form-control" :placeholder="placeholder" v-model="searchTerm"
        :disabled="disabled" />
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

defineProps({
    placeholder: {
        type: String,
        default: "Search...",
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const searchTerm = ref('');
const emit = defineEmits(['update:searchTerm']);

watch(searchTerm, (newSearchTerm) => {
    emit('update:searchTerm', newSearchTerm);
});

window.addEventListener('keydown', (event) => {
    if (event.key === '/') {
        // check if the search bar is already focused
        if (document.activeElement?.id === 'search-bar') {
            return;
        }
        // prevent the '/' from being typed into the search bar
        event.preventDefault();
        document.getElementById('search-bar')?.focus();
        searchTerm.value = '';
    }
});
</script>
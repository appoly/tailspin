<template>
    <div>
        <h1>Settings</h1>
        <div class="list-group h-100">
            <!-- Menu item buttons for theme and delete all -->
            <button @click="userStore.toggleTheme" class="btn btn-primary mb-2">
                {{ toggleThemeButton }}
            </button>
            <!-- push to bottom -->
            <button @click="deleteAllConfirm" class="btn btn-danger my-2">Delete All Connections</button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/useUserStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { computed } from 'vue';

const userStore = useUserStore();
const connectionStore = useConnectionStore();

const currentTheme = computed(() => {
    return userStore.theme;
});

const toggleThemeButton = computed(() => {
    return currentTheme.value == 'light' ? 'Dark Mode' : 'Light Mode';
});

function deleteAllConfirm() {
    if (confirm('Are you sure you want to delete all connections?')) {
        connectionStore.deleteAllConnections();
    }
}

</script>

<style scoped></style>
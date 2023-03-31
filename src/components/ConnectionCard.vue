<template>
    <div class="connection" @contextmenu.prevent="showMenu" @click="applicationStore.goToConnection(connection.uid)">
        <!-- grid -->
        <div class="connection-card card m-1" role="button" v-if="viewMode === 'grid'">
            <div class="text-center font-weight-bold">
                <i :class="['h3 bi', `bi-${connection.icon}`]"></i>
                <span class="d-block fs-5">{{ connection.name ?? '?' }}</span>
            </div>
        </div>

        <!-- list -->
        <div class="list-group-item my-1" role="button" v-if="viewMode === 'list'">
            <div class="d-flex w-100 align-items-center">
                <i :class="['h3 bi', `bi-${connection.icon}`]"></i>
                <h5 class="ms-3">{{ connection.name ?? '?' }}</h5>
            </div>
            <small class="text-muted">
                {{ connection.path }}
            </small>
        </div>
    </div>

    <div v-show="isMenuVisible" class="menu" ref="menu">
        <ul class="list-group">
            <li v-for="option in menuOptions" :key="option.value" class="list-group-item selectable"
                @click="selectOption(option)">
                {{ option.label }}
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { Connection } from "@/interfaces"
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';

import { ref, Ref, computed, onMounted, onUnmounted } from 'vue';

interface Option {
    label: string;
    value: string;
}
const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const props = defineProps<{
    connection: Connection;
    viewMode: string;
}>();

const emit = defineEmits(["delete"]);
const menu = ref<HTMLElement>();

const isFavoriteMenuOption: Ref = computed(() => {
    return props.connection.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'

});

const menuOptions: Ref<Option[]> = computed(() => {
    return [
        { label: isFavoriteMenuOption.value, value: 'favorite' },
        { label: 'Delete Connection', value: 'delete' },
        { label: 'Edit Connection', value: 'edit' },
    ];
});

// We need a custom right click menu for the connection card
const isMenuVisible: Ref<boolean> = ref(false);

function showMenu(event: MouseEvent): void {
    event.preventDefault();
    isMenuVisible.value = true;
    // Set the position of the menu
    menu.value!.style.left = `${event.clientX}px`;
    menu.value!.style.top = `${event.clientY}px`;
}

function selectOption(option: Option): void {
    isMenuVisible.value = false;
    // on next tick, so the menu can be hidden before the alert is shown
    setTimeout(() => {
        if (option.value === 'delete' && confirm('Are you sure you want to delete this connection?')) {
            emit('delete');
        }
        if (option.value === 'edit') {
            alert('Edit coming soon! :)');
        }
        if (option.value === 'favorite') {
            props.connection.isFavorite = !props.connection.isFavorite;
            connectionStore.updateConnection(props.connection);
        }
    }, 0);
}

function handleClickOutside(event: MouseEvent): void {
    if (menu.value && !menu.value!.contains(event.target as HTMLElement)) {
        isMenuVisible.value = false;
    }
}

onMounted(() => {
    document.body.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('mousedown', handleClickOutside);
});

</script>

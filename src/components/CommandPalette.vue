<template>
    <div :class="['command-palette__backdrop', { active: isActive }]" @click="closePalette">
        <div class="command-palette" v-show="isActive">
            <div class="form-group">
                <input ref="commandPaletteInput" type="text" class="form-control" id="command-palette-input"
                    placeholder="Enter command" v-model="searchTerm" autofocus />
            </div>
            <div class="suggestions my-2">
                <TransitionGroup name="list" tag="ul" class="list-group">
                    <button type="button"
                        :class="['list-group-item list-group-item-action', { 'active': key === focusedAction }]"
                        v-for="(action, key) in filteredActions" :key="key" @click="action.action">
                        {{ action.label }}
                    </button>
                </TransitionGroup>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { useApplicationStore } from '@/stores/useApplicationStore';
import { useConnectionStore } from '@/stores/useConnectionStore';

const isActive = ref(false);
const searchTerm = ref('');
const commandPaletteInput = ref<HTMLInputElement | null>(null);
const focusedAction = ref(0);

const applicationStore = useApplicationStore();
const connectionStore = useConnectionStore();

const activeFolder = ref('');

const actions = [
    {
        label: 'Create Connection',
        action: () => {
            applicationStore.changePage('connections.add');
            closePalette();
        },
    },
    {
        label: 'Open Connection',
        action: () => {
            activeFolder.value = 'open-connections';
            focusedAction.value = 0;
        },
    },
    {
        label: 'Close Connection',
        action: () => {
            activeFolder.value = 'close-connections';
            focusedAction.value = 0;
        },
    },
    {
        label: 'Show all Connection',
        action: () => {
            applicationStore.changePage('connections');
            closePalette();
        },
    },
    {
        label: 'Open Settings',
        action: () => {
            applicationStore.changePage('settings');
            closePalette();
        },
    },
];

const openConnectionsFolderActions = computed(() => {
    return connectionStore.connections.map((connection) => {
        return {
            label: `Open ${connection.name}`,
            action: () => {
                applicationStore.changePage('connections');
                applicationStore.goToConnection(connection.uid);
                closePalette();
            },
        };
    });
});

const closeConnectionsFolderActions = computed(() => {
    // loop through all open connections and add a close action connectionStore.openConnections
    return connectionStore.openConnections.map((connection) => {
        return {
            label: `Close ${connection.name}`,
            action: () => {
                applicationStore.closeConnection(connection.uid);
                nextTick(() => applicationStore.changePage('connections'));
                closePalette();
            },
        };
    });
});

const filteredActions = computed(() => {

    let activeActions = actions;

    if (activeFolder.value === 'open-connections') {
        activeActions = openConnectionsFolderActions.value;
    }

    if (activeFolder.value === 'close-connections') {
        activeActions = closeConnectionsFolderActions.value;
    }

    const filteredActions = activeActions.filter((action) => {
        return action.label.toLowerCase().includes(searchTerm.value.toLowerCase());
    });

    if (filteredActions.length === 0) {
        return [{
            label: 'No results found',
            action: () => { },
        }];
    }
    return filteredActions;
});

watch(isActive, (newIsActive) => {
    if (newIsActive) {
        registerEventListeners();
        setTimeout(() => {
            commandPaletteInput.value?.focus();
        }, 100);
    } else {
        unregisterEventListeners();
    }
});

watch(searchTerm, (newSearchTerm) => {
    if (newSearchTerm) {
        focusedAction.value = 0;
    }
});

function registerEventListeners() {
    window.addEventListener('keydown', (event) => {
        // Close command palette
        if (event.key === 'Escape') {
            isActive.value = false;
            searchTerm.value = '';
        }
        // focus up and down
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (focusedAction.value === 0) {
                focusedAction.value = filteredActions.value.length - 1;
            } else {
                focusedAction.value--;
            }
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (focusedAction.value === filteredActions.value.length - 1) {
                focusedAction.value = 0;
            } else {
                focusedAction.value++;
            }
        }
        // select action
        if (event.key === 'Enter') {
            filteredActions.value[focusedAction.value].action();
        }
    });
}

function unregisterEventListeners() {
    window.removeEventListener('keydown', (event) => {
        // Open command palette
        if (event.key === 'p' && (event.ctrlKey || event.metaKey)) {
            isActive.value = true;
        }
        // Close command palette
        if (event.key === 'Escape') {
            isActive.value = false;
            searchTerm.value = '';
        }
        // focus up and down
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (focusedAction.value === 0) {
                focusedAction.value = filteredActions.value.length - 1;
            } else {
                focusedAction.value--;
            }
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (focusedAction.value === filteredActions.value.length - 1) {
                focusedAction.value = 0;
            } else {
                focusedAction.value++;
            }
        }
        // select action
        if (event.key === 'Enter') {
            filteredActions.value[focusedAction.value].action();
        }
    });
}

window.addEventListener('keydown', (event) => {
    // Open command palette
    if (event.key === 'p' && (event.ctrlKey || event.metaKey)) {
        isActive.value = true;
    }
});

function closePalette() {
    isActive.value = false;
    searchTerm.value = '';
    activeFolder.value = '';
    focusedAction.value = 0;
}

</script>

<style scoped>
.command-palette__backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    width: 100vw;
    height: 100vh;
    /* transparant */
    background-color: rgba(0, 0, 0, 0);
    transition: all 0.3s ease;
    display: none;
}

.command-palette__backdrop.active {
    display: block;
    background-color: rgba(0, 0, 0, 0.5);
    /* blur */
    backdrop-filter: blur(5px);
}

.command-palette {
    /* center of screen */
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    /* size */
    width: 50%;
    height: 50%;
}

.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>
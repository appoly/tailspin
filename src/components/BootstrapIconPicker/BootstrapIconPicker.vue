<template>
    <div ref="iconPicker" class="icon-picker">
        <button type="button" :class="[buttonClass, 'icon-button']" @click.stop="() => selectorOpen = !selectorOpen">
            <template v-if="selectedIcon">
                <i :class="[iconClass + selectedIcon]" :style="{ color: color }"></i>
            </template>

            <template v-else>
                <i class="bi bi-plus"></i>
            </template>
        </button>

        <!-- icon selection grid -->
        <div class="card icon-selector" v-show="selectorOpen" ref="iconPickerPopup">
            <div class="card-body">
                <div class="input-group ">
                    <input type="text" class="form-control" placeholder="Search" v-model="search">
                </div>
                <div class="input-group mt-2 mb-3">
                    <input type="color" class="form-control" v-model.lazy="color">
                </div>
                <div class="icon-container">
                    <div class="d-flex flex-wrap">
                        <i v-for="icon in filteredIcons" :class="[iconClass + icon, 'mx-2']" :key="icon"
                            @click="selectIcon(icon)" :style="{ color: color }"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Icons } from "./icons";
export default {
    name: "BootstrapIconPicker",
    data() {
        return {
            icons: Icons,
            search: '',
            selectedIcon: '',
            selectorOpen: false,
            iconClass: 'bi bi-', // bootstrap icons class prefix
            color: '#ffffff',
        }
    },
    props: {
        modelValue: {
            type: String,
            default: ''
        },
        buttonClass: {
            type: String,
            default: 'btn btn-outline-secondary'
        }
    },
    computed: {
        filteredIcons() {
            return this.icons.filter(icon => icon.includes(this.search));
        }
    },
    mounted(): void {
        if (this.modelValue) {
            this.selectedIcon = this.modelValue;
        }

        // watch for outside clicks
        document.addEventListener('click', this.mouseEventListener);

        // watch for backspace key
        document.addEventListener('keydown', this.keydownEventListener);
    },
    unmounted() {
        document.removeEventListener('click', this.mouseEventListener);
        document.removeEventListener('keydown', this.keydownEventListener);
    },
    watch: {
        color() {
            this.$emit('update:color', this.color);
        }
    },
    methods: {
        selectIcon(icon: string): void {
            if (this.selectedIcon === icon) {
                this.selectedIcon = '';
            } else {
                this.selectedIcon = icon;
            }
            this.selectorOpen = false;
            this.search = '';
            this.$emit('update:modelValue', this.selectedIcon);
        },
        mouseEventListener(e: MouseEvent): void {
            // if e.target is not inside the icon picker, close the selector
            if (!(this.$refs.iconPickerPopup as HTMLElement).contains(e.target as HTMLElement)) {
                this.selectorOpen = false;
            }
        },
        keydownEventListener(e: KeyboardEvent): void {
            // if backspace is pressed and the search is empty, close the selector and clear the selected icon
            if (this.selectorOpen && e.key === 'Backspace' && this.search === '') {
                this.selectorOpen = false;
                this.selectedIcon = '';
            }
        },
        openIconBox(): void {
            this.selectorOpen = true;
        }
    },
}
</script>

<style lang="scss" scoped>
.icon-button {
    padding: 0;
    border: none;
    font-size: 1.75rem;
    width: 3rem;
}

.icon-picker {
    position: relative;
}

.icon-selector {
    max-height: 400px;
    max-width: 300px;
    min-width: 300px;
    overflow: hidden;
    z-index: 1000;
    position: absolute;
}


.icon-selector i {
    cursor: pointer;
    font-size: 2rem;

    &:hover {
        color: #007bff;
    }
}

.icon-container {
    max-height: 300px;
    overflow-y: scroll;

    // nice scrollbar
    &::-webkit-scrollbar {
        width: 10px;
    }
}
</style>
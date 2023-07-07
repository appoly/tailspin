<template>
    <div ref="iconPicker" class="icon-picker">
        <button type="button" :class="[buttonClass, 'form-control']"
            @click.stop="() => selectorOpen = !selectorOpen">
            <i :class="[iconClass + modelValue]" :style="{ color: color }"></i>
        </button>

        <!-- icon selection grid -->
        <div class="card icon-selector" v-show="selectorOpen" ref="iconPickerPopup">
            <div class="card-body">
                <div class="input-group ">
                    <input type="text" class="form-control" placeholder="Search" v-model="search">
                </div>
                <div class="input-group mt-2 mb-3">
                    <input type="color" class="form-control" :value="color" @change="handleColorChange">
                </div>
                <div class="icon-container">
                    <div class="d-flex flex-wrap">
                        <i v-for="  icon   in   filteredIcons  " :class="[iconClass + icon, 'mx-2']" :key="icon"
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
            selectorOpen: false,
            iconClass: 'bi bi-', // bootstrap icons class prefix
        }
    },
    props: {
        modelValue: { type: String, default: 'plus' },
        buttonClass: { type: String, default: 'btn btn-outline-secondary' },
        color: { type: String, default: '#ffffff' }
    },
    computed: {
        filteredIcons() {
            return this.icons.filter(icon => icon.includes(this.search));
        }
    },
    mounted(): void {
        // watch for outside clicks
        document.addEventListener('click', this.mouseEventListener);
    },
    unmounted() {
        document.removeEventListener('click', this.mouseEventListener);
    },
    methods: {
        selectIcon(icon: string): void {
            this.selectorOpen = false;
            this.search = '';
            this.$emit('update:modelValue', icon);
        },
        handleColorChange(event: Event): void {
            this.$emit('update:color', (event.target as HTMLInputElement).value);
        },
        mouseEventListener(e: MouseEvent): void {
            // if e.target is not inside the icon picker, close the selector
            if (!(this.$refs.iconPickerPopup as HTMLElement).contains(e.target as HTMLElement)) {
                this.selectorOpen = false;
            }
        },
        openIconBox(): void {
            this.selectorOpen = true;
        }
    },
}
</script>

<style lang="scss" scoped>
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
        scrollbar-width: thin;
    }
}
</style>
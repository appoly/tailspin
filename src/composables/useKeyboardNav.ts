// j/k row cursor for the entries table. Owns nothing but the cursor index;
// the table decides what expanding, copying and paging actually do.

import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

export interface KeyboardNavOptions {
  /** Rows rendered on the current page. */
  count: Ref<number>
  page: Ref<number>
  pageCount: Ref<number>
  onPageChange: (page: number) => void
  onToggle: (index: number) => void
  onCopy: (index: number) => void
}

/** Keys belong to whatever the user is typing in, not to us. */
function isCapturedByFocus(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true
  if (el.isContentEditable) return true
  return el.closest('[role=dialog]') !== null
}

export function useKeyboardNav(options: KeyboardNavOptions) {
  const cursor = ref(-1)
  // Which end of the next page to land on once the page prop catches up.
  let pendingEdge: 'first' | 'last' | null = null

  function move(index: number) {
    if (options.count.value === 0) return

    if (index < 0) {
      if (options.page.value <= 1) return
      pendingEdge = 'last'
      options.onPageChange(options.page.value - 1)
      return
    }

    if (index >= options.count.value) {
      if (options.page.value >= options.pageCount.value) return
      pendingEdge = 'first'
      options.onPageChange(options.page.value + 1)
      return
    }

    cursor.value = index
  }

  watch(options.page, () => {
    if (!pendingEdge) {
      // Paged by the paginator or a filter change: the cursor no longer means anything.
      cursor.value = -1
      return
    }
    cursor.value = pendingEdge === 'first' ? 0 : Math.max(0, options.count.value - 1)
    pendingEdge = null
  })

  // Filtering can shrink the page under the cursor.
  watch(options.count, count => {
    if (cursor.value >= count) cursor.value = count - 1
  })

  function onKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (isCapturedByFocus()) return
    // A popover or dialog is open somewhere; let it have the keyboard.
    if (document.querySelector('[role=dialog]')) return

    switch (event.key) {
      case 'j':
      case 'ArrowDown':
        event.preventDefault()
        move(cursor.value + 1)
        break
      case 'k':
      case 'ArrowUp':
        event.preventDefault()
        // Arriving from below with no cursor lands on the last row.
        move(cursor.value < 0 ? options.count.value - 1 : cursor.value - 1)
        break
      case 'Enter':
        if (cursor.value < 0) return
        event.preventDefault()
        options.onToggle(cursor.value)
        break
      case 'c':
        if (cursor.value < 0) return
        event.preventDefault()
        options.onCopy(cursor.value)
        break
      case 'Escape':
        cursor.value = -1
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { cursor }
}

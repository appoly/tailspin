interface WindowDragApi {
  beginDrag(): void
  moveDrag(): void
  endDrag(): void
}

// Keep native button clicks (including keyboard activation), but swallow the
// click Chromium emits after releasing a pointer that moved the window.
export function createTabWindowDrag(api: WindowDragApi) {
  let gesture: { pointerId: number; x: number; y: number; target: HTMLElement } | null = null
  let dragged = false
  let suppressClick = false

  function start(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) return
    cancel()
    dragged = false
    suppressClick = false
    const target = event.currentTarget as HTMLElement
    gesture = { pointerId: event.pointerId, x: event.screenX, y: event.screenY, target }
    target.setPointerCapture(event.pointerId)
    api.beginDrag()
  }

  function move(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointerId) return
    if (!(event.buttons & 1)) {
      cancel()
      return
    }
    // Screen coordinates stay stable as the window moves under the pointer.
    if (!dragged && Math.hypot(event.screenX - gesture.x, event.screenY - gesture.y) < 5) return
    dragged = true
    suppressClick = true
    api.moveDrag()
  }

  function release() {
    if (!gesture) return
    const { target, pointerId } = gesture
    gesture = null
    api.endDrag()
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
  }

  function finish(event: PointerEvent) {
    if (event.pointerId === gesture?.pointerId && event.button === 0) release()
  }

  function cancel() {
    if (!gesture) return
    suppressClick = true
    release()
  }

  function allowClick(event: MouseEvent) {
    // Enter/Space and assistive activation have no pointer click count.
    if (event.detail === 0 || !suppressClick) return true
    event.preventDefault()
    event.stopPropagation()
    return false
  }

  return { start, move, finish, cancel, allowClick }
}

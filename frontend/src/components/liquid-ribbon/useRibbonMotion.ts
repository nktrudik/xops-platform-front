import { computed, onBeforeUnmount, onMounted, shallowRef, watch, type Ref } from 'vue'
import { createRibbonRenderer, type RibbonRenderer } from './renderer'

/** Owns the decorative renderer, input listeners and all browser lifecycle resources. */
export function useRibbonMotion(
  canvas: Readonly<Ref<HTMLCanvasElement | null>>,
  stage: Readonly<Ref<HTMLElement | null>>,
  host: () => HTMLElement | null,
  engaged: () => boolean,
) {
  const ready = shallowRef(false)
  const paused = shallowRef(false)
  const reduced = shallowRef(false)
  const visible = shallowRef(true)
  const intersecting = shallowRef(false)
  const running = computed(
    () => ready.value && !paused.value && !reduced.value && visible.value && intersecting.value,
  )
  let renderer: RibbonRenderer | null = null
  let animation = 0
  let previous = 0
  let nextFrame = 0
  let elapsed = 0
  let x = 0
  let y = 0
  let active = 0
  let targetX = 0
  let targetY = 0
  let bounds: DOMRect | undefined
  let resize: ResizeObserver | undefined
  let intersection: IntersectionObserver | undefined
  let media: MediaQueryList | undefined
  let controller: AbortController | undefined
  let mobile = false

  function stop(): void {
    cancelAnimationFrame(animation)
    animation = 0
    previous = 0
    nextFrame = 0
  }
  function measure(): void {
    if (!stage.value) return
    bounds = stage.value.getBoundingClientRect()
    mobile = matchMedia('(pointer: coarse)').matches
    renderer?.resize(
      bounds.width,
      bounds.height,
      Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5),
    )
    if (renderer && !running.value && !reduced.value && visible.value)
      renderer.draw(elapsed, x, y, active)
  }
  function frame(timestamp: number): void {
    if (!running.value || !renderer) {
      stop()
      return
    }
    animation = requestAnimationFrame(frame)
    const delta = previous ? timestamp - previous : 16.7
    if (timestamp + 0.25 < nextFrame) return
    const interval = 1000 / (mobile ? 30 : 60)
    nextFrame += interval
    if (nextFrame <= timestamp) nextFrame = timestamp + interval
    previous = timestamp
    const dt = Math.min(delta, 64) / 1000
    elapsed += dt
    const ease = 1 - Math.exp(-dt * 4)
    x += (targetX - x) * ease
    y += (targetY - y) * ease
    active += ((engaged() ? 1 : 0) - active) * ease
    renderer.draw(elapsed, x, y, active)
  }
  function sync(): void {
    if (running.value && renderer && !animation) animation = requestAnimationFrame(frame)
    else if (!running.value) stop()
  }
  function initialize(): void {
    if (!canvas.value || renderer || reduced.value || typeof WebGLRenderingContext === 'undefined')
      return
    try {
      renderer = createRibbonRenderer(canvas.value)
    } catch {
      renderer = null
    }
    ready.value = renderer !== null
    measure()
    sync()
  }
  function pointer(event: PointerEvent): void {
    if (!bounds || event.pointerType === 'touch') return
    targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.x) / bounds.width) * 2 - 1))
    targetY = Math.max(-1, Math.min(1, -(((event.clientY - bounds.y) / bounds.height) * 2 - 1)))
  }
  function resetPointer(): void {
    targetX = 0
    targetY = 0
  }

  watch(running, sync)
  watch(
    host,
    (element, _, cleanup) => {
      if (!element) return
      element.addEventListener('pointermove', pointer, { passive: true })
      element.addEventListener('pointerleave', resetPointer)
      cleanup(() => {
        element.removeEventListener('pointermove', pointer)
        element.removeEventListener('pointerleave', resetPointer)
      })
    },
    { flush: 'post', immediate: true },
  )

  onMounted(() => {
    if (
      typeof matchMedia !== 'function' ||
      typeof ResizeObserver === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    )
      return
    controller = new AbortController()
    const signal = controller.signal
    media = matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = media.matches
    visible.value = !document.hidden
    media.addEventListener(
      'change',
      () => {
        reduced.value = media!.matches
        if (!reduced.value) initialize()
      },
      { signal },
    )
    document.addEventListener(
      'visibilitychange',
      () => {
        visible.value = !document.hidden
      },
      { signal },
    )
    window.addEventListener(
      'scroll',
      () => {
        bounds = stage.value?.getBoundingClientRect()
      },
      { passive: true, signal },
    )
    window.addEventListener('resize', measure, { passive: true, signal })
    canvas.value?.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
        stop()
        renderer?.dispose()
        renderer = null
        ready.value = false
      },
      { signal },
    )
    canvas.value?.addEventListener('webglcontextrestored', initialize, { signal })
    if (stage.value) {
      resize = new ResizeObserver(measure)
      resize.observe(stage.value)
      intersection = new IntersectionObserver(([entry]) => {
        intersecting.value = entry?.isIntersecting ?? false
      })
      intersection.observe(stage.value)
    }
    initialize()
  })
  onBeforeUnmount(() => {
    stop()
    controller?.abort()
    resize?.disconnect()
    intersection?.disconnect()
    renderer?.dispose(true)
    renderer = null
  })
  return { ready, paused, reduced, running }
}

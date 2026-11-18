// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createCarouselMotion } from "../src/components/carousel/carousel-motion"
import { sheetPhysics } from "../src/foundation/motion/physics"

function setup({ dragFree = false } = {}) {
  const viewport = document.createElement("div")
  let scrollLeft = 0
  Object.defineProperty(viewport, "scrollLeft", {
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value
    },
  })
  const rests: number[] = []
  const motion = createCarouselMotion({
    viewport,
    content: () => undefined,
    axis: () => ({ vertical: false, rtl: false }),
    positions: () => [0, 600, 1200],
    maxScroll: () => 1200,
    viewportSize: () => 600,
    physics: () => sheetPhysics.ios,
    canDrag: () => true,
    dragFree: () => dragFree,
    reducedMotion: () => false,
    setSnapping: () => {},
    onRelease: () => {},
    onScrollRest: (position) => rests.push(position),
    onDragChange: () => {},
    onSettle: () => {},
    onScroll: () => {},
  })
  const scrollTo = (position: number) => {
    scrollLeft = position
    viewport.dispatchEvent(new Event("scroll"))
  }
  const scrollEnd = () => viewport.dispatchEvent(new Event("scrollend"))
  return { motion, rests, scrollTo, scrollEnd }
}

let motion: ReturnType<typeof setup>["motion"] | undefined

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  motion?.destroy()
  motion = undefined
  vi.useRealTimers()
})

describe("with scrollend", () => {
  test("a scroll that ends on a page rests at once", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(300)
    carousel.scrollTo(600)
    carousel.scrollEnd()
    expect(carousel.rests).toEqual([600])
  })

  test("a scrollend before momentum and snapping move on waits for the page", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(151)
    carousel.scrollEnd()
    vi.advanceTimersByTime(100)
    carousel.scrollTo(400)
    vi.advanceTimersByTime(100)
    carousel.scrollTo(600)
    carousel.scrollEnd()
    vi.advanceTimersByTime(1000)
    expect(carousel.rests).toEqual([600])
  })

  test("a scrollend in a rubber band waits until it's back in range", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(-35)
    carousel.scrollEnd()
    carousel.scrollTo(-21)
    carousel.scrollEnd()
    carousel.scrollTo(0)
    carousel.scrollEnd()
    expect(carousel.rests).toEqual([0])
  })

  test("a scroll that holds still off a page rests after a timeout", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(151)
    carousel.scrollEnd()
    vi.advanceTimersByTime(119)
    expect(carousel.rests).toEqual([])
    vi.advanceTimersByTime(1)
    expect(carousel.rests).toEqual([151])
  })

  test("the next scroll rests on its own scrollend, not the timeout of a deferred rest", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(151)
    carousel.scrollEnd()
    carousel.scrollTo(600)
    carousel.scrollEnd()
    vi.advanceTimersByTime(50)
    carousel.scrollTo(1200)
    vi.advanceTimersByTime(100)
    expect(carousel.rests).toEqual([600])
    carousel.scrollEnd()
    expect(carousel.rests).toEqual([600, 1200])
  })

  test("a free drag rests wherever it stops", () => {
    const carousel = setup({ dragFree: true })
    motion = carousel.motion
    carousel.scrollTo(151)
    carousel.scrollEnd()
    expect(carousel.rests).toEqual([151])
  })
})

describe("without scrollend", () => {
  const onScrollEnd = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "onscrollend"
  )

  beforeEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "onscrollend")
  })

  afterEach(() => {
    if (onScrollEnd) {
      Object.defineProperty(HTMLElement.prototype, "onscrollend", onScrollEnd)
    }
  })

  test("a scroll on a page rests after one quiet timeout", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(600)
    vi.advanceTimersByTime(120)
    expect(carousel.rests).toEqual([600])
  })

  test("a pause off a page rests only once it holds still a second timeout", () => {
    const carousel = setup()
    motion = carousel.motion
    carousel.scrollTo(151)
    vi.advanceTimersByTime(120)
    expect(carousel.rests).toEqual([])
    carousel.scrollTo(400)
    vi.advanceTimersByTime(120)
    expect(carousel.rests).toEqual([])
    vi.advanceTimersByTime(120)
    expect(carousel.rests).toEqual([400])
  })
})

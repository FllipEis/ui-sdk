// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  createCarouselMotion,
  type CarouselMotion,
} from "../src/components/carousel/carousel-motion"
import { sheetPhysics } from "../src/foundation/motion/physics"

let motion: CarouselMotion | undefined

function setup({ dragFree = false } = {}) {
  const viewport = document.createElement("div")
  let scrollLeft = 0
  Object.defineProperty(viewport, "scrollLeft", {
    get: () => scrollLeft,
    set: (value: number) => {
      scrollLeft = value
    },
  })
  const rests: { position: number; touch: boolean }[] = []
  motion = createCarouselMotion({
    viewport,
    content: () => undefined,
    axis: () => ({ vertical: false, rtl: false }),
    followDirection: () => {},
    positions: () => [0, 600, 1200],
    maxScroll: () => 1200,
    viewportSize: () => 600,
    physics: () => sheetPhysics.ios,
    canDrag: () => true,
    dragFree: () => dragFree,
    reducedMotion: () => false,
    setSnapping: () => {},
    onRelease: () => {},
    onScrollRest: (position, { touch }) => rests.push({ position, touch }),
    onDragChange: () => {},
    onSettle: () => {},
    onScroll: () => {},
  })
  const scrollTo = (position: number) => {
    scrollLeft = position
    viewport.dispatchEvent(new Event("scroll"))
  }
  const scrollEnd = () => viewport.dispatchEvent(new Event("scrollend"))
  const touchStart = () => viewport.dispatchEvent(new Event("touchstart"))
  const touchEnd = () => viewport.dispatchEvent(new Event("touchend"))
  const restedAt = () => rests.map((rest) => rest.position)
  return { rests, restedAt, scrollTo, scrollEnd, touchStart, touchEnd }
}

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
    carousel.scrollTo(300)
    carousel.scrollTo(600)
    carousel.scrollEnd()
    expect(carousel.restedAt()).toEqual([600])
  })

  test("a scrollend before momentum and snapping move on waits for the page", () => {
    const carousel = setup()
    carousel.scrollTo(151)
    carousel.scrollEnd()
    vi.advanceTimersByTime(200)
    carousel.scrollTo(400)
    vi.advanceTimersByTime(200)
    carousel.scrollTo(600)
    carousel.scrollEnd()
    vi.advanceTimersByTime(1000)
    expect(carousel.restedAt()).toEqual([600])
  })

  test("a scrollend in a rubber band waits until it's back in range", () => {
    const carousel = setup()
    carousel.scrollTo(-35)
    carousel.scrollEnd()
    carousel.scrollTo(-21)
    carousel.scrollEnd()
    carousel.scrollTo(0)
    carousel.scrollEnd()
    expect(carousel.restedAt()).toEqual([0])
  })

  test("a second scrollend with no scroll between isn't a quiet timeout", () => {
    const carousel = setup()
    carousel.scrollTo(-12)
    carousel.scrollEnd()
    vi.advanceTimersByTime(10)
    carousel.scrollEnd()
    expect(carousel.restedAt()).toEqual([])
  })

  test("off a page, a scroll rests once nothing scrolls for a quiet timeout", () => {
    const carousel = setup()
    carousel.scrollTo(151)
    carousel.scrollEnd()
    vi.advanceTimersByTime(239)
    expect(carousel.restedAt()).toEqual([])
    vi.advanceTimersByTime(1)
    expect(carousel.restedAt()).toEqual([151])
  })

  test("a scroll whose scrollend never comes rests after a quiet timeout", () => {
    const carousel = setup()
    carousel.scrollTo(600)
    vi.advanceTimersByTime(239)
    expect(carousel.restedAt()).toEqual([])
    vi.advanceTimersByTime(1)
    expect(carousel.restedAt()).toEqual([600])
  })

  test("a scrollend under a finger rests after the finger lifts, once on a page", () => {
    const carousel = setup()
    carousel.touchStart()
    carousel.scrollTo(151)
    carousel.scrollEnd()
    carousel.touchEnd()
    carousel.scrollTo(600)
    carousel.scrollEnd()
    expect(carousel.rests).toEqual([{ position: 600, touch: true }])
  })

  test("a finger held still off a page rests a quiet timeout after it lifts", () => {
    const carousel = setup()
    carousel.touchStart()
    carousel.scrollTo(151)
    vi.advanceTimersByTime(500)
    carousel.touchEnd()
    vi.advanceTimersByTime(239)
    expect(carousel.restedAt()).toEqual([])
    vi.advanceTimersByTime(1)
    expect(carousel.restedAt()).toEqual([151])
  })

  test("the viewport is left where a scroll rested until the carousel moves it", () => {
    const carousel = setup()
    carousel.scrollTo(600)
    carousel.scrollEnd()
    expect(motion?.restedFromScroll()).toBe(true)
    motion?.moveTo(2, { animate: false })
    expect(motion?.restedFromScroll()).toBe(false)
  })

  test("a finger that catches a spring and lifts without scrolling rests", () => {
    const carousel = setup()
    motion?.moveTo(1)
    vi.advanceTimersByTime(50)
    carousel.touchStart()
    carousel.touchEnd()
    expect(carousel.rests).toEqual([])
    vi.advanceTimersByTime(240)
    expect(carousel.rests).toHaveLength(1)
    expect(carousel.rests[0].touch).toBe(true)
  })

  test("with dragFree, a scroll rests wherever it stops, once quiet", () => {
    const carousel = setup({ dragFree: true })
    carousel.scrollTo(151)
    carousel.scrollEnd()
    expect(carousel.restedAt()).toEqual([])
    vi.advanceTimersByTime(240)
    expect(carousel.restedAt()).toEqual([151])
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

  test("a scroll on a page rests after one rest timeout", () => {
    const carousel = setup()
    carousel.scrollTo(600)
    vi.advanceTimersByTime(120)
    expect(carousel.restedAt()).toEqual([600])
  })

  test("a pause off a page shorter than a quiet timeout isn't a rest", () => {
    const carousel = setup()
    carousel.scrollTo(151)
    vi.advanceTimersByTime(200)
    carousel.scrollTo(400)
    vi.advanceTimersByTime(239)
    expect(carousel.restedAt()).toEqual([])
    vi.advanceTimersByTime(1)
    expect(carousel.restedAt()).toEqual([400])
  })
})

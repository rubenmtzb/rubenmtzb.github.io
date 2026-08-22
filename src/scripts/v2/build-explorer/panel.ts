/**
 * One open build: its layered model, its camera and its exploded view.
 *
 * All of the state of the keyboard being looked at — angle, zoom, explode and
 * pinned part — lives inside the panel, so opening another build carries
 * nothing over from the previous one.
 */
import { pad } from '../dom'

/** Orbit limits: beyond them the model stops reading as a keyboard. */
const BX_TILT = { min: 24, max: 78, home: 56 }
const BX_SPIN = { min: -84, max: 24, home: -29 }
const BX_ZOOM = { min: .68, max: 1.65 }

/** What the explorer can ask of an open build. */
export type BuildPanel = ReturnType<typeof createBuildPanel>

export function createBuildPanel(panel: HTMLElement, root: HTMLElement) {
  const q = <T extends HTMLElement>(selector: string) => panel.querySelector<T>(selector)
  const all = <T extends HTMLElement>(selector: string) => [...panel.querySelectorAll<T>(selector)]

  const stage = q('[data-bx-stage]')
  const model = q('[data-bx-model]')
  const readout = q('[data-bx-readout]')
  const chipIndex = q('[data-bx-chip-index]')
  const chipLabel = q('[data-bx-chip-label]')
  const chipSpec = q('[data-bx-chip-spec]')
  const scrub = q('[data-bx-scrub]')
  const range = q<HTMLInputElement>('[data-bx-range]')
  const rangeOut = q('[data-bx-range-out]')
  const partButtons = all<HTMLButtonElement>('[data-bx-part-button]')
  const partLayers = all('[data-bx-part]')

  /*
   * Each part's details, read from the listing itself.
   *
   * The spec arrives as an attribute rather than by looking for a tag inside the
   * button: when the list became a compact index, the `<small>` that held it
   * disappeared and the chip went blank on every layer selection. The data the
   * model needs cannot depend on how the row happens to be laid out.
   */
  const partDetails = new Map(partButtons.map((button, index) => [
    button.dataset.bxPartButton ?? '',
    {
      index: pad(index + 1),
      label: button.querySelector('strong')?.textContent ?? '',
      spec: button.dataset.bxPartSpec ?? '',
    },
  ]))

  let tilt = BX_TILT.home
  let spin = BX_SPIN.home
  let zoom = 1
  /** 0 assembled, 1 fully apart. The single source of the explode value. */
  let spread = 0
  let pinnedPart: string | null = null

  const renderCamera = () => {
    model?.style.setProperty('--rx', `${tilt}deg`)
    model?.style.setProperty('--rz', `${spin}deg`)
    model?.style.setProperty('--zoom', String(zoom))
    if (readout) readout.textContent = `${Math.round(zoom * 100)}% · ${Math.round(tilt)}° / ${Math.round(spin)}°`
  }

  const renderSpread = () => {
    const percent = Math.round(spread * 100)
    // It lives on the root: the stage's height and the model's framing read it.
    root.style.setProperty('--spread', String(spread))
    root.classList.toggle('is-exploded', spread > 0)
    root.classList.toggle('is-spread', spread > .12)
    if (range) {
      range.value = String(percent)
      range.style.setProperty('--fill', `${percent}%`)
    }
    if (rangeOut) rangeOut.textContent = `${percent}%`
  }

  const setActivePart = (partId: string | null) => {
    root.classList.toggle('has-active', Boolean(partId))
    for (const layer of partLayers) layer.classList.toggle('is-active', layer.dataset.bxPart === partId)
    for (const button of partButtons) button.setAttribute('aria-pressed', String(button.dataset.bxPartButton === pinnedPart))

    const detail = partId ? partDetails.get(partId) : null
    if (!detail) return
    if (chipIndex) chipIndex.textContent = detail.index
    if (chipLabel) chipLabel.textContent = detail.label
    if (chipSpec) chipSpec.textContent = detail.spec
  }

  return {
    element: panel,
    stage,
    readout,
    scrub,

    get spread() { return spread },
    get camera() { return { tilt, spin } },

    setSpread(next: number) {
      spread = Math.max(0, Math.min(1, next))
      renderSpread()
    },
    /** Absolute orbit from a starting point: the one dragging uses. */
    orbitFrom(baseTilt: number, baseSpin: number, deltaTilt: number, deltaSpin: number) {
      tilt = Math.max(BX_TILT.min, Math.min(BX_TILT.max, baseTilt + deltaTilt))
      spin = Math.max(BX_SPIN.min, Math.min(BX_SPIN.max, baseSpin + deltaSpin))
      renderCamera()
    },
    /** Orbit relative to the current position: the one the arrow keys use. */
    orbit(deltaTilt: number, deltaSpin: number) {
      this.orbitFrom(tilt, spin, deltaTilt, deltaSpin)
    },
    zoomBy(factor: number) {
      zoom = Math.max(BX_ZOOM.min, Math.min(BX_ZOOM.max, zoom * factor))
      renderCamera()
    },
    resetCamera() {
      tilt = BX_TILT.home
      spin = BX_SPIN.home
      zoom = 1
      renderCamera()
      readout?.classList.remove('is-visible')
    },
    previewPart(partId: string | null) {
      setActivePart(partId ?? pinnedPart)
    },
    togglePart(partId: string) {
      pinnedPart = pinnedPart === partId ? null : partId
      setActivePart(pinnedPart)
    },
    clearPart() {
      pinnedPart = null
      setActivePart(null)
    },
  }
}

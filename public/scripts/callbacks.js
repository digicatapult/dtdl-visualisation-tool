let panZoom = null
const contentMain = document.querySelector('#content-main')

const minimapStyles = window.getComputedStyle(document.getElementById('minimap'))
const desiredAspectRatio = parseFloat(minimapStyles.width) / parseFloat(minimapStyles.height)

globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('section')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
}

globalThis.toggleNavPanel = (event) => {
  const panel = event.target.parentElement

  panel?.toggleAttribute('aria-expanded')
}

/**
 * Takes an input element id and extracts the value from it as a number if it has a value. Otherwise returns a default value provided
 * @param {String} elementId - Id of the element to get the value attribute from
 * @param {Number} defaultValue - Number to return if element Id does not have a valid value
 * @returns - The parsed value or default
 */
function valueFromElementOrDefault(elementId, defaultValue) {
  const value = document.getElementById(elementId)?.getAttribute('value')
  if (value === null || value === undefined) {
    return defaultValue
  }
  return parseFloat(value)
}

globalThis.setMermaidListeners = function setMermaidListeners() {
  const resetButton = document.getElementById('reset-pan-zoom')
  const zoomInButton = document.getElementById('zoom-in')
  const zoomOutButton = document.getElementById('zoom-out')

  const element = document.getElementById('mermaid-svg')
  if (!element) {
    document.getElementById('mermaid-output')?.removeAttribute('pending-listeners')
    return
  }
  setSizes()

  function onPan({ x, y }) {
    document.getElementById('currentPanX')?.setAttribute('value', x)
    document.getElementById('currentPanY')?.setAttribute('value', y)
    setMinimap()
  }

  function onZoom(newZoom) {
    document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    onPan(panZoom.getPan())
    setMinimap()
  }

  panZoom = svgPanZoom('#mermaid-svg', {
    maxZoom: 10,
    minZoom: -100,
  })

  panZoom.zoom(valueFromElementOrDefault('currentZoom', 1))
  panZoom.pan({
    x: valueFromElementOrDefault('currentPanX', 0),
    y: valueFromElementOrDefault('currentPanY', 0),
  })
  panZoom.setOnPan(onPan)
  panZoom.setOnZoom(onZoom)

  resetButton.onclick = () => {
    panZoom.resetZoom()
    panZoom.resetPan()
  }
  zoomInButton.onclick = () => {
    panZoom.zoomIn()
  }
  zoomOutButton.onclick = () => {
    panZoom.zoomOut()
  }

  const listener = (ev) => {
    if (ev?.detail?.pathInfo?.requestPath !== '/update-layout') {
      return
    }
    panZoom.disablePan()
    panZoom.disableZoom()
    document.body.removeEventListener('htmx:beforeRequest', listener)
  }
  document.body.addEventListener('htmx:beforeRequest', listener)

  document.getElementById('mermaid-output')?.removeAttribute('pending-listeners')

  setMinimap()
}

function setSizes() {
  const wrapper = document.getElementById('mermaid-wrapper')
  if (!wrapper) {
    throw new Error('Could not find mermaid-wrapper element')
  }
  const boundingRec = wrapper.getBoundingClientRect()
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)

  const svg = document.querySelector('#mermaid-output #mermaid-svg')
  svg?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  svg?.setAttribute('width', `${boundingRec.width}`)
  svg?.setAttribute('height', `${boundingRec.height}`)

  setMinimap()
}

function setMinimap() {
  const mainSvg = document.querySelector('#mermaid-output #mermaid-svg')
  const mainViewport = document.querySelector('#mermaid-output .svg-pan-zoom_viewport')

  if (!(mainSvg && mainViewport)) return

  const fullSvgWidth = mainSvg.getBoundingClientRect().width
  const fullSvgHeight = mainSvg.getBoundingClientRect().height
  const viewportWidth = mainViewport.getBBox().width
  const viewportHeight = mainViewport.getBBox().height

  const actualAspectRatio = viewportWidth / viewportHeight // aspect ratio of the generated svg

  // make the minimap svg as big as possible within bounds of the minimap
  const minimapSvgWidth = actualAspectRatio < desiredAspectRatio ? 100 * (actualAspectRatio / desiredAspectRatio) : 100
  const minimapSvgHeight = actualAspectRatio < desiredAspectRatio ? 100 : 100 * (desiredAspectRatio / actualAspectRatio)

  contentMain.style.setProperty('--minimap-svg-width', `${minimapSvgWidth}%`)
  contentMain.style.setProperty('--minimap-svg-height', `${minimapSvgHeight}%`)

  const zoomScale = panZoom.getZoom()
  const { x, y } = panZoom.getPan()

  // invert translations, positive translation of svg means negative translation of lens
  const translateX = x * -1
  const translateY = y * -1

  const lensWidth = `${(fullSvgWidth / zoomScale / viewportWidth) * 100}%`
  const lensHeight = `${(fullSvgHeight / zoomScale / viewportHeight) * 100}%`
  const lensLeft = `${(translateX / zoomScale / viewportWidth) * 100}%`
  const lensTop = `${(translateY / zoomScale / viewportHeight) * 100}%`

  contentMain.style.setProperty('--minimap-lens-width', lensWidth)
  contentMain.style.setProperty('--minimap-lens-height', lensHeight)
  contentMain.style.setProperty('--minimap-lens-left', lensLeft)
  contentMain.style.setProperty('--minimap-lens-top', lensTop)

  const minimap = document.getElementById('minimap')
  const minimapSvg = document.getElementById('minimap-svg')
  if (!minimapSvg) return

  minimap.onclick = (event) => {
    const offsetX = event.clientX - minimapSvg.getBoundingClientRect().left
    const offsetY = event.clientY - minimapSvg.getBoundingClientRect().top

    const { width: svgWidthPixels, height: svgHeightPixels } = minimapSvg.getBoundingClientRect()

    const percentX = offsetX / svgWidthPixels
    const percentY = offsetY / svgHeightPixels

    const lensWidthPixels = (fullSvgWidth / viewportWidth) * svgWidthPixels
    const lensHeightPixels = (fullSvgHeight / viewportHeight) * svgHeightPixels

    const targetX = percentX * viewportWidth * zoomScale * -1
    const targetY = percentY * viewportHeight * zoomScale * -1

    console.log(targetX)
    panZoom.pan({ x: targetX, y: targetY })
  }
}

setSizes()
addEventListener('resize', setSizes)

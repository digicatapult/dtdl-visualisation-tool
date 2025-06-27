let panZoom = null

globalThis.toggleAccordion = (event) => {
  const content = event.target.closest('.accordion-parent')?.querySelector('.accordion-content')

  event.target.toggleAttribute('aria-expanded')
  event.target.toggleAttribute('aria-hidden')
  content?.toggleAttribute('aria-expanded')
  content?.toggleAttribute('aria-hidden')
}

globalThis.toggleNavPanel = (event) => {
  const panel = event.target.parentElement

  panel?.toggleAttribute('aria-expanded')
  panel?.toggleAttribute('aria-hidden')
}

globalThis.toggleEditSwitch = (event) => {
  const isChecked = event.target.toggleAttribute('checked')
  htmx.trigger(event.target, 'checked', { checked: isChecked })
  document.getElementById('edit-toggle').classList.toggle('edit', isChecked)
  document.getElementById('edit-toggle-text').textContent = isChecked ? 'Edit' : 'View'
  document.getElementById('mermaid-wrapper').classList.toggle('edit', isChecked)
  document.getElementById('edit-buttons').classList.toggle('edit', isChecked)
}

globalThis.getOwnerRepoFromInput = () => {
  // Not passing in event as not all triggers produce HX-Events
  const input = document.getElementById('public-github-input').value.trim()
  const match = input.match(/^(?:https:\/\/(?:www\.)?github\.com\/)?([a-zA-Z0-9-_\.]+)\/([a-zA-Z0-9-_\.]+)(?:\/.*)?$/)
  return match ? { owner: match[1], repo: match[2] } : { owner: undefined, repo: undefined }
}

globalThis.validatePublicRepoInput = (e) => {
  const { owner, repo } = globalThis.getOwnerRepoFromInput()
  if (!owner || !repo) {
    e.setCustomValidity('invalid owner/repo combination or url')
  } else {
    e.setCustomValidity('')
  }
  e.reportValidity()
}

globalThis.validateDtdlValue = (e) => {
  const invalidChars = /["\\]/
  e.setCustomValidity(invalidChars.test(e.value) ? 'Invalid characters: " and \\' : '')
  e.reportValidity()
}

htmx.on('htmx:beforeSwap', (e) => {
  if (e.detail.pathInfo.requestPath === '/github/branches?page=1') {
    if (e.detail.xhr.status === 400 && e.detail.requestConfig.triggeringEvent.type !== 'keyup') {
      e.preventDefault()
    }
  }
})

htmx.on('htmx:load', (e) => {
  if (e?.detail.elt.baseURI.includes('github/picker')) {
    document.getElementById('github-modal').showModal()

    // Update the browser history so modal only opens once
    window.history.replaceState({}, '', `/open`)
  }
})

// maintain nav panel scroll position after swap
let navPanelContentScrollTop = 0
document.addEventListener('htmx:beforeSwap', (event) => {
  const navPanelContent = document.getElementById('navigation-panel-content')
  if (navPanelContent) {
    navPanelContentScrollTop = navPanelContent.scrollTop
  }
})
document.addEventListener('htmx:afterSwap', (event) => {
  if (event.target.id === 'navigation-panel') {
    const navPanelContent = document.getElementById('navigation-panel-content')
    if (navPanelContent) {
      navPanelContent.scrollTop = navPanelContentScrollTop
    }
  }
})

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
    document.body.style.setProperty('--svg-pan-x', x)
    document.body.style.setProperty('--svg-pan-y', y)
  }

  function onZoom(newZoom) {
    document.getElementById('currentZoom')?.setAttribute('value', newZoom)
    document.body.style.setProperty('--svg-zoom', newZoom)
    onPan(panZoom.getPan())
  }

  panZoom = svgPanZoom('#mermaid-svg', {
    maxZoom: 10,
    minZoom: -100,
  })

  const initZoom = valueFromElementOrDefault('currentZoom', 1)
  const initPan = {
    x: valueFromElementOrDefault('currentPanX', 0),
    y: valueFromElementOrDefault('currentPanY', 0),
  }
  panZoom.zoom(initZoom)
  panZoom.pan(initPan)
  document.body.style.setProperty('--svg-zoom', initZoom)
  document.body.style.setProperty('--svg-pan-x', initPan.x)
  document.body.style.setProperty('--svg-pan-y', initPan.y)

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
    if (ev?.detail?.pathInfo?.requestPath !== 'update-layout') {
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

globalThis.showShareModal = function showShareModal() {
  document.getElementById('share-link-modal').showModal()
  globalThis.updateShareLink()
}

globalThis.updateShareLink = function updateShareLink() {
  const radios = document.getElementById('share-link-modal').querySelectorAll('input[name="link-type"]')
  const linkInput = document.getElementById('link-output')

  let selectedValue = 'full'
  radios.forEach((radio) => {
    if (radio.checked) {
      selectedValue = radio.value
    }
  })

  const fullUrl = window.location.href
  let finalUrl = fullUrl


  if (selectedValue === 'short') {
    const urlObj = new URL(fullUrl)
    finalUrl = `${urlObj.protocol}${urlObj.host}${urlObj.pathname}`
  }

  linkInput.value = finalUrl
}

globalThis.copyShareLink = function copyShareLink() {
  const output = document.getElementById('link-output')
  const tooltip = document.getElementById('copy-tooltip')
  const copyIcon = document.getElementById('copy-icon')
  if (output.value) {
    navigator.clipboard.writeText(output.value).then(() => {
      tooltip.textContent = 'Copied!'
      copyIcon.classList.add('copied')

      setTimeout(() => {
        tooltip.textContent = 'Click to copy to clipboard'
        copyIcon.classList.remove('copied')
      }, 1500)
    })
  }
}

function setSizes() {
  const wrapper = document.getElementById('mermaid-wrapper')
  if (!wrapper) {
    return
  }
  const boundingRec = wrapper.getBoundingClientRect()
  document.getElementById('svgWidth')?.setAttribute('value', `${boundingRec.width}`)
  document.getElementById('svgHeight')?.setAttribute('value', `${boundingRec.height}`)
  document.body.style.setProperty('--svg-width', boundingRec.width)
  document.body.style.setProperty('--svg-height', boundingRec.height)

  const svg = document.querySelector('#mermaid-output #mermaid-svg')
  svg?.setAttribute('viewBox', `0 0 ${boundingRec.width} ${boundingRec.height}`)
  svg?.setAttribute('width', `${boundingRec.width}`)
  svg?.setAttribute('height', `${boundingRec.height}`)
}

function setMinimap() {
  const minimap = document.getElementById('minimap')
  if (!minimap) {
    return
  }

  minimap.onclick = (event) => {
    const minimapSvg = document.getElementById('minimap-svg')
    const mainSvg = document.querySelector('#mermaid-output #mermaid-svg')
    if (!minimapSvg || !mainSvg || !panZoom) {
      return
    }

    const styles = window.getComputedStyle(minimapSvg, null)
    const zoomScale = parseFloat(styles.getPropertyValue('--svg-zoom') || 'NaN')
    const rawSvgWidth = parseFloat(styles.getPropertyValue('--svg-raw-width') || 'NaN')
    const rawSvgHeight = parseFloat(styles.getPropertyValue('--svg-raw-height') || 'NaN')
    if (isNaN(zoomScale) || isNaN(rawSvgWidth) || isNaN(rawSvgHeight)) {
      return
    }

    // compute click coordinates relative to the svg
    const { left, top, width: svgWidth, height: svgHeight } = minimapSvg.getBoundingClientRect()
    const { width: viewportSvgWidth, height: viewportSvgHeight } = mainSvg.getBoundingClientRect()

    const x = event.clientX - left
    const y = event.clientY - top

    const percentX = x / svgWidth
    const percentY = y / svgHeight
    // offset in viewport space so centre of lens moves to click coords
    const viewportSvgCenterX = viewportSvgWidth / 2
    const viewportSvgCenterY = viewportSvgHeight / 2

    const targetX = viewportSvgCenterX - percentX * rawSvgWidth * zoomScale
    const targetY = viewportSvgCenterY - percentY * rawSvgHeight * zoomScale

    panZoom.pan({ x: targetX, y: targetY })
  }
}

setSizes()
addEventListener('resize', setSizes)

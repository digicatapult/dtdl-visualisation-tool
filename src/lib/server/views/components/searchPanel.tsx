/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { randomUUID } from 'crypto'
import { DiagramType, diagramTypes } from '../../models/mermaidDiagrams.js'
import { commonUpdateAttrs } from './constants.js'
import { maybeNumberToAttr } from './helpers.js'

export const SearchPanel = ({
  search,
  swapOutOfBand,
  diagramType,
  svgWidth,
  svgHeight,
  currentZoom,
  currentPanX,
  currentPanY,
}: {
  search?: string
  diagramType: DiagramType
  svgWidth?: number
  svgHeight?: number
  currentZoom?: number
  currentPanX?: number
  currentPanY?: number
  swapOutOfBand?: boolean
}): JSX.Element => (
  <form
    id="search-panel"
    name={`search-panel-${randomUUID()}`}
    class="button-group"
    hx-swap-oob={swapOutOfBand ? 'true' : undefined}
    hx-sync="this:replace"
    {...commonUpdateAttrs}
  >
    <h2>
      <a href="/">UKDTC</a>
    </h2>
    <input
      id="search"
      name="search"
      type="search"
      value={escapeHtml(search || '')}
      placeholder="Search"
      hx-trigger="input changed delay:500ms, search"
      {...commonUpdateAttrs}
    />

    <input id="svgWidth" name="svgWidth" type="hidden" value={maybeNumberToAttr(svgWidth, 300)} />
    <input id="svgHeight" name="svgHeight" type="hidden" value={maybeNumberToAttr(svgHeight, 100)} />
    <input id="currentZoom" name="currentZoom" type="hidden" value={maybeNumberToAttr(currentZoom, 1)} />
    <input id="currentPanX" name="currentPanX" type="hidden" value={maybeNumberToAttr(currentPanX, 0)} />
    <input id="currentPanY" name="currentPanY" type="hidden" value={maybeNumberToAttr(currentPanY, 0)} />

    <select id="diagram-type-select" name="diagramType" hx-trigger="input changed" {...commonUpdateAttrs}>
      {diagramTypes.map((entry) => (
        <option value={entry} selected={entry === diagramType}>
          {escapeHtml(entry)}
        </option>
      ))}
    </select>
  </form>
)

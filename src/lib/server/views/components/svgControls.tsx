/// <reference types="@kitajs/html/htmx.d.ts" />

export const SvgControls = ({
  generatedOutput,
  svgRawWidth,
  svgRawHeight,
  swapOutOfBand,
}: {
  generatedOutput?: JSX.Element
  svgRawWidth?: number
  svgRawHeight?: number
  swapOutOfBand?: boolean
}): JSX.Element => {
  const output = generatedOutput ?? ''
  return (
    <div id="svg-controls" hx-swap-oob={swapOutOfBand ? 'true' : undefined}>
      <div
        id="minimap"
        style={`
            --svg-raw-width: ${svgRawWidth || 300};
            --svg-raw-height: ${svgRawHeight || 100};
          `}
      >
        {output && <div id="minimap-svg">{output}</div>}
      </div>
      <div id="zoom-buttons">
        <button id="zoom-in">+</button>
        <button id="reset-pan-zoom">◯</button>
        <button id="zoom-out">-</button>
      </div>
    </div>
  )
}

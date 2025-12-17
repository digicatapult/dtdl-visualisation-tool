/// <reference types="@kitajs/html/htmx.d.ts" />

const LegendItem = ({
  iconClass,
  title,
  description,
}: {
  iconClass: string
  title: string
  description: string
}): JSX.Element => (
  <div class="legend-item">
    <div class={`legend-icon ${iconClass}`}></div>
    <div>
      <b safe>{title}</b>
      <p safe>{description}</p>
    </div>
  </div>
)

export const Legend = ({ showContent }: { showContent: boolean }): JSX.Element => (
  <section id="legend">
    <div id="legend-content" class={showContent ? 'show-content' : ''}>
      <LegendItem
        iconClass="active"
        title="Currently Active (Clicked) Node"
        description="Indicates the currently active selection."
      />
      <LegendItem
        iconClass="search"
        title="Search Result Node"
        description="Nodes matching the current search criteria."
      />
      <LegendItem iconClass="expanded" title="Expanded Node" description="Node is expanded, connections visible." />
      <LegendItem
        iconClass="unexpanded"
        title="Unexpanded Node"
        description="Node is unexpanded, no connections shown."
      />
    </div>
    <button
      hx-swap="outerHTML"
      hx-target="#legend"
      hx-get={`/legend?showContent=${!showContent}`}
      class={showContent ? 'show-content' : ''}
    >
      Legend
    </button>
  </section>
)

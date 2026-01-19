export const commonRerenderAttrs = {
  'hx-target': '#mermaid-output',
  'hx-swap': 'outerHTML  transition:true',
  'hx-include': '#viewId, #search-panel, input[name="navigationPanelTab"], #navigationPanelExpanded',
  'hx-indicator': '#spinner',
  'hx-disabled-elt': 'select',
} as const

export type CommonRerenderAttrs = typeof commonRerenderAttrs

export const commonUpdateAttrs: CommonRerenderAttrs & { 'hx-get': string } = {
  ...commonRerenderAttrs,
  'hx-get': 'update-layout',
}

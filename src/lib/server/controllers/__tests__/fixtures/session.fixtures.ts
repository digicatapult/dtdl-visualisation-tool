export const validViewId = '6cfacf2a-5058-4c20-95da-a7dc7659ea50' as const
export const validViewExpanded11Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea51' as const
export const validViewExpanded12Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea52' as const
export const validViewExpanded235Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea53' as const
export const validViewExpanded2357Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea54' as const
export const validViewExpanded759Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea55' as const
export const validViewExpanded9XId = '6cfacf2a-5058-4c20-95da-a7dc7659ea56' as const
export const validViewSomeSearchId = '6cfacf2a-5058-4c20-95da-a7dc7659ea57' as const
export const validViewSomeOtherSearchId = '6cfacf2a-5058-4c20-95da-a7dc7659ea58' as const
export const validViewOctokitId = '6cfacf2a-5058-4c20-95da-a7dc7659ea59' as const
export const validViewReturnUrlId = '6cfacf2a-5058-4c20-95da-a7dc7659ea60' as const

export const invalidViewId = '00000000-0000-0000-0000-000000000000' as const

export const validViewState = {
  layout: 'elk',
  diagramType: 'flowchart',
  search: undefined,
  highlightNodeId: undefined,
  expandedIds: [] as string[],
}

export const viewStateMap = {
  [validViewId]: validViewState,
  [validViewExpanded11Id]: { ...validViewState, expandedIds: ['1', '1'] },
  [validViewExpanded12Id]: { ...validViewState, expandedIds: ['1', '2'] },
  [validViewExpanded235Id]: { ...validViewState, expandedIds: ['2', '3', '5'] },
  [validViewExpanded2357Id]: { ...validViewState, expandedIds: ['2', '3', '5', '7'] },
  [validViewExpanded759Id]: { ...validViewState, expandedIds: ['7', '5', '9'] },
  [validViewExpanded9XId]: { ...validViewState, expandedIds: ['9', '10'] },
  [validViewSomeSearchId]: { ...validViewState, search: 'someSearch' },
  [validViewSomeOtherSearchId]: { ...validViewState, search: 'someOtherSearch' },
}

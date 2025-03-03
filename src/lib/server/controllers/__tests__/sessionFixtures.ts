export const validSessionId = '6cfacf2a-5058-4c20-95da-a7dc7659ea50' as const
export const validSessionExpanded11Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea51' as const
export const validSessionExpanded12Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea52' as const
export const validSessionExpanded235Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea53' as const
export const validSessionExpanded2357Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea54' as const
export const validSessionExpanded759Id = '6cfacf2a-5058-4c20-95da-a7dc7659ea55' as const
export const validSessionExpanded9XId = '6cfacf2a-5058-4c20-95da-a7dc7659ea56' as const
export const validSessionSomeSearchId = '6cfacf2a-5058-4c20-95da-a7dc7659ea57' as const
export const validSessionSomeOtherSearchId = '6cfacf2a-5058-4c20-95da-a7dc7659ea58' as const
export const validSessionOctokitId = '6cfacf2a-5058-4c20-95da-a7dc7659ea59' as const
export const validSessionReturnUrlId = '6cfacf2a-5058-4c20-95da-a7dc7659ea60' as const

export const invalidSessionId = '00000000-0000-0000-0000-000000000000' as const

export const validSession = {
  layout: 'dagre-d3',
  diagramType: 'flowchart',
  search: undefined,
  highlightNodeId: undefined,
  expandedIds: [] as string[],
}

export const sessionMap = {
  [validSessionId]: validSession,
  [validSessionExpanded11Id]: { ...validSession, expandedIds: ['1', '1'] },
  [validSessionExpanded12Id]: { ...validSession, expandedIds: ['1', '2'] },
  [validSessionExpanded235Id]: { ...validSession, expandedIds: ['2', '3', '5'] },
  [validSessionExpanded2357Id]: { ...validSession, expandedIds: ['2', '3', '5', '7'] },
  [validSessionExpanded759Id]: { ...validSession, expandedIds: ['7', '5', '9'] },
  [validSessionExpanded9XId]: { ...validSession, expandedIds: ['9', '10'] },
  [validSessionSomeSearchId]: { ...validSession, search: 'someSearch' },
  [validSessionSomeOtherSearchId]: { ...validSession, search: 'someOtherSearch' },
}

import { DtdlModelWithMetadata } from '../filter'

const blankMetadata = { metadata: { expanded: [] } }
export const singleInterfaceFirst: DtdlModelWithMetadata = {
  ...blankMetadata,
  model: {
    first: {
      EntityKind: 'Interface',
      Id: 'first',
    },
  },
} as unknown as DtdlModelWithMetadata

export const multipleInterfaces: DtdlModelWithMetadata = {
  ...blankMetadata,
  model: {
    ...singleInterfaceFirst.model,
    second: {
      EntityKind: 'Interface',
      Id: 'second',
    },
    third: {
      EntityKind: 'Interface',
      Id: 'third',
    },
  },
} as unknown as DtdlModelWithMetadata

export const multipleInterfacesAndRelationship: DtdlModelWithMetadata = {
  ...blankMetadata,
  model: {
    ...multipleInterfaces.model,
    relFirstSecond: {
      EntityKind: 'Relationship',
      Id: 'relFirstSecond',
      target: 'first',
      ChildOf: 'second',
    },
    relInvalidTarget: {
      EntityKind: 'Relationship',
      Id: 'relInvalidTarget',
      ChildOf: 'third',
      target: 'invalid',
    },
  },
} as unknown as DtdlModelWithMetadata

export const expandedNotInModel: DtdlModelWithMetadata = {
  metadata: { expanded: ['badId'] },
  model: {
    first: {
      EntityKind: 'Interface',
      Id: 'first',
    },
  },
} as unknown as DtdlModelWithMetadata

export const expandedWithRelationships: DtdlModelWithMetadata = {
  metadata: { expanded: ['second'] },
  model: {
    first: {
      EntityKind: 'Interface',
      Id: 'first',
    },
    second: {
      EntityKind: 'Interface',
      Id: 'second',
    },
    third: {
      EntityKind: 'Interface',
      Id: 'third',
    },
    relFirstSecond: {
      EntityKind: 'Relationship',
      Id: 'relFirstSecond',
      target: 'first',
      ChildOf: 'second',
    },
    relSecondThird: {
      EntityKind: 'Relationship',
      Id: 'relSecondThird',
      target: 'second',
      ChildOf: 'third',
    },
  },
} as unknown as DtdlModelWithMetadata

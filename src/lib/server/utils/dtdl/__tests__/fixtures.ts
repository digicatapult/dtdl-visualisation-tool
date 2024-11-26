import { DtdlObjectModel } from '@digicatapult/dtdl-parser'

export const singleInterfaceFirst: DtdlObjectModel = {
  first: {
    EntityKind: 'Interface',
    Id: 'first',
    displayName: { en: 'display name' },
  },
} as unknown as DtdlObjectModel

export const multipleInterfaces: DtdlObjectModel = {
  ...singleInterfaceFirst,
  second: {
    EntityKind: 'Interface',
    Id: 'second',
  },
  third: {
    EntityKind: 'Interface',
    Id: 'third',
  },
} as unknown as DtdlObjectModel

export const multipleInterfacesAndRelationship: DtdlObjectModel = {
  ...multipleInterfaces,
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
} as unknown as DtdlObjectModel

export const expandedWithRelationships: DtdlObjectModel = {
  first: {
    EntityKind: 'Interface',
    Id: 'first',
    extendedBy: [],
    extends: [],
  },
  second: {
    EntityKind: 'Interface',
    Id: 'second',
    extendedBy: [],
    extends: [],
  },
  third: {
    EntityKind: 'Interface',
    Id: 'third',
    extendedBy: [],
    extends: [],
  },
  relFirstSecond: {
    EntityKind: 'Relationship',
    Id: 'relFirstSecond',
    target: 'first',
    ChildOf: 'second',
  },
  ['rel second third']: {
    EntityKind: 'Relationship',
    Id: 'rel second third',
    target: 'second',
    ChildOf: 'third',
  },
} as unknown as DtdlObjectModel

export const extendedInterface: DtdlObjectModel = {
  parent: {
    EntityKind: 'Interface',
    Id: 'parent',
    extendedBy: ['child'],
    extends: [],
  },
  child: {
    EntityKind: 'Interface',
    Id: 'child',
    extendedBy: [],
    extends: ['parent'],
  },
} as unknown as DtdlObjectModel

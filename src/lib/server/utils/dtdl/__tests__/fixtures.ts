import { DtdlObjectModel } from '@digicatapult/dtdl-parser'

export const singleInterfaceFirst: DtdlObjectModel = {
  first: {
    EntityKind: 'Interface',
    Id: 'first',
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

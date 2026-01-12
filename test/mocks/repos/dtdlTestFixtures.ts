import { DtdlZipFile } from '../../e2e/helpers/createGithubZip'

export const files: DtdlZipFile[] = [
  {
    path: 'base.json',
    content: JSON.stringify({
      '@context': ['dtmi:dtdl:context;4'],
      '@id': 'dtmi:com:base;1',
      '@type': 'Interface',
      contents: [
        {
          '@type': 'Property',
          name: 'baseProperty',
          schema: 'short',
        },
        {
          '@type': 'Relationship',
          name: 'baseRelationship',
        },
        {
          '@type': 'Telemetry',
          name: 'baseTelemetry',
          schema: 'double',
        },
      ],
    }),
  },
  {
    path: 'edit.json',
    content: JSON.stringify([
      {
        '@context': ['dtmi:dtdl:context;4'],
        '@id': 'dtmi:com:edit:contents;1',
        '@type': 'Interface',
        displayName: 'displayNameEdit',
        description: 'descriptionEdit',
        comment: 'commentEdit',
        extends: ['dtmi:com:base;1'],
        contents: [
          {
            '@type': 'Property',
            name: 'propertyName',
            displayName: 'propertyDisplayNameEdit',
            description: 'propertyDescriptionEdit',
            comment: 'propertyCommentEdit',
            schema: 'float',
            writable: false,
          },
          {
            '@type': 'Relationship',
            name: 'relationshipName',
            target: 'dtmi:com:example;1',
            comment: 'relationshipCommentEdit',
            displayName: 'relationshipDisplayNameEdit',
            description: 'relationshipDescriptionEdit',
          },
          {
            '@type': 'Telemetry',
            name: 'telemetryName',
            schema: 'float',
            comment: 'telemetryCommentEdit',
            description: 'telemetryDescriptionEdit',
            displayName: 'telemetryDisplayNameEdit',
          },
          {
            '@type': 'Command',
            name: 'turnOn',
            displayName: 'turnOnCommandDisplayNameEdit',
            comment: 'turnOnCommandCommentEdit',
            description: 'turnOnCommandDescriptionEdit',
            request: {
              name: 'mode',
              displayName: 'modeRequestDisplayName',
              description: 'modeRequestDescription',
              comment: 'modeRequestComment',
              schema: {
                '@type': 'Enum',
                valueSchema: 'string',
                enumValues: [
                  { name: 'cool', enumValue: 'cool' },
                  { name: 'heat', enumValue: 'heat' },
                  { name: 'auto', enumValue: 'auto' },
                ],
              },
            },
            response: {
              name: 'mode',
              description: 'modeResponseDescription',
              comment: 'modeResponseComment',
              schema: 'string',
            },
          },
          {
            '@type': 'Command',
            name: 'turnOff',
            displayName: 'turnOffCommandDisplayNameEdit',
            comment: 'turnOffCommandCommentEdit',
            description: 'turnOffCommandDescriptionEdit',
          },
        ],
      },
      {
        '@context': ['dtmi:dtdl:context;4'],
        '@id': 'dtmi:com:example;1',
        '@type': 'Interface',
      },
    ]),
  },
]

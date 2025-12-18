import { DtdlPath } from '../../utils/dtdl/parser.js'

export function maybeNumberToAttr(value: number | undefined, defaultValue: number): string {
  return `${value === undefined ? defaultValue : value}`
}

export function getNavigationPanelNodeClass(
  path: DtdlPath
): 'directory' | 'file' | 'interface' | 'relationship' | 'property' | 'telemetry' | 'command' {
  if (path.type === 'directory' || path.type === 'file') {
    return path.type
  }
  switch (path.dtdlType) {
    case 'Interface':
      return 'interface'
    case 'Relationship':
      return 'relationship'
    case 'Property':
      return 'property'
    case 'Telemetry':
      return 'telemetry'
    case 'Command':
      return 'command'
    default:
      return 'property'
  }
}

export function hasSubdirectories(entries: DtdlPath[]): boolean {
  return entries.some((entry) => entry.type === 'directory')
}

export function buildFolderButtonClasses(
  path: DtdlPath,
  hasSubdirs: boolean,
  isHighlighted: boolean,
  isSelected: boolean,
  getNodeClass: (path: DtdlPath) => string
): string {
  const classes = [
    'folder-tree-button',
    'tree-icon',
    hasSubdirs ? '' : 'no-arrow',
    getNodeClass(path),
    isHighlighted ? 'folder-tree-leaf-highlighted' : '',
    isSelected ? 'folder-tree-selected' : '',
  ]
  return classes.filter(Boolean).join(' ')
}

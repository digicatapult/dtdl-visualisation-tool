import type { DtdlPath } from './parser.js'

/**
 * Recursively checks if any file in the DTDL file tree has errors.
 */
export function hasFileTreeErrors(fileTree: DtdlPath[]): boolean {
  for (const node of fileTree) {
    if (node.type === 'file' && node.errors && node.errors.length > 0) {
      return true
    }
    if (node.type === 'directory' && node.entries) {
      if (hasFileTreeErrors(node.entries)) {
        return true
      }
    }
  }
  return false
}

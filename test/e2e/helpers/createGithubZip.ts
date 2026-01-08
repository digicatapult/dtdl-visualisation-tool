import AdmZip from 'adm-zip'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface DtdlFile {
  path: string
  content: string
}

export async function createGithubZip(
  files: DtdlFile[],
  outputPath: string,
  repoName = 'test-repo',
  commitSha = 'abc123def456'
): Promise<() => Promise<void>> {
  await mkdir(dirname(outputPath), { recursive: true })

  const zip = new AdmZip()
  const rootFolder = `${repoName}-${commitSha.substring(0, 7)}`

  zip.addFile(`${rootFolder}/`, Buffer.alloc(0)) // add explicit top level dir
  for (const file of files) {
    zip.addFile(`${rootFolder}/${file.path}`, Buffer.from(file.content, 'utf-8'))
  }

  await writeFile(outputPath, zip.toBuffer())

  return async () => {
    try {
      await rm(outputPath, { force: true })
    } catch (err) {
      console.error(`Failed to cleanup zip file: ${err}`)
    }
  }
}

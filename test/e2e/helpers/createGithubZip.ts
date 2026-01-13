import AdmZip from 'adm-zip'
import { randomUUID } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { StartedTestContainer } from 'testcontainers'
import tmp from 'tmp'

export interface DtdlZipFile {
  path: string
  content: string
}

export async function copyGithubZipToWiremock(
  wiremockContainer: StartedTestContainer,
  files: DtdlZipFile[],
  targetFileName: string
): Promise<void> {
  const { name: zipPath } = tmp.fileSync({ prefix: 'repo-', postfix: '.zip' })

  const zip = new AdmZip()
  const rootFolder = randomUUID()

  zip.addFile(`${rootFolder}/`, Buffer.alloc(0))
  for (const file of files) {
    zip.addFile(`${rootFolder}/${file.path}`, Buffer.from(file.content, 'utf-8'))
  }

  await writeFile(zipPath, zip.toBuffer())

  await wiremockContainer.copyFilesToContainer([
    {
      source: zipPath,
      target: `/home/wiremock/__files/${targetFileName}`,
    },
  ])

  await rm(zipPath, { force: true })
}

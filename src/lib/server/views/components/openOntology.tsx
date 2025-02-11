/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { RecentFile } from '../../models/openTypes.js'
import { UUID } from '../../models/strings.js'
import { Page } from '../common.js'

@singleton()
export default class OpenOntologyTemplates {
  constructor() {}

  public OpenOntologyRoot = ({ sessionId, recentFiles }: { sessionId: UUID; recentFiles: RecentFile[] }) => (
    <Page title="UKDTC">
      <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
      <section id="upload-toolbar">
        <a href="/">
          <h2>UKDTC</h2>
        </a>
      </section>
      <this.mainView recentFiles={recentFiles} />
    </Page>
  )

  public mainView = ({ recentFiles }: { recentFiles: RecentFile[] }) => {
    return (
      <div id="main-view">
        <h1>Open Ontology</h1>
        <this.getMenu showContent={false} />
        <this.recentFiles recentFiles={recentFiles} />
      </div>
    )
  }
  public getMenu = ({ showContent }: { showContent: boolean }) => {
    return (
      <section id="upload-method">
        <label
          id="upload-file-button"
          hx-swap="outerHTML transition:true"
          hx-target="#upload-method"
          hx-trigger="click"
          hx-get={`/open/menu?showContent=${!showContent}`}
        >
          Upload New File
          <div class={showContent ? 'toggle-icon show-content' : 'toggle-icon'}>⋁</div>
        </label>
        <div id="upload-options" class={showContent ? 'show-content' : ''}>
          <div id="zip-upload">
            <this.uploadZip />
          </div>
          <div id="github">
            <this.uploadGithub />
          </div>
        </div>
      </section>
    )
  }

  private uploadZip = () => {
    return (
      <form
        id="zip-form"
        hx-ext="ignore:json-enc"
        hx-target="#content-main"
        hx-select="#content-main"
        hx-post="/open/"
        hx-encoding="multipart/form-data"
        hx-trigger="change from:#zip"
        hx-include="#sessionId"
      >
        <label id="zip-button" for="zip" class="upload-option">
          <img src="public/images/zip-folder.svg" alt="zip-folder" />
          <p>Local Zip File</p>
        </label>
        <input type="file" id="zip" name="file" accept=".zip" />
      </form>
    )
  }
  private uploadGithub = () => {
    return (
      <a href="/">
        <label id="github-auth-button" class="upload-option">
          <img src="public/images/github-mark.svg" alt="github" />
          <p>GitHub</p>
        </label>
      </a>
    )
  }

  public recentFiles = ({ recentFiles }: { recentFiles: RecentFile[] }) => {
    return (
      <>
        <h4>Recent Files</h4>
        <section id="recent-files" class="file-grid">
          {recentFiles.map((recentFile, index) => (
            <div
              class="file-card"
              role="button"
              tabindex={`${index + 1}`}
              hx-get={`/open/${recentFile.dtdlModelId}`}
              hx-include="#sessionId"
            >
              <div class="file-preview">{recentFile.preview}</div>
              <div class="file-details">
                <p class="file-name">{escapeHtml(recentFile.fileName)}</p>
                <p class="file-viewed">Viewed {escapeHtml(recentFile.lastVisited)}</p>
              </div>
            </div>
          ))}
        </section>
      </>
    )
  }
}

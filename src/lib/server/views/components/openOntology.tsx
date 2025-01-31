/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { UUID } from '../../models/strings.js'
import { Page } from '../common.js'

@singleton()
export default class OpenOntologyTemplates {
  constructor() {}

  public OpenOntologyRoot = ({ sessionId }: { sessionId: UUID }) => (
    <Page title="UKDTC">
      <input id="sessionId" name="sessionId" type="hidden" value={escapeHtml(sessionId)} />
      <section id="upload-toolbar">
        <a href="/">
          <h2>UKDTC</h2>
        </a>
      </section>
      <this.mainView />
    </Page>
  )

  public mainView = () => {
    return (
      <div id="main-view">
        <h1>Open Ontology</h1>
        <this.getMenu showContent={false} />
      </div>
    )
  }
  public getMenu = ({ showContent }: { showContent: boolean }) => {
    return (
      <section id="upload-method">
        <label
          id="upload-file-button"
          hx-swap="outerHTML"
          hx-target="#upload-method"
          hx-get={`/open/menu?showContent=${!showContent}`}
        >
          Upload New File <div class={showContent ? 'toggle-icon show-content' : 'toggle-icon'}>^</div>
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
}

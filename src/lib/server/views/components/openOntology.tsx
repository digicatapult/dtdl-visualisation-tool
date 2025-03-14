/// <reference types="@kitajs/html/htmx.d.ts" />

import { escapeHtml } from '@kitajs/html'
import { singleton } from 'tsyringe'
import { ListItem } from '../../models/github.js'
import { RecentFile } from '../../models/openTypes.js'
import { Page } from '../common.js'

@singleton()
export default class OpenOntologyTemplates {
  constructor() {}

  public OpenOntologyRoot = ({
    populateListLink,
    recentFiles,
  }: {
    populateListLink?: string
    recentFiles: RecentFile[]
  }) => {
    const showGithubModal = populateListLink !== undefined
    return (
      <Page title="UKDTC">
        <section id="upload-toolbar">
          <a href="/">
            <h2>UKDTC</h2>
          </a>
        </section>
        <div id="main-view">
          <h1>Open Ontology</h1>
          <this.getMenu showContent={false} />
          <this.recentFiles recentFiles={recentFiles} />
          {showGithubModal && <this.githubModal populateListLink={populateListLink} />}
          <div id="spinner-wrapper">
            <div id="spinner" class="spinner" />
          </div>
        </div>
      </Page>
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
          <this.uploadZip />
          <this.uploadGithub />
        </div>
      </section>
    )
  }

  public githubModal = ({ populateListLink }: { populateListLink: string }) => {
    return (
      <dialog id="github-modal">
        <div id="modal-wrapper">
          <div id="public-github-input-wrapper">
            <input
              id="public-github-input"
              placeholder="Enter public GitHub repo {org}/{repo} e.g. 'digicatapult/dtdl-visualisation-tool'"
              hx-get="/github/branches?page=1"
              hx-trigger="keyup[event.key=='Enter'], input changed delay:500ms"
              hx-vals="js:{...globalThis.getOwnerRepoFromInput()}"
              hx-target=".github-list"
              hx-validate={true}
              oninput="globalThis.validatePublicRepoInput(this)"
              hx-on-htmx-before-request="if (this.validity.valid === false) event.preventDefault()"
            />
            <img src="/public/images/arrow-enter.svg" />
          </div>
          <div id="spin" class="spinner" />
          <ul class="github-list" hx-indicator="#spin" hx-get={populateListLink} hx-trigger="load"></ul>
          <this.selectFolder />
        </div>
        <form method="dialog">
          <button class="modal-button" />
        </form>
      </dialog>
    )
  }

  public selectFolder = ({ link, swapOutOfBand }: { link?: string; swapOutOfBand?: boolean }) => (
    <button
      id="select-folder"
      hx-trigger="click"
      hx-get={link}
      hx-swap-oob={swapOutOfBand ? 'true' : undefined}
      hx-swap="outerHTML"
      hx-target="#content-main"
      hx-select="#content-main"
      hx-indicator="#spinner"
      disabled={!link}
      onclick="document.getElementById('github-modal').close();"
    >
      Select Folder to Open Ontology
    </button>
  )

  public githubListItems = ({
    list,
    nextPageLink,
    backLink,
  }: {
    list: ListItem[]
    nextPageLink?: string
    backLink?: string
  }) => {
    const nextPageAttributes = {
      'hx-get': nextPageLink,
      'hx-trigger': 'intersect once',
      'hx-swap': 'afterend',
      style: 'height: 1px; overflow: hidden',
    }

    const includeBackLink = backLink !== undefined
    const includeNextPageLink = nextPageLink !== undefined && list.length > 0

    return (
      <>
        {includeBackLink && (
          <li hx-trigger="click" hx-target="closest ul" hx-get={backLink}>
            {`<`}
          </li>
        )}
        {list.map((item) => (
          <li hx-trigger="click" hx-target="closest ul" hx-get={item.link}>
            {escapeHtml(item.text)}
          </li>
        ))}
        {includeNextPageLink && <li {...nextPageAttributes}></li>}
      </>
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
      >
        <label for="zip" class="upload-option">
          <img src="/public/images/zip-folder.svg" alt="zip-folder" />
          <p>Local Zip File</p>
        </label>
        <input type="file" id="zip" name="file" accept=".zip" />
      </form>
    )
  }
  private uploadGithub = () => {
    return (
      <a class="upload-option button" href={`/github/picker`}>
        <img src="/public/images/github-mark.svg" alt="github" />
        <span>GitHub</span>
      </a>
    )
  }

  public recentFiles = ({ recentFiles }: { recentFiles: RecentFile[] }) => {
    return (
      <>
        <h4>Recent Files</h4>
        <section id="recent-files" class="file-grid">
          {recentFiles.map((recentFile, index) => {
            const preview: JSX.Element = recentFile.preview
            return (
              <a href={`/ontology/${recentFile.dtdlModelId}/view`}>
                <div class="file-card" role="button" tabindex={`${index + 1}`}>
                  <div class="file-preview">{preview}</div>
                  <div class="file-details">
                    <p class="file-name">{escapeHtml(recentFile.fileName)}</p>
                    <p class="file-viewed">Viewed {escapeHtml(recentFile.lastVisited)}</p>
                  </div>
                </div>
              </a>
            )
          })}
        </section>
      </>
    )
  }
}

/// <reference types="@kitajs/html/htmx.d.ts" />

export const ShareOntology = (): JSX.Element => (
  <>
    <a id="share-ontology" onclick="globalThis.showShareModal()" class="rounded-button">
      Share
    </a>
    <dialog id="share-link-modal" class="modal">
      <form method="dialog">
        <h3>Shareable Link</h3>

        <label>
          <input
            class="circle-radio"
            type="radio"
            name="link-type"
            value="short"
            checked
            onchange="globalThis.updateShareLink()"
          />
          <span>Entire ontology</span>
        </label>
        <label>
          <input
            class="circle-radio"
            type="radio"
            name="link-type"
            value="full"
            onchange="globalThis.updateShareLink()"
          />
          <span>Current search selection of ontology</span>
        </label>

        <input id="link-output" type="text" readonly value="" placeholder="Generated link here" />
        <p style="font-size: 0.9rem; color: #555;">
          🔒 Access to this ontology depends on your GitHub permissions. Ensure recipients have the necessary access
          before sharing.
        </p>
        <div id="copy-button-wrapper">
          <span id="copy-tooltip" class="tooltip">
            Copy url to clipboard
          </span>
          <button id="copy-link-button" type="button" onclick="globalThis.copyShareLink()">
            Copy URL
            <span id="copy-icon" />
          </button>
        </div>
        <button class="modal-button" />
      </form>
    </dialog>
  </>
)

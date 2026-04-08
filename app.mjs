// APS Viewer SDK attaches to window.Autodesk via the CDN script tag in index.html
const AV = Autodesk.Viewing;

/** @type {Autodesk.Viewing.GuiViewer3D|null} */
let viewer = null;

/**
 * Fetch a 2-legged access token from the backend.
 * Proxied by Vite from /api/token → https://aps-codepen.autodesk.io/api/token
 * @returns {Promise<string>} access_token
 */
async function getToken() {
  const res = await fetch('/api/token');
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  // Expected: { access_token: "...", token_type: "Bearer", expires_in: 3600 }
  const { access_token } = await res.json();
  return access_token;
}

/**
 * Fetch the list of sample models from the backend.
 * Proxied by Vite from /api/models → https://aps-codepen.autodesk.io/api/models
 * @returns {Promise<Array<{name: string, urn: string}>>}
 */
async function listModels() {
  const res = await fetch('/api/models');
  if (!res.ok) throw new Error(`Models request failed: ${res.status}`);
  // Expected: [{ name: "House Model", urn: "dXJu..." }, ...]
  return res.json();
}

/**
 * Initialize the APS Viewer in light theme and return the viewer instance.
 * @param {string} token
 * @returns {Promise<Autodesk.Viewing.GuiViewer3D>}
 */
function initViewer(token) {
  return new Promise((resolve, reject) => {
    AV.Initializer(
      { env: 'AutodeskProduction', api: 'streamingV2', accessToken: token },
      () => {
        const container = document.getElementById('viewer');
        const v = new AV.GuiViewer3D(container);
        const startCode = v.start();
        if (startCode > 0) {
          reject(new Error(`Viewer start failed with code ${startCode}`));
          return;
        }
        v.setTheme('light-theme');
        resolve(v);
      }
    );
  });
}

/**
 * Load a model by its base64-encoded URN.
 * @param {string} urn
 */
function loadModel(urn) {
  AV.Document.load(
    `urn:${urn}`,
    (doc) => {
      const geometry = doc.getRoot().getDefaultGeometry();
      viewer.loadDocumentNode(doc, geometry);
    },
    (errorCode, errorMsg) => {
      console.error('Document load error:', errorCode, errorMsg);
    }
  );
}

/**
 * Populate the model dropdown and wire up the change handler.
 * @param {Array<{name: string, urn: string}>} models
 */
function populateDropdown(models) {
  const select = document.getElementById('model-select');
  select.innerHTML = '<option value="">— Select a model —</option>';
  for (const { name, urn } of models) {
    const opt = document.createElement('option');
    opt.value = urn;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.disabled = false;
  select.addEventListener('change', () => {
    if (select.value) loadModel(select.value);
  });
}

async function init() {
  // Fetch token and model list in parallel — no dependency between them
  const [token, models] = await Promise.all([getToken(), listModels()]);
  viewer = await initViewer(token);
  populateDropdown(models);
}

init().catch((err) => {
  console.error('Initialization failed:', err);
});

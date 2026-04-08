// APS Viewer SDK attaches to window.Autodesk via the CDN script tag in index.html
const AV = Autodesk.Viewing;

/** @type {Autodesk.Viewing.GuiViewer3D|null} */
let viewer = null;

const select = document.getElementById('model-select');

/**
 * Fetch a 2-legged access token from the backend.
 * Proxied by Vite (dev) or Cloudflare Pages Function (production).
 * @returns {Promise<string>} access_token
 */
async function getToken() {
  const res = await fetch('/api/token');
  if (!res.ok) throw new Error(`/api/token returned ${res.status}`);
  const { access_token } = await res.json();
  return access_token;
}

/**
 * Fetch the list of sample models from the backend.
 * @returns {Promise<Array<{name: string, urn: string}>>}
 */
async function listModels() {
  const res = await fetch('/api/models');
  if (!res.ok) throw new Error(`/api/models returned ${res.status}`);
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
          reject(new Error(`Viewer start failed (code ${startCode})`));
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
      showError(`Failed to load model (code ${errorCode})`);
    }
  );
}

/**
 * Show an error banner below the navbar.
 * @param {string} msg
 */
function showError(msg) {
  const existing = document.getElementById('error-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'error-banner';
  banner.style.cssText =
    'position:fixed;top:56px;left:0;right:0;background:#ef4444;color:#fff;' +
    'padding:8px 16px;font-size:13px;font-family:sans-serif;z-index:9999;';
  banner.textContent = `⚠ ${msg} — open the browser console (F12) for details.`;
  document.body.appendChild(banner);
}

/**
 * Populate the model dropdown and wire up the change handler.
 * @param {Array<{name: string, urn: string}>} models
 */
function populateDropdown(models) {
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
  // Run both fetches in parallel; use allSettled so one failure doesn't kill the other
  const [tokenResult, modelsResult] = await Promise.allSettled([
    getToken(),
    listModels(),
  ]);

  // Populate dropdown regardless of token/viewer status
  if (modelsResult.status === 'fulfilled') {
    populateDropdown(modelsResult.value);
  } else {
    console.error('Models fetch failed:', modelsResult.reason);
    select.innerHTML = '<option value="">Failed to load models</option>';
    select.disabled = false;
    showError(modelsResult.reason.message);
  }

  // Initialize viewer independently of models
  if (tokenResult.status === 'fulfilled') {
    try {
      viewer = await initViewer(tokenResult.value);
    } catch (err) {
      console.error('Viewer init failed:', err);
      showError(err.message);
    }
  } else {
    console.error('Token fetch failed:', tokenResult.reason);
    showError(tokenResult.reason.message);
  }
}

init();

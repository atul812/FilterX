/* background.js - service worker (MV3) */
const DEFAULT_BACKEND = 'http://localhost:8000';
let backend = DEFAULT_BACKEND;
let threshold = 0.6;
let enabled = true;
let whitelist = [];

// load stored settings
chrome.storage.sync.get({ backendUrl: DEFAULT_BACKEND, threshold: 0.6, enabled: true, whitelist: [] }, v => {
  backend = v.backendUrl || DEFAULT_BACKEND;
  threshold = v.threshold ?? 0.6;
  enabled = v.enabled ?? true;
  whitelist = v.whitelist || [];
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.backendUrl) backend = changes.backendUrl.newValue;
  if (changes.threshold) threshold = changes.threshold.newValue;
  if (changes.enabled) enabled = changes.enabled.newValue;
  if (changes.whitelist) whitelist = changes.whitelist.newValue;
  // broadcast to content scripts that settings changed
  chrome.tabs.query({}, tabs => {
    for (const t of tabs) {
      chrome.tabs.sendMessage(t.id, { type: 'settings-updated', enabled, whitelist }).catch(()=>{});
    }
  });
});

// helper to forward image (FormData) to backend
async function classifyImageFloating(imageDataUrl, src, url) {
  try {
    const blob = dataURLtoBlob(imageDataUrl);
    const fd = new FormData();
    fd.append('file', blob, 'thumb.jpg');
    fd.append('type', 'image');
    fd.append('url', url || '');
    const resp = await fetch(`${backend}/api/classify/`, { method: 'POST', body: fd });
    if (!resp.ok) throw new Error('Bad response ' + resp.status);
    const j = await resp.json();
    // expected { decision: 'allow'|'blur'|'block', score: 0.xx }
    return j;
  } catch (err) {
    // fallback: random decision for dev so extension can be tested without backend
    return { decision: Math.random() < 0.5 ? 'allow' : (Math.random() < 0.5 ? 'blur' : 'block'), score: 0.5 };
  }
}

// convert dataURL to Blob
function dataURLtoBlob(dataurl) {
  const parts = dataurl.split(',');
  const meta = parts[0];
  const bstr = atob(parts[1]);
  const mime = meta.match(/:(.*?);/)[1];
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!enabled) return; // do nothing if globally disabled
  if (msg?.type === 'classify-image') {
    const tabId = sender.tab && sender.tab.id;
    classifyImageFloating(msg.image, msg.src, msg.url).then(result => {
      // optionally check threshold or score to decide
      let decision = result.decision || 'allow';
      // send result back to the tab
      if (tabId) {
        chrome.tabs.sendMessage(tabId, { type: 'classify-result', src: msg.src, decision, score: result.score || 0 }).catch(()=>{});
      }
    }).catch(e => {
      // still notify content script with allow to avoid stuckness
      if (sender.tab && sender.tab.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'classify-result', src: msg.src, decision: 'allow', score: 0 }).catch(()=>{});
      }
    });
  } else if (msg?.type === 'ping') {
    sendResponse({ ok: true });
  }
});

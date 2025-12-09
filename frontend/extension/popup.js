// popup.js - External script for popup.html (no inline scripts)

const toggleEl = document.getElementById('toggle');
const blockedEl = document.getElementById('blockedCount');
const blurredEl = document.getElementById('blurredCount');
const openSettingsBtn = document.getElementById('openSettings');
const openDashboardBtn = document.getElementById('openDashboard');

function setToggleVisual(on) {
  if (!toggleEl) return;
  toggleEl.classList.toggle('on', !!on);
  toggleEl.setAttribute('aria-pressed', on ? 'true' : 'false');
}

// initialize UI from storage
chrome.storage.sync.get({ enabled: true, blockedCount: 0, blurredCount: 0 }, (data) => {
  setToggleVisual(data.enabled);
  if (blockedEl) blockedEl.innerText = data.blockedCount || 0;
  if (blurredEl) blurredEl.innerText = data.blurredCount || 0;
});

// toggle click
if (toggleEl) {
  toggleEl.addEventListener('click', () => {
    chrome.storage.sync.get({ enabled: true }, (d) => {
      const next = !d.enabled;
      chrome.storage.sync.set({ enabled: next }, () => {
        setToggleVisual(next);
        // notify content scripts in all tabs
        chrome.tabs.query({}, (tabs) => {
          for (const t of tabs) {
            chrome.tabs.sendMessage(t.id, { type: 'settings-updated', enabled: next }).catch(()=>{});
          }
        });
      });
    });
  });
}

// open options page
if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
}

// open dashboard (full page)
if (openDashboardBtn) {
  openDashboardBtn.addEventListener('click', () => {
    // preferred: open in new tab using chrome.tabs.create
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }, (tab) => {
      // fallback handled: nothing to do
    });
    // close popup
    window.close();
  });
}

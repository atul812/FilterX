/**
 * showBlockedOverlay(img)
 * - img (optional): the specific HTMLImageElement that was blocked.
 *
 * Behavior:
 * - Renders a centered modal overlay with accessible focus trap
 * - Prevents background scrolling while open
 * - Closes on ESC, click outside, or "View Anyway"
 * - Reveals either the given image or all images with data-filterx="block"
 */
function showBlockedOverlay(img) {
  // Avoid duplicate overlays
  if (document.querySelector('.filterx-block-overlay')) return;

  // Save currently focused element so we can restore focus after closing
  const prevActive = document.activeElement;

  // Prevent body scroll
  const prevOverflow = document.documentElement.style.overflow || document.body.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Create and inject style (only once per overlay)
  const STYLE_ID = 'filterx-block-style';
  let createdStyle = false;
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .filterx-block-overlay {
        position: fixed;
        inset: 0;
        display:flex;
        align-items:center;
        justify-content:center;
        background: linear-gradient(180deg, rgba(10,20,40,0.6), rgba(8,12,24,0.5));
        z-index: 2147483647;
        opacity: 0;
        transition: opacity .22s ease;
      }
      .filterx-block-overlay.show { opacity: 1; }

      .filterx-block-card {
        width: 520px;
        max-width:94%;
        background: linear-gradient(180deg,#ffffffee,#fbfdff);
        border-radius:18px;
        padding:26px;
        text-align:center;
        box-shadow:0 30px 80px rgba(6,14,28,0.5);
        border:1px solid rgba(30,60,120,0.06);
        color:#10243c;
        font-family: Inter, system-ui, Arial;
        transform: translateY(6px);
        transition: transform .22s ease;
      }
      .filterx-block-overlay.show .filterx-block-card { transform: translateY(0); }

      .filterx-block-card h2{ margin:0 0 8px 0; font-size:20px; color:#1f4a7a; }
      .filterx-block-card p{ margin:8px 0 16px 0; color:#6d8298; line-height:1.4; }

      .filterx-block-btn {
        display:inline-block;
        padding:12px 18px;
        border-radius:28px;
        font-weight:700;
        cursor:pointer;
        background: linear-gradient(90deg,#7c5cff,#47d0ff);
        color:white;
        border:none;
        box-shadow:0 12px 30px rgba(72,64,255,0.12);
      }
      .filterx-block-secondary { display:block; margin-top:12px; font-size:13px; color:#7b8ca3 }

      /* small close button for accessibility */
      .filterx-block-close {
        position: absolute;
        right: 18px;
        top: 18px;
        width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        color: #6d8298;
        font-size: 18px;
        cursor: pointer;
        border-radius: 8px;
      }
      .filterx-block-close:focus { outline: 2px solid rgba(124,92,255,0.25); }
    `;
    document.head.appendChild(style);
    createdStyle = true;
  }

  // Build overlay DOM
  const overlay = document.createElement('div');
  overlay.className = 'filterx-block-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Blocked content dialog');

  overlay.innerHTML = `
    <div class="filterx-block-card" role="document" tabindex="0">
      <button class="filterx-block-close" aria-label="Close overlay">&times;</button>
      <h2>FilterX blocked this content</h2>
      <p>This content may be explicit or unsafe based on your current AI protection settings.</p>
      <div style="margin-top:12px;">
        <button class="filterx-block-btn" id="filterx-view-anyway">View Anyway (Not Recommended)</button>
      </div>
      <div class="filterx-block-secondary">Adjust your filters in extension settings if needed</div>
    </div>
  `;

  // Append and animate in
  document.body.appendChild(overlay);
  // Force reflow then show class to trigger CSS transitions
  requestAnimationFrame(() => overlay.classList.add('show'));

  const card = overlay.querySelector('.filterx-block-card');
  const btnView = overlay.querySelector('#filterx-view-anyway');
  const btnClose = overlay.querySelector('.filterx-block-close');

  // Focus management: trap focus inside the overlay
  const focusable = [btnView, btnClose];
  let focusIndex = 0;
  focusable[focusIndex].focus();

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    if (e.shiftKey) {
      focusIndex = (focusIndex - 1 + focusable.length) % focusable.length;
    } else {
      focusIndex = (focusIndex + 1) % focusable.length;
    }
    focusable[focusIndex].focus();
  }

  // Dismiss overlay and cleanup
  function closeOverlay(reveal = false) {
    overlay.classList.remove('show');
    // animate out then remove
    overlay.addEventListener('transitionend', () => {
      try { overlay.remove(); } catch (e) { }
      if (createdStyle) {
        const st = document.getElementById(STYLE_ID);
        if (st) st.remove();
      }
      // restore scroll
      document.documentElement.style.overflow = prevOverflow || '';
      document.body.style.overflow = prevOverflow || '';
      // restore focus
      try { if (prevActive) prevActive.focus(); } catch (e) { }
    }, { once: true });

    // reveal behaviour
    if (reveal) {
      if (img instanceof HTMLImageElement) {
        // reveal only the specific image
        img.style.visibility = '';
        img.dataset.filterx = 'revealed';
      } else {
        // reveal all blocked images
        const blockedImgs = Array.from(document.querySelectorAll('img[data-filterx="block"], img[data-filterx="blocked"]'));
        blockedImgs.forEach(i => {
          i.style.visibility = '';
          i.dataset.filterx = 'revealed';
        });
      }
    }

    // remove event listeners
    document.removeEventListener('keydown', keyHandler);
    overlay.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', trapFocus);
  }

  // Click outside to close
  function outsideClick(e) {
    if (!card.contains(e.target)) closeOverlay(false);
  }

  // Key handler (ESC to close)
  function keyHandler(e) {
    if (e.key === 'Escape') {
      closeOverlay(false);
    }
  }

  // Event bindings
  btnView.addEventListener('click', () => closeOverlay(true));
  btnClose.addEventListener('click', () => closeOverlay(false));
  overlay.addEventListener('click', outsideClick);
  document.addEventListener('keydown', keyHandler);
  document.addEventListener('keydown', trapFocus);

  // Accessibility: set initial focus to the card for screen readers
  setTimeout(() => { card.focus(); }, 50);
}

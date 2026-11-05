// ==UserScript==
// @name         Xoul.ai — Avatars + UI Settings
// @namespace    chatui
// @version      1.0
// @description  Big portrait avatars, adjustable chat text size, and UI customisation in a draggable floating button
// @author       Lulorick
// @match        https://xoul.ai/*
// @match        https://*.xoul.ai/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ── SETTINGS ──────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'xoul-ui-settings-v2';   // same key as before so saved settings carry over
  const POS_KEY     = 'xoul-ui-pill-pos-v1';

  const DEFAULTS = {
    avatarSize:  'small',
    avatarShape: 'square',
    largePicker: false,
    infoBar:     false,
    textSize:    0,       // 0 = leave the site's own size alone; otherwise px
    inputMatch:  false    // also apply textSize to the message input box
  };

  const TEXT_MIN = 16;
  const TEXT_MAX = 40;

  const AVATAR_SIZES = {
    small:  { portrait: [150, 225], square: [150, 150] },
    medium: { portrait: [220, 330], square: [220, 220] },
    large:  { portrait: [300, 450], square: [300, 300] }
  };

  const PROCESSED_ATTR = 'data-xoul-avatar-done';

  let settings = loadSettings();

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return (saved && typeof saved === 'object') ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch {}
  }

  function resetSettings() {
    settings = { ...DEFAULTS };
    saveSettings();
    updateSettingsUI();
    applyDynamicStyles();
    reprocessAvatars();
    nudgeLayout();
  }

  // The chat list is virtualised (bubbles are absolutely positioned), so after a
  // text-size change we ask the page to re-measure by firing a resize event.
  let nudgeTimer = null;
  function nudgeLayout() {
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
  }

  // ── Permanent CSS ─────────────────────────────────────────────────────────

  const PERMANENT_CSS = `
    .ChatBubble_sender_info___ekJu { display: none !important; }

    .ChatBubble_container__f0uE8.ChatBubble_container_desktop__xUcEU {
      display: flex !important; align-items: flex-end !important;
      gap: 12px !important; padding: 4px 0 !important;
    }
    .ChatBubble_container__f0uE8.ChatBubble_container_desktop__xUcEU[data-speaker="bot"]  { flex-direction: row !important; }
    .ChatBubble_container__f0uE8.ChatBubble_container_desktop__xUcEU[data-speaker="user"] { flex-direction: row-reverse !important; }
    .ChatBubble_container__f0uE8.ChatBubble_container_desktop__xUcEU > .ChatBubble_box__c1mJu {
      flex: 1 1 auto !important; min-width: 0 !important;
      margin-left: 0 !important; margin-right: 0 !important;
    }

    /* ── Floating pill (draggable) ─────────────────────────────────────── */
    #xoul-pill {
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      display: flex; align-items: stretch; gap: 0;
      border-radius: 24px; overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      font-family: system-ui, -apple-system, sans-serif;
      user-select: none; -webkit-user-select: none;
    }
    #xoul-pill-handle {
      display: flex; align-items: center; justify-content: center;
      width: 30px; background: #2c2c2e; color: #8a8a8e;
      font-size: 15px; cursor: grab; touch-action: none;
      border-right: 1px solid rgba(255,255,255,0.1);
    }
    #xoul-pill-handle:hover { background: #3a3a3c; color: #ccc; }
    #xoul-pill.dragging #xoul-pill-handle { cursor: grabbing; background: #48484a; }
    .xoul-pill-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 15px;
      border: none; background: #2c2c2e; color: #f0f0f0;
      font-size: 13px; font-weight: 500; cursor: pointer;
      transition: background 120ms; white-space: nowrap;
    }
    .xoul-pill-btn:hover  { background: #3a3a3c; }
    .xoul-pill-btn.active { background: #48484a; }

    /* ── Settings panel (position set by JS, next to the pill) ─────────── */
    .xoul-panel {
      position: fixed;
      width: 310px; max-width: calc(100vw - 16px);
      overflow-y: auto;
      padding: 18px; box-sizing: border-box;
      background: rgba(22,22,24,0.97); color: #f0f0f0;
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px; z-index: 1000000;
    }
    .xoul-panel[hidden] { display: none !important; }

    .xs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .xs-title  { font-size: 16px; font-weight: 600; }
    .xs-close  { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
                 border: none; border-radius: 50%; background: rgba(255,255,255,0.1); color: white;
                 font-size: 16px; cursor: pointer; flex-shrink: 0; }

    .xs-section { margin-bottom: 16px; }
    .xs-label   { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 600;
                  color: #bbb; text-transform: uppercase; letter-spacing: .04em; }

    .xs-seg     { display: grid; gap: 3px; padding: 3px; background: rgba(255,255,255,0.07); border-radius: 9px; }
    .xs-seg.c3  { grid-template-columns: repeat(3,1fr); }
    .xs-seg.c2  { grid-template-columns: repeat(2,1fr); }
    .xs-seg button {
      border: none; border-radius: 7px; padding: 7px 4px;
      background: transparent; color: #aaa; cursor: pointer; font-size: 12px;
      transition: background 100ms, color 100ms;
    }
    .xs-seg button.active { background: rgba(255,255,255,0.18); color: white; font-weight: 600; }
    .xs-sub { margin-top: 5px; text-align: center; color: #777; font-size: 11px; }

    .xs-toggle-row  { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
    .xs-toggle-text { font-size: 13px; }
    .xs-toggle      { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
    .xs-toggle input { opacity: 0; width: 0; height: 0; }
    .xs-toggle-track {
      position: absolute; inset: 0; background: #444;
      border-radius: 20px; transition: background 120ms;
    }
    .xs-toggle-track::before {
      content: ""; position: absolute;
      width: 16px; height: 16px; left: 2px; top: 2px;
      border-radius: 50%; background: white; transition: transform 120ms;
    }
    .xs-toggle input:checked + .xs-toggle-track          { background: #777; }
    .xs-toggle input:checked + .xs-toggle-track::before  { transform: translateX(16px); }

    /* Text size controls */
    .xs-text-row { display: flex; align-items: center; gap: 8px; }
    .xs-step {
      width: 34px; height: 34px; flex-shrink: 0;
      border: 1px solid rgba(255,255,255,0.18); border-radius: 8px;
      background: rgba(255,255,255,0.08); color: #f0f0f0;
      font-size: 18px; line-height: 1; cursor: pointer;
    }
    .xs-step:hover { background: rgba(255,255,255,0.16); }
    #xs-text-slider { flex: 1 1 auto; min-width: 0; accent-color: #999; }
    .xs-text-val { margin-top: 6px; text-align: center; color: #bbb; font-size: 12px; }
    #xs-text-preview {
      margin-top: 8px; padding: 8px 10px; border-radius: 8px;
      background: rgba(255,255,255,0.06); color: #eee;
      line-height: 1.5; overflow-wrap: anywhere;
    }
    .xs-link {
      display: block; margin: 8px auto 0; padding: 4px 8px;
      border: none; background: none; color: #9ecbff;
      font-size: 12px; cursor: pointer; text-decoration: underline;
    }

    .xs-reset {
      width: 100%; margin-top: 4px; padding: 8px;
      border: 1px solid rgba(255,255,255,0.13); border-radius: 8px;
      background: rgba(255,255,255,0.05); color: #ccc;
      cursor: pointer; font-size: 12px;
    }
    .xs-reset:hover { background: rgba(255,255,255,0.1); }
  `;

  // ── Dynamic CSS ───────────────────────────────────────────────────────────

  function buildDynamicCSS() {
    const [w, h] = AVATAR_SIZES[settings.avatarSize][settings.avatarShape];
    const cropPosition = settings.avatarShape === 'square' ? 'center center' : 'top center';

    const avatarCSS = `
      .xoul-big-avatar {
        flex: 0 0 ${w}px !important; width: ${w}px !important; height: ${h}px !important;
        border-radius: 12px !important; object-fit: cover !important;
        object-position: ${cropPosition} !important; align-self: flex-end !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35) !important;
      }
    `;

    const px = Number(settings.textSize) || 0;

    const textCSS = px ? `
      [class*="ChatBubble_messagecontainer__"],
      [class*="ChatBubble_messagecontainer__"] * {
        font-size: ${px}px !important;
        line-height: 1.55 !important;
      }
    ` : '';

    const inputPx = (px && settings.inputMatch) ? px : 16;
    const inputCSS = `
      .ChatInput_container__Jpiti .tiptap.ProseMirror,
      .ChatInput_container__Jpiti .tiptap.ProseMirror p { font-size: ${inputPx}px !important; line-height: 1.5 !important; }
      .ChatInput_container__Jpiti .tiptap.ProseMirror p[data-placeholder]::before { font-size: ${inputPx}px !important; }
    `;

    const pickerCSS = settings.largePicker ? `
      .SelectXoulSlider_button__WX9pN     { height: auto !important; padding: 8px 10px !important; }
      .SelectXoulSlider_content__1donT    { display: flex !important; flex-direction: column !important; align-items: center !important; gap: 6px !important; }
      .SelectXoulSlider_image__Dt5W4      { width: 80px !important; height: 80px !important; border-radius: 10px !important; object-fit: cover !important; }
      .SelectXoulSlider_content__1donT > span { font-size: 13px !important; white-space: nowrap !important; }
      .SelectXoulSlider_horizontal__q4L_o { padding: 8px 0 4px !important; }
    ` : '';

    const infoCSS = settings.infoBar ? `
      .ChatBubble_info__nTuf_ {
        display: inline-flex !important; align-items: center !important; gap: 6px !important;
        margin-top: 4px !important; padding: 4px 10px !important;
        background: rgba(0,0,0,0.45) !important; border-radius: 20px !important;
        backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important;
      }
      .ChatBubble_time__2b_qC {
        font-size: 13px !important; font-weight: 500 !important; opacity: 1 !important;
      }
      .ChatBubble_info__nTuf_ svg,
      .ChatBubble_regenerate__AERix,
      .ChatBubble_icon_fill__s0Wi8 {
        width: 18px !important; height: 18px !important; opacity: 1 !important;
      }
      .ChatBubble_info-button__bqbGO,
      .ChatBubble_info__nTuf_ .ChatBubble_icon_container__CPUn9 {
        display: flex !important; align-items: center !important;
        justify-content: center !important; opacity: 1 !important;
      }
    ` : '';

    return [avatarCSS, textCSS, inputCSS, pickerCSS, infoCSS].join('\n');
  }

  function injectPermanentStyles() {
    if (document.getElementById('xoul-perm')) return;
    const s = document.createElement('style');
    s.id = 'xoul-perm'; s.textContent = PERMANENT_CSS;
    document.head.appendChild(s);
  }

  function applyDynamicStyles() {
    let s = document.getElementById('xoul-dyn');
    if (!s) { s = document.createElement('style'); s.id = 'xoul-dyn'; document.head.appendChild(s); }
    s.textContent = buildDynamicCSS();
  }

  // ── Avatar injection ──────────────────────────────────────────────────────

  function processContainer(container) {
    if (container.hasAttribute(PROCESSED_ATTR)) return;
    const senderInfo = container.querySelector('.ChatBubble_sender_info___ekJu');
    if (!senderInfo) return;
    container.setAttribute(PROCESSED_ATTR, '1');
    const isBot = senderInfo.getAttribute('data-is-bot') === 'true';
    container.setAttribute('data-speaker', isBot ? 'bot' : 'user');
    const originalImg = senderInfo.querySelector('img.ChatBubble_image__lGExG');
    if (!originalImg) return;
    const img = document.createElement('img');
    img.className = 'xoul-big-avatar';
    img.alt = originalImg.alt;
    img.loading = 'lazy';
    const rawSrc = originalImg.src || '';
    const cfMatch = rawSrc.match(/https:\/\/user-images\.prod\.xoul-media\.com\/cdn-cgi\/image\/[^/]+\/(.+)/);
    img.src = cfMatch
      ? `https://user-images.prod.xoul-media.com/cdn-cgi/image/width=512,height=748,quality=85,format=webp/${cfMatch[1]}`
      : rawSrc;
    container.insertBefore(img, container.firstChild);
  }

  function processAll() {
    document.querySelectorAll(
      '.ChatBubble_container__f0uE8.ChatBubble_container_desktop__xUcEU'
    ).forEach(processContainer);
  }

  function reprocessAvatars() {
    document.querySelectorAll('.xoul-big-avatar').forEach(el => el.remove());
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR));
    processAll();
  }

  // ── Settings panel UI sync ────────────────────────────────────────────────

  function updateSettingsUI() {
    const panel = document.getElementById('xoul-ui-panel');
    if (!panel) return;

    panel.querySelectorAll('[data-s]').forEach(b => {
      b.classList.toggle('active', settings[b.dataset.s] === b.dataset.v);
    });

    const [w, h] = AVATAR_SIZES[settings.avatarSize][settings.avatarShape];
    const sub = document.getElementById('xs-size-sub');
    if (sub) sub.textContent = `${w} × ${h} px`;

    const picker  = document.getElementById('xs-picker');
    const infobar = document.getElementById('xs-infobar');
    const inMatch = document.getElementById('xs-inputmatch');
    if (picker)  picker.checked  = settings.largePicker;
    if (infobar) infobar.checked = settings.infoBar;
    if (inMatch) inMatch.checked = settings.inputMatch;

    const px = Number(settings.textSize) || 0;
    const slider  = document.getElementById('xs-text-slider');
    const val     = document.getElementById('xs-text-val');
    const preview = document.getElementById('xs-text-preview');
    if (slider)  slider.value = px || TEXT_MIN;
    if (val)     val.textContent = px ? `${px} px` : 'Site default';
    if (preview) preview.style.fontSize = (px || 16) + 'px';
  }

  function setTextSize(px) {
    px = Number(px) || 0;
    if (px) px = Math.max(TEXT_MIN, Math.min(TEXT_MAX, Math.round(px)));
    settings.textSize = px;
    saveSettings(); updateSettingsUI(); applyDynamicStyles(); nudgeLayout();
  }

  // ── UI: draggable pill + settings panel ───────────────────────────────────

  function createUI() {
    if (document.getElementById('xoul-pill')) return;

    // Pill
    const pill = document.createElement('div');
    pill.id = 'xoul-pill';
    pill.innerHTML = `
      <div id="xoul-pill-handle" title="Drag to move (double-click to reset position)">⠿</div>
      <button class="xoul-pill-btn" id="xoul-pill-ui" type="button">⚙ <span>UI</span></button>
    `;
    document.body.appendChild(pill);

    const handle = pill.querySelector('#xoul-pill-handle');
    const uiBtn  = pill.querySelector('#xoul-pill-ui');

    // Panel
    const panel = document.createElement('div');
    panel.className = 'xoul-panel';
    panel.id = 'xoul-ui-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="xs-header">
        <span class="xs-title">UI Settings</span>
        <button class="xs-close" type="button">×</button>
      </div>

      <div class="xs-section">
        <label class="xs-label">Chat Text Size</label>
        <div class="xs-text-row">
          <button class="xs-step" id="xs-text-down" type="button" aria-label="Smaller text">−</button>
          <input id="xs-text-slider" type="range" min="${TEXT_MIN}" max="${TEXT_MAX}" step="1">
          <button class="xs-step" id="xs-text-up" type="button" aria-label="Larger text">+</button>
        </div>
        <div class="xs-text-val" id="xs-text-val"></div>
        <div id="xs-text-preview">The quick brown fox jumps over the lazy dog.</div>
        <button class="xs-link" id="xs-text-default" type="button">Use site default size</button>
        <label class="xs-toggle-row">
          <span class="xs-toggle-text">Also enlarge the typing box</span>
          <span class="xs-toggle"><input id="xs-inputmatch" type="checkbox"><span class="xs-toggle-track"></span></span>
        </label>
      </div>

      <div class="xs-section">
        <label class="xs-label">Avatar Size</label>
        <div class="xs-seg c3">
          <button type="button" data-s="avatarSize" data-v="small">Small</button>
          <button type="button" data-s="avatarSize" data-v="medium">Medium</button>
          <button type="button" data-s="avatarSize" data-v="large">Large</button>
        </div>
        <div class="xs-sub" id="xs-size-sub"></div>
      </div>

      <div class="xs-section">
        <label class="xs-label">Avatar Shape</label>
        <div class="xs-seg c2">
          <button type="button" data-s="avatarShape" data-v="portrait">Portrait 2:3</button>
          <button type="button" data-s="avatarShape" data-v="square">Square 1:1</button>
        </div>
      </div>

      <div class="xs-section">
        <label class="xs-toggle-row">
          <span class="xs-toggle-text">Large Character Picker</span>
          <span class="xs-toggle"><input id="xs-picker" type="checkbox"><span class="xs-toggle-track"></span></span>
        </label>
        <label class="xs-toggle-row">
          <span class="xs-toggle-text">Enhanced Info Bar</span>
          <span class="xs-toggle"><input id="xs-infobar" type="checkbox"><span class="xs-toggle-track"></span></span>
        </label>
      </div>

      <button class="xs-reset" id="xs-reset-pos" type="button">Reset button position</button>
      <button class="xs-reset" id="xs-reset-all" type="button">Reset to Defaults</button>
    `;
    document.body.appendChild(panel);

    // ── Pill position (drag + persist) ──
    const MARGIN = 4;

    function clampPos(left, top) {
      const maxL = Math.max(MARGIN, window.innerWidth  - pill.offsetWidth  - MARGIN);
      const maxT = Math.max(MARGIN, window.innerHeight - pill.offsetHeight - MARGIN);
      return [Math.min(Math.max(MARGIN, left), maxL), Math.min(Math.max(MARGIN, top), maxT)];
    }

    function setPillPos(left, top) {
      [left, top] = clampPos(left, top);
      pill.style.left = left + 'px'; pill.style.top = top + 'px';
      pill.style.right = 'auto';     pill.style.bottom = 'auto';
    }

    function loadPillPos() {
      try {
        const p = JSON.parse(localStorage.getItem(POS_KEY));
        if (p && typeof p.left === 'number' && typeof p.top === 'number') setPillPos(p.left, p.top);
      } catch {}
    }

    function savePillPos() {
      try {
        const r = pill.getBoundingClientRect();
        localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top }));
      } catch {}
    }

    function resetPillPos() {
      try { localStorage.removeItem(POS_KEY); } catch {}
      pill.style.left = pill.style.top = '';
      pill.style.right = '20px'; pill.style.bottom = '20px';
      if (!panel.hidden) positionPanel();
    }

    let dragging = false, offX = 0, offY = 0;

    handle.addEventListener('pointerdown', e => {
      dragging = true;
      const r = pill.getBoundingClientRect();
      offX = e.clientX - r.left; offY = e.clientY - r.top;
      handle.setPointerCapture(e.pointerId);
      pill.classList.add('dragging');
      e.preventDefault();
    });
    handle.addEventListener('pointermove', e => {
      if (!dragging) return;
      setPillPos(e.clientX - offX, e.clientY - offY);
      if (!panel.hidden) positionPanel();
    });
    const endDrag = e => {
      if (!dragging) return;
      dragging = false;
      pill.classList.remove('dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch {}
      savePillPos();
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('dblclick', resetPillPos);

    window.addEventListener('resize', () => {
      // Only re-clamp if the user has moved it; otherwise CSS keeps it in the corner.
      if (pill.style.left) {
        const r = pill.getBoundingClientRect();
        setPillPos(r.left, r.top);
      }
      if (!panel.hidden) positionPanel();
    });

    // ── Panel placement: opens above or below the pill, whichever has room ──
    function positionPanel() {
      const r = pill.getBoundingClientRect();
      const gap = 8;
      const spaceAbove = r.top - gap - 8;
      const spaceBelow = window.innerHeight - r.bottom - gap - 8;
      const openUp = spaceAbove >= spaceBelow;

      panel.style.maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow) + 'px';
      if (openUp) { panel.style.bottom = (window.innerHeight - r.top + gap) + 'px'; panel.style.top = 'auto'; }
      else        { panel.style.top = (r.bottom + gap) + 'px'; panel.style.bottom = 'auto'; }

      const pw = panel.offsetWidth || 310;
      let left = r.right - pw;
      left = Math.min(Math.max(8, left), window.innerWidth - pw - 8);
      panel.style.left = left + 'px'; panel.style.right = 'auto';
    }

    function closePanel() { panel.hidden = true; uiBtn.classList.remove('active'); }

    uiBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (panel.hidden) { panel.hidden = false; uiBtn.classList.add('active'); positionPanel(); }
      else closePanel();
    });
    pill.addEventListener('click', e => e.stopPropagation());
    panel.addEventListener('click', e => e.stopPropagation());
    panel.querySelector('.xs-close').addEventListener('click', closePanel);
    document.addEventListener('click', closePanel);

    // ── Settings wiring ──
    panel.querySelectorAll('[data-s]').forEach(b => {
      b.addEventListener('click', () => {
        settings[b.dataset.s] = b.dataset.v;
        saveSettings(); updateSettingsUI(); applyDynamicStyles(); reprocessAvatars();
      });
    });

    const slider = document.getElementById('xs-text-slider');
    slider.addEventListener('input', () => setTextSize(slider.value));
    document.getElementById('xs-text-down').addEventListener('click', () => {
      const cur = Number(settings.textSize) || 16;
      setTextSize(cur - 1);
    });
    document.getElementById('xs-text-up').addEventListener('click', () => {
      const cur = Number(settings.textSize) || 16;
      setTextSize(cur + 1);
    });
    document.getElementById('xs-text-default').addEventListener('click', () => setTextSize(0));

    document.getElementById('xs-inputmatch').addEventListener('change', e => {
      settings.inputMatch = e.target.checked; saveSettings(); applyDynamicStyles();
    });
    document.getElementById('xs-picker').addEventListener('change', e => {
      settings.largePicker = e.target.checked; saveSettings(); applyDynamicStyles();
    });
    document.getElementById('xs-infobar').addEventListener('change', e => {
      settings.infoBar = e.target.checked; saveSettings(); applyDynamicStyles();
    });
    document.getElementById('xs-reset-pos').addEventListener('click', resetPillPos);
    document.getElementById('xs-reset-all').addEventListener('click', resetSettings);

    loadPillPos();
    updateSettingsUI();
  }

  // ── OBSERVERS + INIT ──────────────────────────────────────────────────────

  function setupObservers() {
    new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('.ChatBubble_container__f0uE8'))
            processContainer(node);
          else
            node.querySelectorAll('.ChatBubble_container__f0uE8').forEach(processContainer);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) { lastUrl = location.href; setTimeout(processAll, 500); }
    }, 500);
  }

  function init() {
    injectPermanentStyles();
    applyDynamicStyles();
    processAll();
    createUI();
    setupObservers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

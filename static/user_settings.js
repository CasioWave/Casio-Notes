;(function () {
  if (window.__userSettingsInitialized) return
  window.__userSettingsInitialized = true

  // Initial State from localStorage
  let settings = {
    simEnabled: localStorage.getItem("us_simEnabled") !== "false", // default true
    highContrast: localStorage.getItem("us_highContrast") === "true", // default false
    simTemp: parseFloat(localStorage.getItem("us_simTemp")) || 0.1,
    fontSize: parseFloat(localStorage.getItem("us_fontSize")) || 1.0,
    bionic: localStorage.getItem("us_bionic") === "true", // default false
    tufteEnabled: localStorage.getItem("us_tufteEnabled") !== "false", // default true
  }

  // 1. Inject CSS for UI and Features
  const style = document.createElement("style")
  style.setAttribute("data-persist", "true")
  style.textContent = `
    /* Settings Button */
    #user-settings-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 45px;
      height: 45px;
      border-radius: 50%;
      background: var(--secondary);
      color: var(--light);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: transform 0.2s, background 0.2s;
      border: 2px solid var(--light);
    }
    #user-settings-btn:hover {
      transform: scale(1.1) rotate(45deg);
    }
    #user-settings-btn svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    /* Settings Panel */
    #user-settings-panel {
      position: fixed;
      bottom: 75px;
      right: 20px;
      width: 320px;
      background: var(--light);
      border: 1px solid var(--lightgray);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 10000;
      display: none;
      flex-direction: column;
      gap: 16px;
      color: var(--darkgray);
      font-family: var(--body-font, sans-serif);
      transition: opacity 0.2s;
    }
    #user-settings-panel.open {
      display: flex;
    }
    #user-settings-panel h3 {
      margin: 0;
      font-size: 1.2rem;
      color: var(--secondary);
      border-bottom: 2px solid var(--lightgray);
      padding-bottom: 8px;
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .setting-row label {
      font-size: 0.95rem;
      cursor: pointer;
      user-select: none;
    }
    .setting-row input[type="checkbox"] {
      cursor: pointer;
      width: 18px;
      height: 18px;
    }
    .setting-row input[type="range"] {
      width: 120px;
      cursor: pointer;
    }

    /* Feature: High Contrast */
    html.high-contrast-mode {
      filter: contrast(1.4) saturate(1.2) !important;
    }

    /* Feature: Tufte Mode Disabled */
    body.tufte-disabled .page .center article {
      width: 100% !important;
      float: none !important;
    }
    body.tufte-disabled .sidenote {
      display: none !important;
    }
    body.tufte-disabled .footnotes,
    body.tufte-disabled .references {
      display: block !important;
    }

    /* Feature: Bionic Reading */
    body:not(.bionic-enabled) b.bionic {
      font-weight: inherit;
    }
    body.bionic-enabled b.bionic {
      font-weight: bolder;
    }
  `
  document.head.appendChild(style)

  // 2. Render HTML UI
  const btn = document.createElement("button")
  btn.id = "user-settings-btn"
  btn.setAttribute("data-persist", "true")
  btn.setAttribute("aria-label", "Open Settings")
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>`
  document.body.appendChild(btn)

  const panel = document.createElement("div")
  panel.id = "user-settings-panel"
  panel.setAttribute("data-persist", "true")
  panel.innerHTML = `
    <h3>Reading Preferences</h3>

    <div class="setting-row">
      <label for="us-sim-enabled">Background Simulation</label>
      <input type="checkbox" id="us-sim-enabled" ${settings.simEnabled ? "checked" : ""}>
    </div>

    <div class="setting-row" title="Warning: Reloads page to apply">
      <label for="us-sim-temp">Simulation Temp</label>
      <input type="range" id="us-sim-temp" min="0" max="0.5" step="0.01" value="${settings.simTemp}">
    </div>

    <div class="setting-row">
      <label for="us-font-size">Font Size</label>
      <input type="range" id="us-font-size" min="0.8" max="1.5" step="0.05" value="${settings.fontSize}">
    </div>

    <div class="setting-row">
      <label for="us-high-contrast">High Contrast</label>
      <input type="checkbox" id="us-high-contrast" ${settings.highContrast ? "checked" : ""}>
    </div>

    <div class="setting-row">
      <label for="us-tufte">Tufte Mode (Sidenotes)</label>
      <input type="checkbox" id="us-tufte" ${settings.tufteEnabled ? "checked" : ""}>
    </div>

    <div class="setting-row">
      <label for="us-bionic">Bionic Reading</label>
      <input type="checkbox" id="us-bionic" ${settings.bionic ? "checked" : ""}>
    </div>
  `
  document.body.appendChild(panel)

  // 3. UI Interactions
  btn.addEventListener("click", (e) => {
    e.stopPropagation()
    panel.classList.toggle("open")
  })

  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove("open")
    }
  })

  // 4. Application Functions
  function applyHighContrast() {
    if (settings.highContrast) {
      document.documentElement.classList.add("high-contrast-mode")
    } else {
      document.documentElement.classList.remove("high-contrast-mode")
    }
  }

  function applyTufte() {
    if (settings.tufteEnabled) {
      document.body.classList.remove("tufte-disabled")
    } else {
      document.body.classList.add("tufte-disabled")
    }
  }

  function applyFontSize() {
    document.documentElement.style.setProperty("font-size", `${settings.fontSize}rem`, "important")
  }

  function applySimEnabled() {
    const canvas = document.getElementById("phonon-lattice-canvas")
    if (canvas) {
      canvas.style.display = settings.simEnabled ? "" : "none"
    }
  }

  function applyBionic() {
    if (settings.bionic) {
      document.body.classList.add("bionic-enabled")
      if (!window.__bionicProcessed) {
        processBionic()
        window.__bionicProcessed = true
      }
    } else {
      document.body.classList.remove("bionic-enabled")
    }
  }

  function processBionic() {
    const article = document.querySelector("article")
    if (!article) return

    const walker = document.createTreeWalker(
      article,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parentTag = node.parentElement ? node.parentElement.tagName : ""
          if (
            ["SCRIPT", "STYLE", "CODE", "PRE", "H1", "H2", "H3", "H4", "H5", "H6"].includes(
              parentTag,
            )
          ) {
            return NodeFilter.FILTER_REJECT
          }
          if (node.parentElement && node.parentElement.classList.contains("bionic")) {
            return NodeFilter.FILTER_REJECT
          }
          if (node.nodeValue.trim() === "") {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      },
      false,
    )

    const nodesToProcess = []
    let node
    while ((node = walker.nextNode())) {
      nodesToProcess.push(node)
    }

    nodesToProcess.forEach((n) => {
      const words = n.nodeValue.split(/(\s+)/)
      const frag = document.createDocumentFragment()
      let changed = false

      words.forEach((word) => {
        // Only target alphanumeric words longer than 1 character
        if (word.trim().length > 1 && word.match(/^[a-zA-Z0-9\p{P}]+$/u)) {
          changed = true
          // Calculate the bold length (roughly half, slightly biased to more for short words)
          let mid = Math.ceil(word.length / 2)
          if (word.length === 3) mid = 2

          const b = document.createElement("b")
          b.className = "bionic"
          b.textContent = word.slice(0, mid)

          frag.appendChild(b)
          frag.appendChild(document.createTextNode(word.slice(mid)))
        } else {
          frag.appendChild(document.createTextNode(word))
        }
      })

      if (changed && n.parentNode) {
        n.parentNode.replaceChild(frag, n)
      }
    })
  }

  function applySvgTheme() {
    const svgs = document.querySelectorAll("article svg")
    svgs.forEach((svg) => {
      const elements = svg.querySelectorAll("*")
      elements.forEach((el) => {
        const stroke = el.getAttribute("stroke")
        if (stroke && stroke !== "none" && stroke !== "transparent") {
          el.style.stroke = "var(--darkgray)"
        }
        const fill = el.getAttribute("fill")
        if (fill && fill !== "none" && fill !== "transparent" && fill !== "#ffffff") {
          if (el.tagName.toLowerCase() === "text" || fill === "#000000") {
            el.style.fill = "var(--darkgray)"
          }
        }
      })
    })
  }

  // 5. Event Listeners for Controls
  document.getElementById("us-sim-enabled").addEventListener("change", (e) => {
    settings.simEnabled = e.target.checked
    localStorage.setItem("us_simEnabled", settings.simEnabled)
    applySimEnabled()
  })

  document.getElementById("us-sim-temp").addEventListener("change", (e) => {
    settings.simTemp = parseFloat(e.target.value)
    localStorage.setItem("us_simTemp", settings.simTemp)
    // Since simulation doesn't export a live setter easily without modifying its internal closure,
    // we instruct the user to reload, or forcefully reload to apply temp changes.
    alert("Simulation temperature saved. The page will reload to apply changes.")
    window.location.reload()
  })

  document.getElementById("us-high-contrast").addEventListener("change", (e) => {
    settings.highContrast = e.target.checked
    localStorage.setItem("us_highContrast", settings.highContrast)
    applyHighContrast()
  })

  document.getElementById("us-tufte").addEventListener("change", (e) => {
    settings.tufteEnabled = e.target.checked
    localStorage.setItem("us_tufteEnabled", settings.tufteEnabled)
    applyTufte()
  })

  document.getElementById("us-bionic").addEventListener("change", (e) => {
    settings.bionic = e.target.checked
    localStorage.setItem("us_bionic", settings.bionic)
    applyBionic()
  })

  document.getElementById("us-font-size").addEventListener("input", (e) => {
    settings.fontSize = parseFloat(e.target.value)
    localStorage.setItem("us_fontSize", settings.fontSize)
    applyFontSize()
  })

  // 6. SPA Navigation Hooks
  // Quartz fires a 'nav' event on client-side routing
  document.addEventListener("nav", () => {
    if (!document.getElementById("user-settings-btn")) {
      document.body.appendChild(btn)
    }
    if (!document.getElementById("user-settings-panel")) {
      document.body.appendChild(panel)
    }

    applyHighContrast()
    applyTufte()
    applyFontSize()
    applySimEnabled()
    if (settings.bionic) {
      window.__bionicProcessed = false // allow reprocessing for new page content
      applyBionic()
    }
    applySvgTheme()
  })

  // 7. Initial Application
  const initSettings = () => {
    applyHighContrast()
    applyTufte()
    applyFontSize()
    applySimEnabled()
    applyBionic()
    applySvgTheme()
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettings)
  } else {
    initSettings()
  }

  // Patch simulation config fetch on the fly if needed
  const originalFetch = window.fetch
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args)
    if (args[0] && typeof args[0] === "string" && args[0].includes("simulation_config.json")) {
      const clone = response.clone()
      try {
        const config = await clone.json()
        // Override with user settings
        config.temperature = settings.simTemp
        config.enabled = settings.simEnabled
        return new Response(JSON.stringify(config), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      } catch (e) {
        return response
      }
    }
    return response
  }
})()

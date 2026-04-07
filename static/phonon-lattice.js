/**
 * Phonon Lattice Physics Simulation
 * A high-performance 2D HTML5 Canvas simulation using Langevin dynamics.
 */

;(function () {
  if (window.__phononLatticeInitialized) return
  window.__phononLatticeInitialized = true

  // --- Global State & Configuration ---
  let canvas, ctx
  let N = 0 // Number of nodes
  let R, u, v // Float32Arrays: Rest positions, Displacements, Velocities
  let adj, deg // Uint16Array, Uint8Array: Adjacency list, Degrees

  let animationFrameId
  let lastTime = 0

  let mouseX = -1000,
    mouseY = -1000

  // Default configuration (will be merged with simulation_config.json if available)
  let config = {
    enabled: true,
    geometry: "triangular", // 'square', 'triangular', 'honeycomb'
    temperature: 0.1, // Thermal noise amplitude (T)
    acousticVelocity: 0.5, // Spring constant (K)
    phononLifetime: 0.08, // Damping coefficient (gamma)
    nodeSpacing: 40, // Base distance between nodes
    interactionRadius: 75, // Cursor interaction radius (sigma)
    interactionForce: 2.0, // Cursor repulsion strength (A)
    color: "#7b97aa", // Fallback color (should use css vars)
    opacityLight: 0.08, // Light mode opacity
    opacityDark: 0.08, // Dark mode opacity
  }

  // --- Initialization ---
  async function init() {
    try {
      const response = await fetch("/simulation_config.json?t=" + Date.now())
      if (response.ok) {
        const fetchedConfig = await response.json()
        Object.assign(config, fetchedConfig)
      }
    } catch (e) {
      // Silently fall back to defaults or CSS variables
    }

    if (!config.enabled) return

    setupCanvas()
    buildLattice()
    attachEvents()

    lastTime = performance.now()
    loop(lastTime)
  }

  function setupCanvas() {
    canvas = document.createElement("canvas")
    canvas.id = "phonon-lattice-canvas"
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      zIndex: "-1",
      pointerEvents: "none",
      opacity: config.opacityLight.toString(),
    })
    document.documentElement.appendChild(canvas)
    document.body.style.backgroundColor = "transparent"
    document.documentElement.style.backgroundColor = "var(--light)"
    ctx = canvas.getContext("2d", { alpha: true })
    resize()
  }

  function attachEvents() {
    window.addEventListener("resize", () => {
      resize()
      buildLattice()
    })

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    })

    document.addEventListener("mouseleave", () => {
      mouseX = -1000
      mouseY = -1000
    })

    document.addEventListener("readermodechange", (e) => {
      if (canvas) {
        canvas.style.display = e.detail.mode === "on" ? "none" : "block"
      }
    })
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.scale(dpr, dpr)
  }

  // --- Lattice Generation ---
  function buildLattice() {
    const w = window.innerWidth
    const h = window.innerHeight
    const spacing = config.nodeSpacing

    const cols = Math.ceil(w / spacing) + 2
    const rows = Math.ceil(h / spacing) + 2

    let tempPos = []

    if (config.geometry === "square") {
      for (let j = -1; j < rows; j++) {
        for (let i = -1; i < cols; i++) {
          tempPos.push({ x: i * spacing, y: j * spacing, i, j })
        }
      }
    } else if (config.geometry === "triangular" || config.geometry === "honeycomb") {
      const rowHeight = (spacing * Math.sqrt(3)) / 2
      for (let j = -1; j < rows + 1; j++) {
        for (let i = -1; i < cols; i++) {
          let x = i * spacing + (j % 2 === 0 ? 0 : spacing / 2)
          let y = j * rowHeight

          if (config.geometry === "honeycomb") {
            // Honeycomb is triangular with 1/3 of nodes removed
            if ((i + j) % 3 === 0) continue
          }
          tempPos.push({ x, y, i, j })
        }
      }
    }

    N = tempPos.length

    // Allocate flat TypedArrays
    R = new Float32Array(N * 2)
    u = new Float32Array(N * 2)
    v = new Float32Array(N * 2)
    adj = new Uint16Array(N * 6) // Max 6 neighbors
    deg = new Uint8Array(N)

    // Populate rest positions
    for (let idx = 0; idx < N; idx++) {
      R[idx * 2] = tempPos[idx].x
      R[idx * 2 + 1] = tempPos[idx].y
    }

    // Build adjacency list (O(N^2) spatial search, acceptable for setup)
    const threshold = spacing * 1.1 // Slightly larger than spacing
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = R[i * 2] - R[j * 2]
        let dy = R[i * 2 + 1] - R[j * 2 + 1]
        let dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 0.1 && dist < threshold) {
          if (deg[i] < 6 && deg[j] < 6) {
            adj[i * 6 + deg[i]] = j
            deg[i]++

            adj[j * 6 + deg[j]] = i
            deg[j]++
          }
        }
      }
    }
  }

  // --- Dynamics Integration ---
  function updatePhysics(dt) {
    // Semi-implicit Euler integration
    const K = config.acousticVelocity * 0.05 // Physical timescale scaling for stable pixel-space physics
    const gamma = Math.max(config.phononLifetime, 0.001) * 0.1 // Physical timescale scaling for damping
    const T = config.temperature

    // Fluctuation-dissipation theorem balance
    const safeDt = Math.max(dt, 0.001)
    const noiseAmplitude = Math.sqrt((2.0 * T * gamma) / safeDt) * 40.0

    const sigma2 = config.interactionRadius * config.interactionRadius
    const sigma2_inv_half = 1.0 / (2.0 * sigma2)
    const sigma2_cutoff = sigma2 * 4.0
    const A = config.interactionForce * 2.0 // Toned down for subtle ripples
    const MAX_VELOCITY = 50.0 // Velocity clamp
    const MAX_VELOCITY_SQ = MAX_VELOCITY * MAX_VELOCITY

    for (let i = 0; i < N; i++) {
      const idx2 = i * 2

      // Restoring force from neighbors (harmonic spring)
      let fx = 0
      let fy = 0

      const degree = deg[i]
      for (let n = 0; n < degree; n++) {
        const j = adj[i * 6 + n]
        const jdx2 = j * 2
        // relative displacement: (r_i - r_j) - (R_i - R_j) = u_i - u_j
        fx -= K * (u[idx2] - u[jdx2])
        fy -= K * (u[idx2 + 1] - u[jdx2 + 1])
      }

      // Structural integrity: weak absolute anchoring to prevent global drift
      fx -= K * 0.01 * u[idx2]
      fy -= K * 0.01 * u[idx2 + 1]

      // Damping
      fx -= gamma * v[idx2]
      fy -= gamma * v[idx2 + 1]

      // Brownian thermal noise (Langevin kick)
      fx += (Math.random() - 0.5) * noiseAmplitude
      fy += (Math.random() - 0.5) * noiseAmplitude

      // Cursor interaction
      if (mouseX > -100) {
        const currentX = R[idx2] + u[idx2]
        const currentY = R[idx2 + 1] + u[idx2 + 1]

        const dx = currentX - mouseX
        const dy = currentY - mouseY
        const distSq = dx * dx + dy * dy

        if (distSq < sigma2_cutoff) {
          // Cutoff for optimization
          const force = A * Math.exp(-distSq * sigma2_inv_half)
          const dist = Math.sqrt(distSq) || 1
          fx += force * (dx / dist)
          fy += force * (dy / dist)
        }
      }

      // Update velocity (mass = 1)
      v[idx2] += fx * dt
      v[idx2 + 1] += fy * dt

      // The clamp
      const speedSq = v[idx2] * v[idx2] + v[idx2 + 1] * v[idx2 + 1]
      if (speedSq > MAX_VELOCITY_SQ) {
        const speed = Math.sqrt(speedSq)
        v[idx2] = (v[idx2] / speed) * MAX_VELOCITY
        v[idx2 + 1] = (v[idx2 + 1] / speed) * MAX_VELOCITY
      }
    }

    // Update positions
    for (let i = 0; i < N; i++) {
      u[i * 2] += v[i * 2] * dt
      u[i * 2 + 1] += v[i * 2 + 1] * dt
    }
  }

  let cachedColor = ""
  let lastTheme = ""

  // --- Rendering ---
  function draw() {
    const w = window.innerWidth
    const h = window.innerHeight

    ctx.clearRect(0, 0, w, h)

    const currentTheme = document.documentElement.getAttribute("saved-theme") || "light"
    if (currentTheme !== lastTheme || !cachedColor) {
      lastTheme = currentTheme
      const computedStyle = getComputedStyle(document.body)
      cachedColor = computedStyle.getPropertyValue("--secondary").trim() || config.color
      // Ensure background is transparent on theme toggle
      document.body.style.backgroundColor = "transparent"
      document.documentElement.style.backgroundColor = "var(--light)"

      // Update canvas opacity based on the current theme
      canvas.style.opacity =
        currentTheme === "dark" ? config.opacityDark.toString() : config.opacityLight.toString()
    }

    // Use multiply blending in light mode for better contrast on white backgrounds
    ctx.globalCompositeOperation = currentTheme === "dark" ? "lighter" : "multiply"

    ctx.strokeStyle = cachedColor
    ctx.lineWidth = currentTheme === "dark" ? 0.3 : 0.8 // Thicker lines in light mode for visibility

    ctx.beginPath()

    // Draw lattice bonds
    for (let i = 0; i < N; i++) {
      const idx2 = i * 2
      const x1 = R[idx2] + u[idx2]
      const y1 = R[idx2 + 1] + u[idx2 + 1]

      // Optimization: Frustum culling
      if (x1 < -50 || x1 > w + 50 || y1 < -50 || y1 > h + 50) continue

      const degree = deg[i]
      for (let n = 0; n < degree; n++) {
        const j = adj[i * 6 + n]
        // Only draw one direction to prevent duplicate lines
        if (j > i) {
          const jdx2 = j * 2
          const x2 = R[jdx2] + u[jdx2]
          const y2 = R[jdx2 + 1] + u[jdx2 + 1]

          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
        }
      }
    }
    ctx.stroke()

    // Render micro-dots for nodes
    ctx.fillStyle = cachedColor
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const idx2 = i * 2
      const x1 = R[idx2] + u[idx2]
      const y1 = R[idx2 + 1] + u[idx2 + 1]

      if (x1 < -10 || x1 > w + 10 || y1 < -10 || y1 > h + 10) continue

      ctx.rect(x1 - 1, y1 - 1, 2, 2)
    }
    ctx.fill()
  }

  function loop(time) {
    // Re-attach canvas if SPA router stripped it
    if (!canvas.parentNode) {
      document.documentElement.appendChild(canvas)
      document.body.style.backgroundColor = "transparent"
      canvas.style.display =
        document.documentElement.getAttribute("reader-mode") === "on" ? "none" : "block"
    }

    const dt = Math.min((time - lastTime) / 16.666, 2.0) // Normalize to 60fps
    lastTime = time

    const subSteps = 4 // Reduced from 8 for drastically better CPU performance
    const subDt = dt / subSteps

    for (let step = 0; step < subSteps; step++) {
      updatePhysics(subDt)
    }

    draw()

    animationFrameId = requestAnimationFrame(loop)
  }

  // Trigger initialization once the DOM is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()

/**
 * Minimal Chrome DevTools Protocol client for driving the app in dev.
 *
 * Talks to the endpoint opened by TAILSPIN_CAPTURE=1 (see electron/main/index.ts)
 * over Node's built-in WebSocket, so no browser-automation dependency is needed.
 */
const TEXT_SELECTOR = "button, a, [role='tab'], [role='button'], li, div, span, h3";

export class Cdp {
  #socket;
  #nextId = 1;
  #pending = new Map();
  #listeners = new Map();

  static async attach({ port = 9222, timeoutMs = 30000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let target;

    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await response.json();
        target = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (target) break;
      } catch {
        // Electron not up yet.
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!target) throw new Error(`No page target on port ${port}. Is the app running with TAILSPIN_CAPTURE=1?`);

    const cdp = new Cdp();
    await cdp.#connect(target.webSocketDebuggerUrl);
    return cdp;
  }

  #connect(url) {
    return new Promise((resolve, reject) => {
      this.#socket = new WebSocket(url);
      this.#socket.addEventListener("open", () => resolve());
      this.#socket.addEventListener("error", (e) => reject(new Error(`CDP socket error: ${e.message ?? e.type}`)));
      this.#socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id && this.#pending.has(message.id)) {
          const { resolve: done, reject: fail } = this.#pending.get(message.id);
          this.#pending.delete(message.id);
          message.error ? fail(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? {})})`)) : done(message.result);
        } else if (message.method) {
          for (const handler of this.#listeners.get(message.method) ?? []) handler(message.params);
        }
      });
    });
  }

  send(method, params = {}) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.#listeners.has(method)) this.#listeners.set(method, []);
    this.#listeners.get(method).push(handler);
  }

  close() {
    this.#socket.close();
  }

  // --- convenience wrappers -------------------------------------------------

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  /**
   * Size of the renderer viewport in CSS pixels. Deliberately not emulated:
   * Emulation.setDeviceMetricsOverride moves layout coordinates out of step
   * with the coordinate space Input.dispatchMouseEvent uses, so clicks land in
   * the wrong place. The window is sized by the main process instead (see
   * TAILSPIN_CAPTURE in electron/main/index.ts).
   */
  viewportSize() {
    return this.evaluate(`return { width: window.innerWidth, height: window.innerHeight };`);
  }

  /** Centre of the first element matching `selector`, in CSS pixels. */
  centreOf(selector) {
    return this.evaluate(`
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    `);
  }

  /** Centre of the smallest visible element whose text matches `text`. */
  centreOfText(text, selector = TEXT_SELECTOR) {
    return this.evaluate(`
      const wanted = ${JSON.stringify(text)}.toLowerCase();
      const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .filter((el) => (el.innerText ?? '').trim().toLowerCase().includes(wanted))
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
        .sort((a, b) => (a.innerText ?? '').length - (b.innerText ?? '').length);
      const el = nodes[0];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    `);
  }

  // Clicks are dispatched in the page rather than as synthetic mouse input:
  // Input.dispatchMouseEvent depends on the window being frontmost and
  // unoccluded, which it isn't while a terminal is driving it, and events then
  // silently miss their target.
  async click(selector, { timeoutMs = 10000 } = {}) {
    await this.waitForSelector(selector, { timeoutMs });
    await this.evaluate(`
      document.querySelector(${JSON.stringify(selector)}).click();
      return true;
    `);
  }

  async clickText(text, { timeoutMs = 10000, selector = TEXT_SELECTOR } = {}) {
    await this.waitFor(() => this.centreOfText(text, selector), { timeoutMs, what: `text "${text}"` });
    await this.evaluate(`
      const wanted = ${JSON.stringify(text)}.toLowerCase();
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .filter((e) => (e.innerText ?? '').trim().toLowerCase().includes(wanted))
        .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
        .sort((a, b) => (a.innerText ?? '').length - (b.innerText ?? '').length)[0];
      el.click();
      return true;
    `);
  }

  /**
   * Zero out CSS transitions and animations. Vue's <Transition> waits for a
   * transitionend that an occluded window never fires, which leaves pages stuck
   * half-swapped; with a zero duration Vue completes the swap synchronously.
   */
  async disableAnimations() {
    await this.evaluate(`
      if (!document.getElementById('capture-no-animations')) {
        const style = document.createElement('style');
        style.id = 'capture-no-animations';
        style.textContent = '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; animation-delay: 0s !important; }';
        document.head.appendChild(style);
      }
      return true;
    `);
  }

  async type(text) {
    await this.send("Input.insertText", { text });
  }

  /** Sends a key with optional modifiers, e.g. press("k", { meta: true }). */
  async press(key, { meta = false, ctrl = false, shift = false, alt = false, code, virtualKeyCode } = {}) {
    const modifiers = (alt ? 1 : 0) | (ctrl ? 2 : 0) | (meta ? 4 : 0) | (shift ? 8 : 0);
    const shared = {
      key,
      code: code ?? (key.length === 1 ? `Key${key.toUpperCase()}` : key),
      windowsVirtualKeyCode: virtualKeyCode ?? (key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined),
      modifiers,
    };
    await this.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...shared });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...shared });
  }

  /** Applies a theme the way useUserStore does, without a reload. */
  async setTheme(theme) {
    await this.evaluate(`
      window.localStorage.setItem('theme', ${JSON.stringify(theme)});
      document.documentElement.classList.toggle('dark', ${JSON.stringify(theme)} === 'dark');
      return true;
    `);
  }

  async waitFor(probe, { timeoutMs = 10000, intervalMs = 120, what = "condition" } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = await probe();
      if (value) return value;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for ${what}`);
  }

  waitForSelector(selector, options) {
    return this.waitFor(() => this.evaluate(`return !!document.querySelector(${JSON.stringify(selector)});`), {
      what: selector,
      ...options,
    });
  }

  /**
   * `density` is the pixel ratio of the output image (2 = retina). The clip
   * scale multiplies the window's own device pixel ratio, so it is divided out
   * to keep captures the same size on retina and non-retina displays.
   */
  async screenshot({ density = 2 } = {}) {
    const { width, height, dpr } = await this.evaluate(`
      return { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio };
    `);
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      clip: { x: 0, y: 0, width, height, scale: density / dpr },
    });
    return Buffer.from(data, "base64");
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

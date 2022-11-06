import '/node_modules/vite/dist/client/env.mjs';

// set :host styles to make playwright detect the element as visible
const template = /*html*/ `
<style>
:host {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99999;
  --monospace: 'SFMono-Regular', Consolas,
  'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;

  --window-background: #181818;
  --window-color: #d8d8d8;
}

.backdrop {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
}

.window {
  font-family: var(--monospace);
  line-height: 1.5;
  width: 800px;
  color: var(--window-color);
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: var(--window-background);
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
  direction: ltr;
  text-align: left;
}

pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}

pre::-webkit-scrollbar {
  display: none;
}

.message {
  line-height: 1.3;
  font-weight: 600;
  white-space: pre-wrap;
}

.message-body {
  color: var(--red);
}

.plugin {
  color: var(--purple);
}

.file {
  color: var(--cyan);
  margin-bottom: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--yellow);
}

.stack {
  font-size: 13px;
  color: var(--dim);
}

.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
}

code {
  font-size: 13px;
  font-family: var(--monospace);
  color: var(--yellow);
}

.file-link {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class="backdrop" part="backdrop">
  <div class="window" part="window">
    <pre class="message" part="message"><span class="plugin"></span><span class="message-body"></span></pre>
    <pre class="file" part="file"></pre>
    <pre class="frame" part="frame"></pre>
    <pre class="stack" part="stack"></pre>
    <div class="tip" part="tip">
      Click outside or fix the code to dismiss.<br>
      You can also disable this overlay by setting
      <code>server.hmr.overlay</code> to <code>false</code> in <code>vite.config.js.</code>
    </div>
  </div>
</div>
`;
const fileRE = /(?:[a-zA-Z]:\\|\/).*?:\d+:\d+/g;
const codeframeRE = /^(?:>?\s+\d+\s+\|.*|\s+\|\s*\^.*)\r?\n/gm;
// Allow `ErrorOverlay` to extend `HTMLElement` even in environments where
// `HTMLElement` was not originally defined.
const { HTMLElement = class {
} } = globalThis;
class ErrorOverlay extends HTMLElement {
    constructor(err, links = true) {
        var _a;
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = template;
        codeframeRE.lastIndex = 0;
        const hasFrame = err.frame && codeframeRE.test(err.frame);
        const message = hasFrame
            ? err.message.replace(codeframeRE, '')
            : err.message;
        if (err.plugin) {
            this.text('.plugin', `[plugin:${err.plugin}] `);
        }
        this.text('.message-body', message.trim());
        const [file] = (((_a = err.loc) === null || _a === void 0 ? void 0 : _a.file) || err.id || 'unknown file').split(`?`);
        if (err.loc) {
            this.text('.file', `${file}:${err.loc.line}:${err.loc.column}`, links);
        }
        else if (err.id) {
            this.text('.file', file);
        }
        if (hasFrame) {
            this.text('.frame', err.frame.trim());
        }
        this.text('.stack', err.stack, links);
        this.root.querySelector('.window').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        this.addEventListener('click', () => {
            this.close();
        });
    }
    text(selector, text, linkFiles = false) {
        const el = this.root.querySelector(selector);
        if (!linkFiles) {
            el.textContent = text;
        }
        else {
            let curIndex = 0;
            let match;
            while ((match = fileRE.exec(text))) {
                const { 0: file, index } = match;
                if (index != null) {
                    const frag = text.slice(curIndex, index);
                    el.appendChild(document.createTextNode(frag));
                    const link = document.createElement('a');
                    link.textContent = file;
                    link.className = 'file-link';
                    link.onclick = () => {
                        fetch('/__open-in-editor?file=' + encodeURIComponent(file));
                    };
                    el.appendChild(link);
                    curIndex += frag.length + file.length;
                }
            }
        }
    }
    close() {
        var _a;
        (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this);
    }
}
const overlayId = 'vite-error-overlay';
const { customElements } = globalThis; // Ensure `customElements` is defined before the next line.
if (customElements && !customElements.get(overlayId)) {
    customElements.define(overlayId, ErrorOverlay);
}

console.debug('[vite] connecting...');
const importMetaUrl = new URL(import.meta.url);
// use server configuration, then fallback to inference
const serverHost = "localhost:5173/";
const socketProtocol = null || (location.protocol === 'https:' ? 'wss' : 'ws');
const hmrPort = null;
const socketHost = `${null || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}${"/"}`;
const directSocketHost = "localhost:5173/";
const base = "/" || '/';
const messageBuffer = [];
let socket;
try {
    let fallback;
    // only use fallback when port is inferred to prevent confusion
    if (!hmrPort) {
        fallback = () => {
            // fallback to connecting directly to the hmr server
            // for servers which does not support proxying websocket
            socket = setupWebSocket(socketProtocol, directSocketHost, () => {
                const currentScriptHostURL = new URL(import.meta.url);
                const currentScriptHost = currentScriptHostURL.host +
                    currentScriptHostURL.pathname.replace(/@vite\/client$/, '');
                console.error('[vite] failed to connect to websocket.\n' +
                    'your current setup:\n' +
                    `  (browser) ${currentScriptHost} <--[HTTP]--> ${serverHost} (server)\n` +
                    `  (browser) ${socketHost} <--[WebSocket (failing)]--> ${directSocketHost} (server)\n` +
                    'Check out your Vite / network configuration and https://vitejs.dev/config/server-options.html#server-hmr .');
            });
            socket.addEventListener('open', () => {
                console.info('[vite] Direct websocket connection fallback. Check out https://vitejs.dev/config/server-options.html#server-hmr to remove the previous connection error.');
            }, { once: true });
        };
    }
    socket = setupWebSocket(socketProtocol, socketHost, fallback);
}
catch (error) {
    console.error(`[vite] failed to connect to websocket (${error}). `);
}
function setupWebSocket(protocol, hostAndPath, onCloseWithoutOpen) {
    const socket = new WebSocket(`${protocol}://${hostAndPath}`, 'vite-hmr');
    let isOpened = false;
    socket.addEventListener('open', () => {
        isOpened = true;
    }, { once: true });
    // Listen for messages
    socket.addEventListener('message', async ({ data }) => {
        handleMessage(JSON.parse(data));
    });
    // ping server
    socket.addEventListener('close', async ({ wasClean }) => {
        if (wasClean)
            return;
        if (!isOpened && onCloseWithoutOpen) {
            onCloseWithoutOpen();
            return;
        }
        console.log(`[vite] server connection lost. polling for restart...`);
        await waitForSuccessfulPing(protocol, hostAndPath);
        location.reload();
    });
    return socket;
}
function warnFailedFetch(err, path) {
    if (!err.message.match('fetch')) {
        console.error(err);
    }
    console.error(`[hmr] Failed to reload ${path}. ` +
        `This could be due to syntax errors or importing non-existent ` +
        `modules. (see errors above)`);
}
function cleanUrl(pathname) {
    const url = new URL(pathname, location.toString());
    url.searchParams.delete('direct');
    return url.pathname + url.search;
}
let isFirstUpdate = true;
const outdatedLinkTags = new WeakSet();
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.debug(`[vite] connected.`);
            sendMessageBuffer();
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => {
                if (socket.readyState === socket.OPEN) {
                    socket.send('{"type":"ping"}');
                }
            }, 30000);
            break;
        case 'update':
            notifyListeners('vite:beforeUpdate', payload);
            // if this is the first update and there's already an error overlay, it
            // means the page opened with existing server compile error and the whole
            // module script failed to load (since one of the nested imports is 500).
            // in this case a normal update won't work and a full reload is needed.
            if (isFirstUpdate && hasErrorOverlay()) {
                window.location.reload();
                return;
            }
            else {
                clearErrorOverlay();
                isFirstUpdate = false;
            }
            payload.updates.forEach((update) => {
                if (update.type === 'js-update') {
                    queueUpdate(fetchUpdate(update));
                }
                else {
                    // css-update
                    // this is only sent when a css file referenced with <link> is updated
                    const { path, timestamp } = update;
                    const searchUrl = cleanUrl(path);
                    // can't use querySelector with `[href*=]` here since the link may be
                    // using relative paths so we need to use link.href to grab the full
                    // URL for the include check.
                    const el = Array.from(document.querySelectorAll('link')).find((e) => !outdatedLinkTags.has(e) && cleanUrl(e.href).includes(searchUrl));
                    if (el) {
                        const newPath = `${base}${searchUrl.slice(1)}${searchUrl.includes('?') ? '&' : '?'}t=${timestamp}`;
                        // rather than swapping the href on the existing tag, we will
                        // create a new link tag. Once the new stylesheet has loaded we
                        // will remove the existing link tag. This removes a Flash Of
                        // Unstyled Content that can occur when swapping out the tag href
                        // directly, as the new stylesheet has not yet been loaded.
                        const newLinkTag = el.cloneNode();
                        newLinkTag.href = new URL(newPath, el.href).href;
                        const removeOldEl = () => el.remove();
                        newLinkTag.addEventListener('load', removeOldEl);
                        newLinkTag.addEventListener('error', removeOldEl);
                        outdatedLinkTags.add(el);
                        el.after(newLinkTag);
                    }
                    console.debug(`[vite] css hot updated: ${searchUrl}`);
                }
            });
            break;
        case 'custom': {
            notifyListeners(payload.event, payload.data);
            break;
        }
        case 'full-reload':
            notifyListeners('vite:beforeFullReload', payload);
            if (payload.path && payload.path.endsWith('.html')) {
                // if html file is edited, only reload the page if the browser is
                // currently on that page.
                const pagePath = decodeURI(location.pathname);
                const payloadPath = base + payload.path.slice(1);
                if (pagePath === payloadPath ||
                    payload.path === '/index.html' ||
                    (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)) {
                    location.reload();
                }
                return;
            }
            else {
                location.reload();
            }
            break;
        case 'prune':
            notifyListeners('vite:beforePrune', payload);
            // After an HMR update, some modules are no longer imported on the page
            // but they may have left behind side effects that need to be cleaned up
            // (.e.g style injections)
            // TODO Trigger their dispose callbacks.
            payload.paths.forEach((path) => {
                const fn = pruneMap.get(path);
                if (fn) {
                    fn(dataMap.get(path));
                }
            });
            break;
        case 'error': {
            notifyListeners('vite:error', payload);
            const err = payload.err;
            if (enableOverlay) {
                createErrorOverlay(err);
            }
            else {
                console.error(`[vite] Internal Server Error\n${err.message}\n${err.stack}`);
            }
            break;
        }
        default: {
            const check = payload;
            return check;
        }
    }
}
function notifyListeners(event, data) {
    const cbs = customListenersMap.get(event);
    if (cbs) {
        cbs.forEach((cb) => cb(data));
    }
}
const enableOverlay = true;
function createErrorOverlay(err) {
    if (!enableOverlay)
        return;
    clearErrorOverlay();
    document.body.appendChild(new ErrorOverlay(err));
}
function clearErrorOverlay() {
    document
        .querySelectorAll(overlayId)
        .forEach((n) => n.close());
}
function hasErrorOverlay() {
    return document.querySelectorAll(overlayId).length;
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
    queued.push(p);
    if (!pending) {
        pending = true;
        await Promise.resolve();
        pending = false;
        const loading = [...queued];
        queued = [];
        (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
}
async function waitForSuccessfulPing(socketProtocol, hostAndPath, ms = 1000) {
    const pingHostProtocol = socketProtocol === 'wss' ? 'https' : 'http';
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            // A fetch on a websocket URL will return a successful promise with status 400,
            // but will reject a networking error.
            // When running on middleware mode, it returns status 426, and an cors error happens if mode is not no-cors
            await fetch(`${pingHostProtocol}://${hostAndPath}`, {
                mode: 'no-cors'
            });
            break;
        }
        catch (e) {
            // wait ms before attempting to ping again
            await new Promise((resolve) => setTimeout(resolve, ms));
        }
    }
}
const sheetsMap = new Map();
function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    {
        if (style && !(style instanceof HTMLStyleElement)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.setAttribute('data-vite-dev-id', id);
            style.innerHTML = content;
            document.head.appendChild(style);
        }
        else {
            style.innerHTML = content;
        }
    }
    sheetsMap.set(id, style);
}
function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        if (style instanceof CSSStyleSheet) {
            // @ts-expect-error: using experimental API
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
        }
        else {
            document.head.removeChild(style);
        }
        sheetsMap.delete(id);
    }
}
async function fetchUpdate({ path, acceptedPath, timestamp, explicitImportRequired }) {
    const mod = hotModulesMap.get(path);
    if (!mod) {
        // In a code-splitting project,
        // it is common that the hot-updating module is not loaded yet.
        // https://github.com/vitejs/vite/issues/721
        return;
    }
    const moduleMap = new Map();
    const isSelfUpdate = path === acceptedPath;
    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => deps.includes(acceptedPath));
    if (isSelfUpdate || qualifiedCallbacks.length > 0) {
        const dep = acceptedPath;
        const disposer = disposeMap.get(dep);
        if (disposer)
            await disposer(dataMap.get(dep));
        const [path, query] = dep.split(`?`);
        try {
            const newMod = await import(
            /* @vite-ignore */
            base +
                path.slice(1) +
                `?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${query ? `&${query}` : ''}`);
            moduleMap.set(dep, newMod);
        }
        catch (e) {
            warnFailedFetch(e, dep);
        }
    }
    return () => {
        for (const { deps, fn } of qualifiedCallbacks) {
            fn(deps.map((dep) => moduleMap.get(dep)));
        }
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        console.debug(`[vite] hot updated: ${loggedPath}`);
    };
}
function sendMessageBuffer() {
    if (socket.readyState === 1) {
        messageBuffer.forEach((msg) => socket.send(msg));
        messageBuffer.length = 0;
    }
}
const hotModulesMap = new Map();
const disposeMap = new Map();
const pruneMap = new Map();
const dataMap = new Map();
const customListenersMap = new Map();
const ctxToListenersMap = new Map();
function createHotContext(ownerPath) {
    if (!dataMap.has(ownerPath)) {
        dataMap.set(ownerPath, {});
    }
    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }
    // clear stale custom event listeners
    const staleListeners = ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
        for (const [event, staleFns] of staleListeners) {
            const listeners = customListenersMap.get(event);
            if (listeners) {
                customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
            }
        }
    }
    const newListeners = new Map();
    ctxToListenersMap.set(ownerPath, newListeners);
    function acceptDeps(deps, callback = () => { }) {
        const mod = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: []
        };
        mod.callbacks.push({
            deps,
            fn: callback
        });
        hotModulesMap.set(ownerPath, mod);
    }
    const hot = {
        get data() {
            return dataMap.get(ownerPath);
        },
        accept(deps, callback) {
            if (typeof deps === 'function' || !deps) {
                // self-accept: hot.accept(() => {})
                acceptDeps([ownerPath], ([mod]) => deps && deps(mod));
            }
            else if (typeof deps === 'string') {
                // explicit deps
                acceptDeps([deps], ([mod]) => callback && callback(mod));
            }
            else if (Array.isArray(deps)) {
                acceptDeps(deps, callback);
            }
            else {
                throw new Error(`invalid hot.accept() usage.`);
            }
        },
        // export names (first arg) are irrelevant on the client side, they're
        // extracted in the server for propagation
        acceptExports(_, callback) {
            acceptDeps([ownerPath], callback && (([mod]) => callback(mod)));
        },
        dispose(cb) {
            disposeMap.set(ownerPath, cb);
        },
        // @ts-expect-error untyped
        prune(cb) {
            pruneMap.set(ownerPath, cb);
        },
        // TODO
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        decline() { },
        // tell the server to re-perform hmr propagation from this module as root
        invalidate() {
            notifyListeners('vite:invalidate', { path: ownerPath });
            this.send('vite:invalidate', { path: ownerPath });
        },
        // custom events
        on(event, cb) {
            const addToMap = (map) => {
                const existing = map.get(event) || [];
                existing.push(cb);
                map.set(event, existing);
            };
            addToMap(customListenersMap);
            addToMap(newListeners);
        },
        send(event, data) {
            messageBuffer.push(JSON.stringify({ type: 'custom', event, data }));
            sendMessageBuffer();
        }
    };
    return hot;
}
/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    // skip urls that won't be handled by vite
    if (!url.startsWith('.') && !url.startsWith('/')) {
        return url;
    }
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    const { search, hash } = new URL(url, 'http://vitejs.dev');
    return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''}`;
}

export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
                                   

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50Lm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NsaWVudC9vdmVybGF5LnRzIiwiLi4vLi4vc3JjL2NsaWVudC9jbGllbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQgfSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuXG4vLyBzZXQgOmhvc3Qgc3R5bGVzIHRvIG1ha2UgcGxheXdyaWdodCBkZXRlY3QgdGhlIGVsZW1lbnQgYXMgdmlzaWJsZVxuY29uc3QgdGVtcGxhdGUgPSAvKmh0bWwqLyBgXG48c3R5bGU+XG46aG9zdCB7XG4gIHBvc2l0aW9uOiBmaXhlZDtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICB6LWluZGV4OiA5OTk5OTtcbiAgLS1tb25vc3BhY2U6ICdTRk1vbm8tUmVndWxhcicsIENvbnNvbGFzLFxuICAnTGliZXJhdGlvbiBNb25vJywgTWVubG8sIENvdXJpZXIsIG1vbm9zcGFjZTtcbiAgLS1yZWQ6ICNmZjU1NTU7XG4gIC0teWVsbG93OiAjZTJhYTUzO1xuICAtLXB1cnBsZTogI2NmYTRmZjtcbiAgLS1jeWFuOiAjMmRkOWRhO1xuICAtLWRpbTogI2M5YzljOTtcblxuICAtLXdpbmRvdy1iYWNrZ3JvdW5kOiAjMTgxODE4O1xuICAtLXdpbmRvdy1jb2xvcjogI2Q4ZDhkODtcbn1cblxuLmJhY2tkcm9wIHtcbiAgcG9zaXRpb246IGZpeGVkO1xuICB6LWluZGV4OiA5OTk5OTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICBvdmVyZmxvdy15OiBzY3JvbGw7XG4gIG1hcmdpbjogMDtcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjY2KTtcbn1cblxuLndpbmRvdyB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBsaW5lLWhlaWdodDogMS41O1xuICB3aWR0aDogODAwcHg7XG4gIGNvbG9yOiB2YXIoLS13aW5kb3ctY29sb3IpO1xuICBtYXJnaW46IDMwcHggYXV0bztcbiAgcGFkZGluZzogMjVweCA0MHB4O1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGJhY2tncm91bmQ6IHZhcigtLXdpbmRvdy1iYWNrZ3JvdW5kKTtcbiAgYm9yZGVyLXJhZGl1czogNnB4IDZweCA4cHggOHB4O1xuICBib3gtc2hhZG93OiAwIDE5cHggMzhweCByZ2JhKDAsMCwwLDAuMzApLCAwIDE1cHggMTJweCByZ2JhKDAsMCwwLDAuMjIpO1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBib3JkZXItdG9wOiA4cHggc29saWQgdmFyKC0tcmVkKTtcbiAgZGlyZWN0aW9uOiBsdHI7XG4gIHRleHQtYWxpZ246IGxlZnQ7XG59XG5cbnByZSB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBmb250LXNpemU6IDE2cHg7XG4gIG1hcmdpbi10b3A6IDA7XG4gIG1hcmdpbi1ib3R0b206IDFlbTtcbiAgb3ZlcmZsb3cteDogc2Nyb2xsO1xuICBzY3JvbGxiYXItd2lkdGg6IG5vbmU7XG59XG5cbnByZTo6LXdlYmtpdC1zY3JvbGxiYXIge1xuICBkaXNwbGF5OiBub25lO1xufVxuXG4ubWVzc2FnZSB7XG4gIGxpbmUtaGVpZ2h0OiAxLjM7XG4gIGZvbnQtd2VpZ2h0OiA2MDA7XG4gIHdoaXRlLXNwYWNlOiBwcmUtd3JhcDtcbn1cblxuLm1lc3NhZ2UtYm9keSB7XG4gIGNvbG9yOiB2YXIoLS1yZWQpO1xufVxuXG4ucGx1Z2luIHtcbiAgY29sb3I6IHZhcigtLXB1cnBsZSk7XG59XG5cbi5maWxlIHtcbiAgY29sb3I6IHZhcigtLWN5YW4pO1xuICBtYXJnaW4tYm90dG9tOiAwO1xuICB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XG4gIHdvcmQtYnJlYWs6IGJyZWFrLWFsbDtcbn1cblxuLmZyYW1lIHtcbiAgY29sb3I6IHZhcigtLXllbGxvdyk7XG59XG5cbi5zdGFjayB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgY29sb3I6IHZhcigtLWRpbSk7XG59XG5cbi50aXAge1xuICBmb250LXNpemU6IDEzcHg7XG4gIGNvbG9yOiAjOTk5O1xuICBib3JkZXItdG9wOiAxcHggZG90dGVkICM5OTk7XG4gIHBhZGRpbmctdG9wOiAxM3B4O1xufVxuXG5jb2RlIHtcbiAgZm9udC1zaXplOiAxM3B4O1xuICBmb250LWZhbWlseTogdmFyKC0tbW9ub3NwYWNlKTtcbiAgY29sb3I6IHZhcigtLXllbGxvdyk7XG59XG5cbi5maWxlLWxpbmsge1xuICB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbiAgY3Vyc29yOiBwb2ludGVyO1xufVxuPC9zdHlsZT5cbjxkaXYgY2xhc3M9XCJiYWNrZHJvcFwiIHBhcnQ9XCJiYWNrZHJvcFwiPlxuICA8ZGl2IGNsYXNzPVwid2luZG93XCIgcGFydD1cIndpbmRvd1wiPlxuICAgIDxwcmUgY2xhc3M9XCJtZXNzYWdlXCIgcGFydD1cIm1lc3NhZ2VcIj48c3BhbiBjbGFzcz1cInBsdWdpblwiPjwvc3Bhbj48c3BhbiBjbGFzcz1cIm1lc3NhZ2UtYm9keVwiPjwvc3Bhbj48L3ByZT5cbiAgICA8cHJlIGNsYXNzPVwiZmlsZVwiIHBhcnQ9XCJmaWxlXCI+PC9wcmU+XG4gICAgPHByZSBjbGFzcz1cImZyYW1lXCIgcGFydD1cImZyYW1lXCI+PC9wcmU+XG4gICAgPHByZSBjbGFzcz1cInN0YWNrXCIgcGFydD1cInN0YWNrXCI+PC9wcmU+XG4gICAgPGRpdiBjbGFzcz1cInRpcFwiIHBhcnQ9XCJ0aXBcIj5cbiAgICAgIENsaWNrIG91dHNpZGUgb3IgZml4IHRoZSBjb2RlIHRvIGRpc21pc3MuPGJyPlxuICAgICAgWW91IGNhbiBhbHNvIGRpc2FibGUgdGhpcyBvdmVybGF5IGJ5IHNldHRpbmdcbiAgICAgIDxjb2RlPnNlcnZlci5obXIub3ZlcmxheTwvY29kZT4gdG8gPGNvZGU+ZmFsc2U8L2NvZGU+IGluIDxjb2RlPnZpdGUuY29uZmlnLmpzLjwvY29kZT5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2Rpdj5cbmBcblxuY29uc3QgZmlsZVJFID0gLyg/OlthLXpBLVpdOlxcXFx8XFwvKS4qPzpcXGQrOlxcZCsvZ1xuY29uc3QgY29kZWZyYW1lUkUgPSAvXig/Oj4/XFxzK1xcZCtcXHMrXFx8Lip8XFxzK1xcfFxccypcXF4uKilcXHI/XFxuL2dtXG5cbi8vIEFsbG93IGBFcnJvck92ZXJsYXlgIHRvIGV4dGVuZCBgSFRNTEVsZW1lbnRgIGV2ZW4gaW4gZW52aXJvbm1lbnRzIHdoZXJlXG4vLyBgSFRNTEVsZW1lbnRgIHdhcyBub3Qgb3JpZ2luYWxseSBkZWZpbmVkLlxuY29uc3QgeyBIVE1MRWxlbWVudCA9IGNsYXNzIHt9IGFzIHR5cGVvZiBnbG9iYWxUaGlzLkhUTUxFbGVtZW50IH0gPSBnbG9iYWxUaGlzXG5leHBvcnQgY2xhc3MgRXJyb3JPdmVybGF5IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICByb290OiBTaGFkb3dSb290XG5cbiAgY29uc3RydWN0b3IoZXJyOiBFcnJvclBheWxvYWRbJ2VyciddLCBsaW5rcyA9IHRydWUpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5yb290ID0gdGhpcy5hdHRhY2hTaGFkb3coeyBtb2RlOiAnb3BlbicgfSlcbiAgICB0aGlzLnJvb3QuaW5uZXJIVE1MID0gdGVtcGxhdGVcblxuICAgIGNvZGVmcmFtZVJFLmxhc3RJbmRleCA9IDBcbiAgICBjb25zdCBoYXNGcmFtZSA9IGVyci5mcmFtZSAmJiBjb2RlZnJhbWVSRS50ZXN0KGVyci5mcmFtZSlcbiAgICBjb25zdCBtZXNzYWdlID0gaGFzRnJhbWVcbiAgICAgID8gZXJyLm1lc3NhZ2UucmVwbGFjZShjb2RlZnJhbWVSRSwgJycpXG4gICAgICA6IGVyci5tZXNzYWdlXG4gICAgaWYgKGVyci5wbHVnaW4pIHtcbiAgICAgIHRoaXMudGV4dCgnLnBsdWdpbicsIGBbcGx1Z2luOiR7ZXJyLnBsdWdpbn1dIGApXG4gICAgfVxuICAgIHRoaXMudGV4dCgnLm1lc3NhZ2UtYm9keScsIG1lc3NhZ2UudHJpbSgpKVxuXG4gICAgY29uc3QgW2ZpbGVdID0gKGVyci5sb2M/LmZpbGUgfHwgZXJyLmlkIHx8ICd1bmtub3duIGZpbGUnKS5zcGxpdChgP2ApXG4gICAgaWYgKGVyci5sb2MpIHtcbiAgICAgIHRoaXMudGV4dCgnLmZpbGUnLCBgJHtmaWxlfToke2Vyci5sb2MubGluZX06JHtlcnIubG9jLmNvbHVtbn1gLCBsaW5rcylcbiAgICB9IGVsc2UgaWYgKGVyci5pZCkge1xuICAgICAgdGhpcy50ZXh0KCcuZmlsZScsIGZpbGUpXG4gICAgfVxuXG4gICAgaWYgKGhhc0ZyYW1lKSB7XG4gICAgICB0aGlzLnRleHQoJy5mcmFtZScsIGVyci5mcmFtZSEudHJpbSgpKVxuICAgIH1cbiAgICB0aGlzLnRleHQoJy5zdGFjaycsIGVyci5zdGFjaywgbGlua3MpXG5cbiAgICB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcignLndpbmRvdycpIS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfSlcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5jbG9zZSgpXG4gICAgfSlcbiAgfVxuXG4gIHRleHQoc2VsZWN0b3I6IHN0cmluZywgdGV4dDogc3RyaW5nLCBsaW5rRmlsZXMgPSBmYWxzZSk6IHZvaWQge1xuICAgIGNvbnN0IGVsID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpIVxuICAgIGlmICghbGlua0ZpbGVzKSB7XG4gICAgICBlbC50ZXh0Q29udGVudCA9IHRleHRcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGN1ckluZGV4ID0gMFxuICAgICAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsXG4gICAgICB3aGlsZSAoKG1hdGNoID0gZmlsZVJFLmV4ZWModGV4dCkpKSB7XG4gICAgICAgIGNvbnN0IHsgMDogZmlsZSwgaW5kZXggfSA9IG1hdGNoXG4gICAgICAgIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgZnJhZyA9IHRleHQuc2xpY2UoY3VySW5kZXgsIGluZGV4KVxuICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGZyYWcpKVxuICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcbiAgICAgICAgICBsaW5rLnRleHRDb250ZW50ID0gZmlsZVxuICAgICAgICAgIGxpbmsuY2xhc3NOYW1lID0gJ2ZpbGUtbGluaydcbiAgICAgICAgICBsaW5rLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICBmZXRjaCgnL19fb3Blbi1pbi1lZGl0b3I/ZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUpKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbC5hcHBlbmRDaGlsZChsaW5rKVxuICAgICAgICAgIGN1ckluZGV4ICs9IGZyYWcubGVuZ3RoICsgZmlsZS5sZW5ndGhcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMucGFyZW50Tm9kZT8ucmVtb3ZlQ2hpbGQodGhpcylcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgb3ZlcmxheUlkID0gJ3ZpdGUtZXJyb3Itb3ZlcmxheSdcbmNvbnN0IHsgY3VzdG9tRWxlbWVudHMgfSA9IGdsb2JhbFRoaXMgLy8gRW5zdXJlIGBjdXN0b21FbGVtZW50c2AgaXMgZGVmaW5lZCBiZWZvcmUgdGhlIG5leHQgbGluZS5cbmlmIChjdXN0b21FbGVtZW50cyAmJiAhY3VzdG9tRWxlbWVudHMuZ2V0KG92ZXJsYXlJZCkpIHtcbiAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKG92ZXJsYXlJZCwgRXJyb3JPdmVybGF5KVxufVxuIiwiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQsIEhNUlBheWxvYWQsIFVwZGF0ZSB9IGZyb20gJ3R5cGVzL2htclBheWxvYWQnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZU5hbWVzcGFjZSwgVml0ZUhvdENvbnRleHQgfSBmcm9tICd0eXBlcy9ob3QnXG5pbXBvcnQgdHlwZSB7IEluZmVyQ3VzdG9tRXZlbnRQYXlsb2FkIH0gZnJvbSAndHlwZXMvY3VzdG9tRXZlbnQnXG5pbXBvcnQgeyBFcnJvck92ZXJsYXksIG92ZXJsYXlJZCB9IGZyb20gJy4vb3ZlcmxheSdcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBub2RlL25vLW1pc3NpbmctaW1wb3J0XG5pbXBvcnQgJ0B2aXRlL2VudidcblxuLy8gaW5qZWN0ZWQgYnkgdGhlIGhtciBwbHVnaW4gd2hlbiBzZXJ2ZWRcbmRlY2xhcmUgY29uc3QgX19CQVNFX186IHN0cmluZ1xuZGVjbGFyZSBjb25zdCBfX1NFUlZFUl9IT1NUX186IHN0cmluZ1xuZGVjbGFyZSBjb25zdCBfX0hNUl9QUk9UT0NPTF9fOiBzdHJpbmcgfCBudWxsXG5kZWNsYXJlIGNvbnN0IF9fSE1SX0hPU1ROQU1FX186IHN0cmluZyB8IG51bGxcbmRlY2xhcmUgY29uc3QgX19ITVJfUE9SVF9fOiBudW1iZXIgfCBudWxsXG5kZWNsYXJlIGNvbnN0IF9fSE1SX0RJUkVDVF9UQVJHRVRfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX0JBU0VfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX1RJTUVPVVRfXzogbnVtYmVyXG5kZWNsYXJlIGNvbnN0IF9fSE1SX0VOQUJMRV9PVkVSTEFZX186IGJvb2xlYW5cblxuY29uc29sZS5kZWJ1ZygnW3ZpdGVdIGNvbm5lY3RpbmcuLi4nKVxuXG5jb25zdCBpbXBvcnRNZXRhVXJsID0gbmV3IFVSTChpbXBvcnQubWV0YS51cmwpXG5cbi8vIHVzZSBzZXJ2ZXIgY29uZmlndXJhdGlvbiwgdGhlbiBmYWxsYmFjayB0byBpbmZlcmVuY2VcbmNvbnN0IHNlcnZlckhvc3QgPSBfX1NFUlZFUl9IT1NUX19cbmNvbnN0IHNvY2tldFByb3RvY29sID1cbiAgX19ITVJfUFJPVE9DT0xfXyB8fCAobG9jYXRpb24ucHJvdG9jb2wgPT09ICdodHRwczonID8gJ3dzcycgOiAnd3MnKVxuY29uc3QgaG1yUG9ydCA9IF9fSE1SX1BPUlRfX1xuY29uc3Qgc29ja2V0SG9zdCA9IGAke19fSE1SX0hPU1ROQU1FX18gfHwgaW1wb3J0TWV0YVVybC5ob3N0bmFtZX06JHtcbiAgaG1yUG9ydCB8fCBpbXBvcnRNZXRhVXJsLnBvcnRcbn0ke19fSE1SX0JBU0VfX31gXG5jb25zdCBkaXJlY3RTb2NrZXRIb3N0ID0gX19ITVJfRElSRUNUX1RBUkdFVF9fXG5jb25zdCBiYXNlID0gX19CQVNFX18gfHwgJy8nXG5jb25zdCBtZXNzYWdlQnVmZmVyOiBzdHJpbmdbXSA9IFtdXG5cbmxldCBzb2NrZXQ6IFdlYlNvY2tldFxudHJ5IHtcbiAgbGV0IGZhbGxiYWNrOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWRcbiAgLy8gb25seSB1c2UgZmFsbGJhY2sgd2hlbiBwb3J0IGlzIGluZmVycmVkIHRvIHByZXZlbnQgY29uZnVzaW9uXG4gIGlmICghaG1yUG9ydCkge1xuICAgIGZhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgLy8gZmFsbGJhY2sgdG8gY29ubmVjdGluZyBkaXJlY3RseSB0byB0aGUgaG1yIHNlcnZlclxuICAgICAgLy8gZm9yIHNlcnZlcnMgd2hpY2ggZG9lcyBub3Qgc3VwcG9ydCBwcm94eWluZyB3ZWJzb2NrZXRcbiAgICAgIHNvY2tldCA9IHNldHVwV2ViU29ja2V0KHNvY2tldFByb3RvY29sLCBkaXJlY3RTb2NrZXRIb3N0LCAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRTY3JpcHRIb3N0VVJMID0gbmV3IFVSTChpbXBvcnQubWV0YS51cmwpXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTY3JpcHRIb3N0ID1cbiAgICAgICAgICBjdXJyZW50U2NyaXB0SG9zdFVSTC5ob3N0ICtcbiAgICAgICAgICBjdXJyZW50U2NyaXB0SG9zdFVSTC5wYXRobmFtZS5yZXBsYWNlKC9Adml0ZVxcL2NsaWVudCQvLCAnJylcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAnW3ZpdGVdIGZhaWxlZCB0byBjb25uZWN0IHRvIHdlYnNvY2tldC5cXG4nICtcbiAgICAgICAgICAgICd5b3VyIGN1cnJlbnQgc2V0dXA6XFxuJyArXG4gICAgICAgICAgICBgICAoYnJvd3NlcikgJHtjdXJyZW50U2NyaXB0SG9zdH0gPC0tW0hUVFBdLS0+ICR7c2VydmVySG9zdH0gKHNlcnZlcilcXG5gICtcbiAgICAgICAgICAgIGAgIChicm93c2VyKSAke3NvY2tldEhvc3R9IDwtLVtXZWJTb2NrZXQgKGZhaWxpbmcpXS0tPiAke2RpcmVjdFNvY2tldEhvc3R9IChzZXJ2ZXIpXFxuYCArXG4gICAgICAgICAgICAnQ2hlY2sgb3V0IHlvdXIgVml0ZSAvIG5ldHdvcmsgY29uZmlndXJhdGlvbiBhbmQgaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9zZXJ2ZXItb3B0aW9ucy5odG1sI3NlcnZlci1obXIgLidcbiAgICAgICAgKVxuICAgICAgfSlcbiAgICAgIHNvY2tldC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICAnb3BlbicsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmluZm8oXG4gICAgICAgICAgICAnW3ZpdGVdIERpcmVjdCB3ZWJzb2NrZXQgY29ubmVjdGlvbiBmYWxsYmFjay4gQ2hlY2sgb3V0IGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvc2VydmVyLW9wdGlvbnMuaHRtbCNzZXJ2ZXItaG1yIHRvIHJlbW92ZSB0aGUgcHJldmlvdXMgY29ubmVjdGlvbiBlcnJvci4nXG4gICAgICAgICAgKVxuICAgICAgICB9LFxuICAgICAgICB7IG9uY2U6IHRydWUgfVxuICAgICAgKVxuICAgIH1cbiAgfVxuXG4gIHNvY2tldCA9IHNldHVwV2ViU29ja2V0KHNvY2tldFByb3RvY29sLCBzb2NrZXRIb3N0LCBmYWxsYmFjaylcbn0gY2F0Y2ggKGVycm9yKSB7XG4gIGNvbnNvbGUuZXJyb3IoYFt2aXRlXSBmYWlsZWQgdG8gY29ubmVjdCB0byB3ZWJzb2NrZXQgKCR7ZXJyb3J9KS4gYClcbn1cblxuZnVuY3Rpb24gc2V0dXBXZWJTb2NrZXQoXG4gIHByb3RvY29sOiBzdHJpbmcsXG4gIGhvc3RBbmRQYXRoOiBzdHJpbmcsXG4gIG9uQ2xvc2VXaXRob3V0T3Blbj86ICgpID0+IHZvaWRcbikge1xuICBjb25zdCBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KGAke3Byb3RvY29sfTovLyR7aG9zdEFuZFBhdGh9YCwgJ3ZpdGUtaG1yJylcbiAgbGV0IGlzT3BlbmVkID0gZmFsc2VcblxuICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAnb3BlbicsXG4gICAgKCkgPT4ge1xuICAgICAgaXNPcGVuZWQgPSB0cnVlXG4gICAgfSxcbiAgICB7IG9uY2U6IHRydWUgfVxuICApXG5cbiAgLy8gTGlzdGVuIGZvciBtZXNzYWdlc1xuICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGFzeW5jICh7IGRhdGEgfSkgPT4ge1xuICAgIGhhbmRsZU1lc3NhZ2UoSlNPTi5wYXJzZShkYXRhKSlcbiAgfSlcblxuICAvLyBwaW5nIHNlcnZlclxuICBzb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBhc3luYyAoeyB3YXNDbGVhbiB9KSA9PiB7XG4gICAgaWYgKHdhc0NsZWFuKSByZXR1cm5cblxuICAgIGlmICghaXNPcGVuZWQgJiYgb25DbG9zZVdpdGhvdXRPcGVuKSB7XG4gICAgICBvbkNsb3NlV2l0aG91dE9wZW4oKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFt2aXRlXSBzZXJ2ZXIgY29ubmVjdGlvbiBsb3N0LiBwb2xsaW5nIGZvciByZXN0YXJ0Li4uYClcbiAgICBhd2FpdCB3YWl0Rm9yU3VjY2Vzc2Z1bFBpbmcocHJvdG9jb2wsIGhvc3RBbmRQYXRoKVxuICAgIGxvY2F0aW9uLnJlbG9hZCgpXG4gIH0pXG5cbiAgcmV0dXJuIHNvY2tldFxufVxuXG5mdW5jdGlvbiB3YXJuRmFpbGVkRmV0Y2goZXJyOiBFcnJvciwgcGF0aDogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgaWYgKCFlcnIubWVzc2FnZS5tYXRjaCgnZmV0Y2gnKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyKVxuICB9XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgYFtobXJdIEZhaWxlZCB0byByZWxvYWQgJHtwYXRofS4gYCArXG4gICAgICBgVGhpcyBjb3VsZCBiZSBkdWUgdG8gc3ludGF4IGVycm9ycyBvciBpbXBvcnRpbmcgbm9uLWV4aXN0ZW50IGAgK1xuICAgICAgYG1vZHVsZXMuIChzZWUgZXJyb3JzIGFib3ZlKWBcbiAgKVxufVxuXG5mdW5jdGlvbiBjbGVhblVybChwYXRobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChwYXRobmFtZSwgbG9jYXRpb24udG9TdHJpbmcoKSlcbiAgdXJsLnNlYXJjaFBhcmFtcy5kZWxldGUoJ2RpcmVjdCcpXG4gIHJldHVybiB1cmwucGF0aG5hbWUgKyB1cmwuc2VhcmNoXG59XG5cbmxldCBpc0ZpcnN0VXBkYXRlID0gdHJ1ZVxuY29uc3Qgb3V0ZGF0ZWRMaW5rVGFncyA9IG5ldyBXZWFrU2V0PEhUTUxMaW5rRWxlbWVudD4oKVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVNZXNzYWdlKHBheWxvYWQ6IEhNUlBheWxvYWQpIHtcbiAgc3dpdGNoIChwYXlsb2FkLnR5cGUpIHtcbiAgICBjYXNlICdjb25uZWN0ZWQnOlxuICAgICAgY29uc29sZS5kZWJ1ZyhgW3ZpdGVdIGNvbm5lY3RlZC5gKVxuICAgICAgc2VuZE1lc3NhZ2VCdWZmZXIoKVxuICAgICAgLy8gcHJveHkobmdpbngsIGRvY2tlcikgaG1yIHdzIG1heWJlIGNhdXNlZCB0aW1lb3V0LFxuICAgICAgLy8gc28gc2VuZCBwaW5nIHBhY2thZ2UgbGV0IHdzIGtlZXAgYWxpdmUuXG4gICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIGlmIChzb2NrZXQucmVhZHlTdGF0ZSA9PT0gc29ja2V0Lk9QRU4pIHtcbiAgICAgICAgICBzb2NrZXQuc2VuZCgne1widHlwZVwiOlwicGluZ1wifScpXG4gICAgICAgIH1cbiAgICAgIH0sIF9fSE1SX1RJTUVPVVRfXylcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTpiZWZvcmVVcGRhdGUnLCBwYXlsb2FkKVxuICAgICAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdXBkYXRlIGFuZCB0aGVyZSdzIGFscmVhZHkgYW4gZXJyb3Igb3ZlcmxheSwgaXRcbiAgICAgIC8vIG1lYW5zIHRoZSBwYWdlIG9wZW5lZCB3aXRoIGV4aXN0aW5nIHNlcnZlciBjb21waWxlIGVycm9yIGFuZCB0aGUgd2hvbGVcbiAgICAgIC8vIG1vZHVsZSBzY3JpcHQgZmFpbGVkIHRvIGxvYWQgKHNpbmNlIG9uZSBvZiB0aGUgbmVzdGVkIGltcG9ydHMgaXMgNTAwKS5cbiAgICAgIC8vIGluIHRoaXMgY2FzZSBhIG5vcm1hbCB1cGRhdGUgd29uJ3Qgd29yayBhbmQgYSBmdWxsIHJlbG9hZCBpcyBuZWVkZWQuXG4gICAgICBpZiAoaXNGaXJzdFVwZGF0ZSAmJiBoYXNFcnJvck92ZXJsYXkoKSkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhckVycm9yT3ZlcmxheSgpXG4gICAgICAgIGlzRmlyc3RVcGRhdGUgPSBmYWxzZVxuICAgICAgfVxuICAgICAgcGF5bG9hZC51cGRhdGVzLmZvckVhY2goKHVwZGF0ZSkgPT4ge1xuICAgICAgICBpZiAodXBkYXRlLnR5cGUgPT09ICdqcy11cGRhdGUnKSB7XG4gICAgICAgICAgcXVldWVVcGRhdGUoZmV0Y2hVcGRhdGUodXBkYXRlKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjc3MtdXBkYXRlXG4gICAgICAgICAgLy8gdGhpcyBpcyBvbmx5IHNlbnQgd2hlbiBhIGNzcyBmaWxlIHJlZmVyZW5jZWQgd2l0aCA8bGluaz4gaXMgdXBkYXRlZFxuICAgICAgICAgIGNvbnN0IHsgcGF0aCwgdGltZXN0YW1wIH0gPSB1cGRhdGVcbiAgICAgICAgICBjb25zdCBzZWFyY2hVcmwgPSBjbGVhblVybChwYXRoKVxuICAgICAgICAgIC8vIGNhbid0IHVzZSBxdWVyeVNlbGVjdG9yIHdpdGggYFtocmVmKj1dYCBoZXJlIHNpbmNlIHRoZSBsaW5rIG1heSBiZVxuICAgICAgICAgIC8vIHVzaW5nIHJlbGF0aXZlIHBhdGhzIHNvIHdlIG5lZWQgdG8gdXNlIGxpbmsuaHJlZiB0byBncmFiIHRoZSBmdWxsXG4gICAgICAgICAgLy8gVVJMIGZvciB0aGUgaW5jbHVkZSBjaGVjay5cbiAgICAgICAgICBjb25zdCBlbCA9IEFycmF5LmZyb20oXG4gICAgICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxMaW5rRWxlbWVudD4oJ2xpbmsnKVxuICAgICAgICAgICkuZmluZChcbiAgICAgICAgICAgIChlKSA9PlxuICAgICAgICAgICAgICAhb3V0ZGF0ZWRMaW5rVGFncy5oYXMoZSkgJiYgY2xlYW5VcmwoZS5ocmVmKS5pbmNsdWRlcyhzZWFyY2hVcmwpXG4gICAgICAgICAgKVxuICAgICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgY29uc3QgbmV3UGF0aCA9IGAke2Jhc2V9JHtzZWFyY2hVcmwuc2xpY2UoMSl9JHtcbiAgICAgICAgICAgICAgc2VhcmNoVXJsLmluY2x1ZGVzKCc/JykgPyAnJicgOiAnPydcbiAgICAgICAgICAgIH10PSR7dGltZXN0YW1wfWBcblxuICAgICAgICAgICAgLy8gcmF0aGVyIHRoYW4gc3dhcHBpbmcgdGhlIGhyZWYgb24gdGhlIGV4aXN0aW5nIHRhZywgd2Ugd2lsbFxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgbmV3IGxpbmsgdGFnLiBPbmNlIHRoZSBuZXcgc3R5bGVzaGVldCBoYXMgbG9hZGVkIHdlXG4gICAgICAgICAgICAvLyB3aWxsIHJlbW92ZSB0aGUgZXhpc3RpbmcgbGluayB0YWcuIFRoaXMgcmVtb3ZlcyBhIEZsYXNoIE9mXG4gICAgICAgICAgICAvLyBVbnN0eWxlZCBDb250ZW50IHRoYXQgY2FuIG9jY3VyIHdoZW4gc3dhcHBpbmcgb3V0IHRoZSB0YWcgaHJlZlxuICAgICAgICAgICAgLy8gZGlyZWN0bHksIGFzIHRoZSBuZXcgc3R5bGVzaGVldCBoYXMgbm90IHlldCBiZWVuIGxvYWRlZC5cbiAgICAgICAgICAgIGNvbnN0IG5ld0xpbmtUYWcgPSBlbC5jbG9uZU5vZGUoKSBhcyBIVE1MTGlua0VsZW1lbnRcbiAgICAgICAgICAgIG5ld0xpbmtUYWcuaHJlZiA9IG5ldyBVUkwobmV3UGF0aCwgZWwuaHJlZikuaHJlZlxuICAgICAgICAgICAgY29uc3QgcmVtb3ZlT2xkRWwgPSAoKSA9PiBlbC5yZW1vdmUoKVxuICAgICAgICAgICAgbmV3TGlua1RhZy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgcmVtb3ZlT2xkRWwpXG4gICAgICAgICAgICBuZXdMaW5rVGFnLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgcmVtb3ZlT2xkRWwpXG4gICAgICAgICAgICBvdXRkYXRlZExpbmtUYWdzLmFkZChlbClcbiAgICAgICAgICAgIGVsLmFmdGVyKG5ld0xpbmtUYWcpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZGVidWcoYFt2aXRlXSBjc3MgaG90IHVwZGF0ZWQ6ICR7c2VhcmNoVXJsfWApXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2N1c3RvbSc6IHtcbiAgICAgIG5vdGlmeUxpc3RlbmVycyhwYXlsb2FkLmV2ZW50LCBwYXlsb2FkLmRhdGEpXG4gICAgICBicmVha1xuICAgIH1cbiAgICBjYXNlICdmdWxsLXJlbG9hZCc6XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6YmVmb3JlRnVsbFJlbG9hZCcsIHBheWxvYWQpXG4gICAgICBpZiAocGF5bG9hZC5wYXRoICYmIHBheWxvYWQucGF0aC5lbmRzV2l0aCgnLmh0bWwnKSkge1xuICAgICAgICAvLyBpZiBodG1sIGZpbGUgaXMgZWRpdGVkLCBvbmx5IHJlbG9hZCB0aGUgcGFnZSBpZiB0aGUgYnJvd3NlciBpc1xuICAgICAgICAvLyBjdXJyZW50bHkgb24gdGhhdCBwYWdlLlxuICAgICAgICBjb25zdCBwYWdlUGF0aCA9IGRlY29kZVVSSShsb2NhdGlvbi5wYXRobmFtZSlcbiAgICAgICAgY29uc3QgcGF5bG9hZFBhdGggPSBiYXNlICsgcGF5bG9hZC5wYXRoLnNsaWNlKDEpXG4gICAgICAgIGlmIChcbiAgICAgICAgICBwYWdlUGF0aCA9PT0gcGF5bG9hZFBhdGggfHxcbiAgICAgICAgICBwYXlsb2FkLnBhdGggPT09ICcvaW5kZXguaHRtbCcgfHxcbiAgICAgICAgICAocGFnZVBhdGguZW5kc1dpdGgoJy8nKSAmJiBwYWdlUGF0aCArICdpbmRleC5odG1sJyA9PT0gcGF5bG9hZFBhdGgpXG4gICAgICAgICkge1xuICAgICAgICAgIGxvY2F0aW9uLnJlbG9hZCgpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdwcnVuZSc6XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6YmVmb3JlUHJ1bmUnLCBwYXlsb2FkKVxuICAgICAgLy8gQWZ0ZXIgYW4gSE1SIHVwZGF0ZSwgc29tZSBtb2R1bGVzIGFyZSBubyBsb25nZXIgaW1wb3J0ZWQgb24gdGhlIHBhZ2VcbiAgICAgIC8vIGJ1dCB0aGV5IG1heSBoYXZlIGxlZnQgYmVoaW5kIHNpZGUgZWZmZWN0cyB0aGF0IG5lZWQgdG8gYmUgY2xlYW5lZCB1cFxuICAgICAgLy8gKC5lLmcgc3R5bGUgaW5qZWN0aW9ucylcbiAgICAgIC8vIFRPRE8gVHJpZ2dlciB0aGVpciBkaXNwb3NlIGNhbGxiYWNrcy5cbiAgICAgIHBheWxvYWQucGF0aHMuZm9yRWFjaCgocGF0aCkgPT4ge1xuICAgICAgICBjb25zdCBmbiA9IHBydW5lTWFwLmdldChwYXRoKVxuICAgICAgICBpZiAoZm4pIHtcbiAgICAgICAgICBmbihkYXRhTWFwLmdldChwYXRoKSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnZXJyb3InOiB7XG4gICAgICBub3RpZnlMaXN0ZW5lcnMoJ3ZpdGU6ZXJyb3InLCBwYXlsb2FkKVxuICAgICAgY29uc3QgZXJyID0gcGF5bG9hZC5lcnJcbiAgICAgIGlmIChlbmFibGVPdmVybGF5KSB7XG4gICAgICAgIGNyZWF0ZUVycm9yT3ZlcmxheShlcnIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIGBbdml0ZV0gSW50ZXJuYWwgU2VydmVyIEVycm9yXFxuJHtlcnIubWVzc2FnZX1cXG4ke2Vyci5zdGFja31gXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGNvbnN0IGNoZWNrOiBuZXZlciA9IHBheWxvYWRcbiAgICAgIHJldHVybiBjaGVja1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnM8VCBleHRlbmRzIHN0cmluZz4oXG4gIGV2ZW50OiBULFxuICBkYXRhOiBJbmZlckN1c3RvbUV2ZW50UGF5bG9hZDxUPlxuKTogdm9pZFxuZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzKGV2ZW50OiBzdHJpbmcsIGRhdGE6IGFueSk6IHZvaWQge1xuICBjb25zdCBjYnMgPSBjdXN0b21MaXN0ZW5lcnNNYXAuZ2V0KGV2ZW50KVxuICBpZiAoY2JzKSB7XG4gICAgY2JzLmZvckVhY2goKGNiKSA9PiBjYihkYXRhKSlcbiAgfVxufVxuXG5jb25zdCBlbmFibGVPdmVybGF5ID0gX19ITVJfRU5BQkxFX09WRVJMQVlfX1xuXG5mdW5jdGlvbiBjcmVhdGVFcnJvck92ZXJsYXkoZXJyOiBFcnJvclBheWxvYWRbJ2VyciddKSB7XG4gIGlmICghZW5hYmxlT3ZlcmxheSkgcmV0dXJuXG4gIGNsZWFyRXJyb3JPdmVybGF5KClcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChuZXcgRXJyb3JPdmVybGF5KGVycikpXG59XG5cbmZ1bmN0aW9uIGNsZWFyRXJyb3JPdmVybGF5KCkge1xuICBkb2N1bWVudFxuICAgIC5xdWVyeVNlbGVjdG9yQWxsKG92ZXJsYXlJZClcbiAgICAuZm9yRWFjaCgobikgPT4gKG4gYXMgRXJyb3JPdmVybGF5KS5jbG9zZSgpKVxufVxuXG5mdW5jdGlvbiBoYXNFcnJvck92ZXJsYXkoKSB7XG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKG92ZXJsYXlJZCkubGVuZ3RoXG59XG5cbmxldCBwZW5kaW5nID0gZmFsc2VcbmxldCBxdWV1ZWQ6IFByb21pc2U8KCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkPltdID0gW11cblxuLyoqXG4gKiBidWZmZXIgbXVsdGlwbGUgaG90IHVwZGF0ZXMgdHJpZ2dlcmVkIGJ5IHRoZSBzYW1lIHNyYyBjaGFuZ2VcbiAqIHNvIHRoYXQgdGhleSBhcmUgaW52b2tlZCBpbiB0aGUgc2FtZSBvcmRlciB0aGV5IHdlcmUgc2VudC5cbiAqIChvdGhlcndpc2UgdGhlIG9yZGVyIG1heSBiZSBpbmNvbnNpc3RlbnQgYmVjYXVzZSBvZiB0aGUgaHR0cCByZXF1ZXN0IHJvdW5kIHRyaXApXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHF1ZXVlVXBkYXRlKHA6IFByb21pc2U8KCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkPikge1xuICBxdWV1ZWQucHVzaChwKVxuICBpZiAoIXBlbmRpbmcpIHtcbiAgICBwZW5kaW5nID0gdHJ1ZVxuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZSgpXG4gICAgcGVuZGluZyA9IGZhbHNlXG4gICAgY29uc3QgbG9hZGluZyA9IFsuLi5xdWV1ZWRdXG4gICAgcXVldWVkID0gW11cbiAgICA7KGF3YWl0IFByb21pc2UuYWxsKGxvYWRpbmcpKS5mb3JFYWNoKChmbikgPT4gZm4gJiYgZm4oKSlcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB3YWl0Rm9yU3VjY2Vzc2Z1bFBpbmcoXG4gIHNvY2tldFByb3RvY29sOiBzdHJpbmcsXG4gIGhvc3RBbmRQYXRoOiBzdHJpbmcsXG4gIG1zID0gMTAwMFxuKSB7XG4gIGNvbnN0IHBpbmdIb3N0UHJvdG9jb2wgPSBzb2NrZXRQcm90b2NvbCA9PT0gJ3dzcycgPyAnaHR0cHMnIDogJ2h0dHAnXG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnN0YW50LWNvbmRpdGlvblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHRyeSB7XG4gICAgICAvLyBBIGZldGNoIG9uIGEgd2Vic29ja2V0IFVSTCB3aWxsIHJldHVybiBhIHN1Y2Nlc3NmdWwgcHJvbWlzZSB3aXRoIHN0YXR1cyA0MDAsXG4gICAgICAvLyBidXQgd2lsbCByZWplY3QgYSBuZXR3b3JraW5nIGVycm9yLlxuICAgICAgLy8gV2hlbiBydW5uaW5nIG9uIG1pZGRsZXdhcmUgbW9kZSwgaXQgcmV0dXJucyBzdGF0dXMgNDI2LCBhbmQgYW4gY29ycyBlcnJvciBoYXBwZW5zIGlmIG1vZGUgaXMgbm90IG5vLWNvcnNcbiAgICAgIGF3YWl0IGZldGNoKGAke3BpbmdIb3N0UHJvdG9jb2x9Oi8vJHtob3N0QW5kUGF0aH1gLCB7XG4gICAgICAgIG1vZGU6ICduby1jb3JzJ1xuICAgICAgfSlcbiAgICAgIGJyZWFrXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gd2FpdCBtcyBiZWZvcmUgYXR0ZW1wdGluZyB0byBwaW5nIGFnYWluXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpXG4gICAgfVxuICB9XG59XG5cbi8vIGh0dHBzOi8vd2ljZy5naXRodWIuaW8vY29uc3RydWN0LXN0eWxlc2hlZXRzXG5jb25zdCBzdXBwb3J0c0NvbnN0cnVjdGVkU2hlZXQgPSAoKCkgPT4ge1xuICAvLyBUT0RPOiByZS1lbmFibGUgdGhpcyB0cnkgYmxvY2sgb25jZSBDaHJvbWUgZml4ZXMgdGhlIHBlcmZvcm1hbmNlIG9mXG4gIC8vIHJ1bGUgaW5zZXJ0aW9uIGluIHJlYWxseSBiaWcgc3R5bGVzaGVldHNcbiAgLy8gdHJ5IHtcbiAgLy8gICBuZXcgQ1NTU3R5bGVTaGVldCgpXG4gIC8vICAgcmV0dXJuIHRydWVcbiAgLy8gfSBjYXRjaCAoZSkge31cbiAgcmV0dXJuIGZhbHNlXG59KSgpXG5cbmNvbnN0IHNoZWV0c01hcCA9IG5ldyBNYXA8XG4gIHN0cmluZyxcbiAgSFRNTFN0eWxlRWxlbWVudCB8IENTU1N0eWxlU2hlZXQgfCB1bmRlZmluZWRcbj4oKVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU3R5bGUoaWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogdm9pZCB7XG4gIGxldCBzdHlsZSA9IHNoZWV0c01hcC5nZXQoaWQpXG4gIGlmIChzdXBwb3J0c0NvbnN0cnVjdGVkU2hlZXQgJiYgIWNvbnRlbnQuaW5jbHVkZXMoJ0BpbXBvcnQnKSkge1xuICAgIGlmIChzdHlsZSAmJiAhKHN0eWxlIGluc3RhbmNlb2YgQ1NTU3R5bGVTaGVldCkpIHtcbiAgICAgIHJlbW92ZVN0eWxlKGlkKVxuICAgICAgc3R5bGUgPSB1bmRlZmluZWRcbiAgICB9XG5cbiAgICBpZiAoIXN0eWxlKSB7XG4gICAgICBzdHlsZSA9IG5ldyBDU1NTdHlsZVNoZWV0KClcbiAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IHVzaW5nIGV4cGVyaW1lbnRhbCBBUElcbiAgICAgIHN0eWxlLnJlcGxhY2VTeW5jKGNvbnRlbnQpXG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB1c2luZyBleHBlcmltZW50YWwgQVBJXG4gICAgICBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMgPSBbLi4uZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzLCBzdHlsZV1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvcjogdXNpbmcgZXhwZXJpbWVudGFsIEFQSVxuICAgICAgc3R5bGUucmVwbGFjZVN5bmMoY29udGVudClcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKHN0eWxlICYmICEoc3R5bGUgaW5zdGFuY2VvZiBIVE1MU3R5bGVFbGVtZW50KSkge1xuICAgICAgcmVtb3ZlU3R5bGUoaWQpXG4gICAgICBzdHlsZSA9IHVuZGVmaW5lZFxuICAgIH1cblxuICAgIGlmICghc3R5bGUpIHtcbiAgICAgIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKVxuICAgICAgc3R5bGUuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3RleHQvY3NzJylcbiAgICAgIHN0eWxlLnNldEF0dHJpYnV0ZSgnZGF0YS12aXRlLWRldi1pZCcsIGlkKVxuICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY29udGVudFxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSlcbiAgICB9IGVsc2Uge1xuICAgICAgc3R5bGUuaW5uZXJIVE1MID0gY29udGVudFxuICAgIH1cbiAgfVxuICBzaGVldHNNYXAuc2V0KGlkLCBzdHlsZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZVN0eWxlKGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3Qgc3R5bGUgPSBzaGVldHNNYXAuZ2V0KGlkKVxuICBpZiAoc3R5bGUpIHtcbiAgICBpZiAoc3R5bGUgaW5zdGFuY2VvZiBDU1NTdHlsZVNoZWV0KSB7XG4gICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB1c2luZyBleHBlcmltZW50YWwgQVBJXG4gICAgICBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMgPSBkb2N1bWVudC5hZG9wdGVkU3R5bGVTaGVldHMuZmlsdGVyKFxuICAgICAgICAoczogQ1NTU3R5bGVTaGVldCkgPT4gcyAhPT0gc3R5bGVcbiAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuaGVhZC5yZW1vdmVDaGlsZChzdHlsZSlcbiAgICB9XG4gICAgc2hlZXRzTWFwLmRlbGV0ZShpZClcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaFVwZGF0ZSh7XG4gIHBhdGgsXG4gIGFjY2VwdGVkUGF0aCxcbiAgdGltZXN0YW1wLFxuICBleHBsaWNpdEltcG9ydFJlcXVpcmVkXG59OiBVcGRhdGUpIHtcbiAgY29uc3QgbW9kID0gaG90TW9kdWxlc01hcC5nZXQocGF0aClcbiAgaWYgKCFtb2QpIHtcbiAgICAvLyBJbiBhIGNvZGUtc3BsaXR0aW5nIHByb2plY3QsXG4gICAgLy8gaXQgaXMgY29tbW9uIHRoYXQgdGhlIGhvdC11cGRhdGluZyBtb2R1bGUgaXMgbm90IGxvYWRlZCB5ZXQuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3ZpdGVqcy92aXRlL2lzc3Vlcy83MjFcbiAgICByZXR1cm5cbiAgfVxuXG4gIGNvbnN0IG1vZHVsZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBNb2R1bGVOYW1lc3BhY2U+KClcbiAgY29uc3QgaXNTZWxmVXBkYXRlID0gcGF0aCA9PT0gYWNjZXB0ZWRQYXRoXG5cbiAgLy8gZGV0ZXJtaW5lIHRoZSBxdWFsaWZpZWQgY2FsbGJhY2tzIGJlZm9yZSB3ZSByZS1pbXBvcnQgdGhlIG1vZHVsZXNcbiAgY29uc3QgcXVhbGlmaWVkQ2FsbGJhY2tzID0gbW9kLmNhbGxiYWNrcy5maWx0ZXIoKHsgZGVwcyB9KSA9PlxuICAgIGRlcHMuaW5jbHVkZXMoYWNjZXB0ZWRQYXRoKVxuICApXG5cbiAgaWYgKGlzU2VsZlVwZGF0ZSB8fCBxdWFsaWZpZWRDYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGRlcCA9IGFjY2VwdGVkUGF0aFxuICAgIGNvbnN0IGRpc3Bvc2VyID0gZGlzcG9zZU1hcC5nZXQoZGVwKVxuICAgIGlmIChkaXNwb3NlcikgYXdhaXQgZGlzcG9zZXIoZGF0YU1hcC5nZXQoZGVwKSlcbiAgICBjb25zdCBbcGF0aCwgcXVlcnldID0gZGVwLnNwbGl0KGA/YClcbiAgICB0cnkge1xuICAgICAgY29uc3QgbmV3TW9kOiBNb2R1bGVOYW1lc3BhY2UgPSBhd2FpdCBpbXBvcnQoXG4gICAgICAgIC8qIEB2aXRlLWlnbm9yZSAqL1xuICAgICAgICBiYXNlICtcbiAgICAgICAgICBwYXRoLnNsaWNlKDEpICtcbiAgICAgICAgICBgPyR7ZXhwbGljaXRJbXBvcnRSZXF1aXJlZCA/ICdpbXBvcnQmJyA6ICcnfXQ9JHt0aW1lc3RhbXB9JHtcbiAgICAgICAgICAgIHF1ZXJ5ID8gYCYke3F1ZXJ5fWAgOiAnJ1xuICAgICAgICAgIH1gXG4gICAgICApXG4gICAgICBtb2R1bGVNYXAuc2V0KGRlcCwgbmV3TW9kKVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHdhcm5GYWlsZWRGZXRjaChlLCBkZXApXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBmb3IgKGNvbnN0IHsgZGVwcywgZm4gfSBvZiBxdWFsaWZpZWRDYWxsYmFja3MpIHtcbiAgICAgIGZuKGRlcHMubWFwKChkZXApID0+IG1vZHVsZU1hcC5nZXQoZGVwKSkpXG4gICAgfVxuICAgIGNvbnN0IGxvZ2dlZFBhdGggPSBpc1NlbGZVcGRhdGUgPyBwYXRoIDogYCR7YWNjZXB0ZWRQYXRofSB2aWEgJHtwYXRofWBcbiAgICBjb25zb2xlLmRlYnVnKGBbdml0ZV0gaG90IHVwZGF0ZWQ6ICR7bG9nZ2VkUGF0aH1gKVxuICB9XG59XG5cbmZ1bmN0aW9uIHNlbmRNZXNzYWdlQnVmZmVyKCkge1xuICBpZiAoc29ja2V0LnJlYWR5U3RhdGUgPT09IDEpIHtcbiAgICBtZXNzYWdlQnVmZmVyLmZvckVhY2goKG1zZykgPT4gc29ja2V0LnNlbmQobXNnKSlcbiAgICBtZXNzYWdlQnVmZmVyLmxlbmd0aCA9IDBcbiAgfVxufVxuXG5pbnRlcmZhY2UgSG90TW9kdWxlIHtcbiAgaWQ6IHN0cmluZ1xuICBjYWxsYmFja3M6IEhvdENhbGxiYWNrW11cbn1cblxuaW50ZXJmYWNlIEhvdENhbGxiYWNrIHtcbiAgLy8gdGhlIGRlcGVuZGVuY2llcyBtdXN0IGJlIGZldGNoYWJsZSBwYXRoc1xuICBkZXBzOiBzdHJpbmdbXVxuICBmbjogKG1vZHVsZXM6IEFycmF5PE1vZHVsZU5hbWVzcGFjZSB8IHVuZGVmaW5lZD4pID0+IHZvaWRcbn1cblxudHlwZSBDdXN0b21MaXN0ZW5lcnNNYXAgPSBNYXA8c3RyaW5nLCAoKGRhdGE6IGFueSkgPT4gdm9pZClbXT5cblxuY29uc3QgaG90TW9kdWxlc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBIb3RNb2R1bGU+KClcbmNvbnN0IGRpc3Bvc2VNYXAgPSBuZXcgTWFwPHN0cmluZywgKGRhdGE6IGFueSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4+KClcbmNvbnN0IHBydW5lTWFwID0gbmV3IE1hcDxzdHJpbmcsIChkYXRhOiBhbnkpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+PigpXG5jb25zdCBkYXRhTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKVxuY29uc3QgY3VzdG9tTGlzdGVuZXJzTWFwOiBDdXN0b21MaXN0ZW5lcnNNYXAgPSBuZXcgTWFwKClcbmNvbnN0IGN0eFRvTGlzdGVuZXJzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEN1c3RvbUxpc3RlbmVyc01hcD4oKVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlSG90Q29udGV4dChvd25lclBhdGg6IHN0cmluZyk6IFZpdGVIb3RDb250ZXh0IHtcbiAgaWYgKCFkYXRhTWFwLmhhcyhvd25lclBhdGgpKSB7XG4gICAgZGF0YU1hcC5zZXQob3duZXJQYXRoLCB7fSlcbiAgfVxuXG4gIC8vIHdoZW4gYSBmaWxlIGlzIGhvdCB1cGRhdGVkLCBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWRcbiAgLy8gY2xlYXIgaXRzIHN0YWxlIGNhbGxiYWNrc1xuICBjb25zdCBtb2QgPSBob3RNb2R1bGVzTWFwLmdldChvd25lclBhdGgpXG4gIGlmIChtb2QpIHtcbiAgICBtb2QuY2FsbGJhY2tzID0gW11cbiAgfVxuXG4gIC8vIGNsZWFyIHN0YWxlIGN1c3RvbSBldmVudCBsaXN0ZW5lcnNcbiAgY29uc3Qgc3RhbGVMaXN0ZW5lcnMgPSBjdHhUb0xpc3RlbmVyc01hcC5nZXQob3duZXJQYXRoKVxuICBpZiAoc3RhbGVMaXN0ZW5lcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtldmVudCwgc3RhbGVGbnNdIG9mIHN0YWxlTGlzdGVuZXJzKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcnMgPSBjdXN0b21MaXN0ZW5lcnNNYXAuZ2V0KGV2ZW50KVxuICAgICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgICBjdXN0b21MaXN0ZW5lcnNNYXAuc2V0KFxuICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgIGxpc3RlbmVycy5maWx0ZXIoKGwpID0+ICFzdGFsZUZucy5pbmNsdWRlcyhsKSlcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IG5ld0xpc3RlbmVyczogQ3VzdG9tTGlzdGVuZXJzTWFwID0gbmV3IE1hcCgpXG4gIGN0eFRvTGlzdGVuZXJzTWFwLnNldChvd25lclBhdGgsIG5ld0xpc3RlbmVycylcblxuICBmdW5jdGlvbiBhY2NlcHREZXBzKGRlcHM6IHN0cmluZ1tdLCBjYWxsYmFjazogSG90Q2FsbGJhY2tbJ2ZuJ10gPSAoKSA9PiB7fSkge1xuICAgIGNvbnN0IG1vZDogSG90TW9kdWxlID0gaG90TW9kdWxlc01hcC5nZXQob3duZXJQYXRoKSB8fCB7XG4gICAgICBpZDogb3duZXJQYXRoLFxuICAgICAgY2FsbGJhY2tzOiBbXVxuICAgIH1cbiAgICBtb2QuY2FsbGJhY2tzLnB1c2goe1xuICAgICAgZGVwcyxcbiAgICAgIGZuOiBjYWxsYmFja1xuICAgIH0pXG4gICAgaG90TW9kdWxlc01hcC5zZXQob3duZXJQYXRoLCBtb2QpXG4gIH1cblxuICBjb25zdCBob3Q6IFZpdGVIb3RDb250ZXh0ID0ge1xuICAgIGdldCBkYXRhKCkge1xuICAgICAgcmV0dXJuIGRhdGFNYXAuZ2V0KG93bmVyUGF0aClcbiAgICB9LFxuXG4gICAgYWNjZXB0KGRlcHM/OiBhbnksIGNhbGxiYWNrPzogYW55KSB7XG4gICAgICBpZiAodHlwZW9mIGRlcHMgPT09ICdmdW5jdGlvbicgfHwgIWRlcHMpIHtcbiAgICAgICAgLy8gc2VsZi1hY2NlcHQ6IGhvdC5hY2NlcHQoKCkgPT4ge30pXG4gICAgICAgIGFjY2VwdERlcHMoW293bmVyUGF0aF0sIChbbW9kXSkgPT4gZGVwcyAmJiBkZXBzKG1vZCkpXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZXBzID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyBleHBsaWNpdCBkZXBzXG4gICAgICAgIGFjY2VwdERlcHMoW2RlcHNdLCAoW21vZF0pID0+IGNhbGxiYWNrICYmIGNhbGxiYWNrKG1vZCkpXG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZGVwcykpIHtcbiAgICAgICAgYWNjZXB0RGVwcyhkZXBzLCBjYWxsYmFjaylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBob3QuYWNjZXB0KCkgdXNhZ2UuYClcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gZXhwb3J0IG5hbWVzIChmaXJzdCBhcmcpIGFyZSBpcnJlbGV2YW50IG9uIHRoZSBjbGllbnQgc2lkZSwgdGhleSdyZVxuICAgIC8vIGV4dHJhY3RlZCBpbiB0aGUgc2VydmVyIGZvciBwcm9wYWdhdGlvblxuICAgIGFjY2VwdEV4cG9ydHMoXzogc3RyaW5nIHwgcmVhZG9ubHkgc3RyaW5nW10sIGNhbGxiYWNrPzogYW55KSB7XG4gICAgICBhY2NlcHREZXBzKFtvd25lclBhdGhdLCBjYWxsYmFjayAmJiAoKFttb2RdKSA9PiBjYWxsYmFjayhtb2QpKSlcbiAgICB9LFxuXG4gICAgZGlzcG9zZShjYikge1xuICAgICAgZGlzcG9zZU1hcC5zZXQob3duZXJQYXRoLCBjYilcbiAgICB9LFxuXG4gICAgLy8gQHRzLWV4cGVjdC1lcnJvciB1bnR5cGVkXG4gICAgcHJ1bmUoY2I6IChkYXRhOiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIHBydW5lTWFwLnNldChvd25lclBhdGgsIGNiKVxuICAgIH0sXG5cbiAgICAvLyBUT0RPXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvblxuICAgIGRlY2xpbmUoKSB7fSxcblxuICAgIC8vIHRlbGwgdGhlIHNlcnZlciB0byByZS1wZXJmb3JtIGhtciBwcm9wYWdhdGlvbiBmcm9tIHRoaXMgbW9kdWxlIGFzIHJvb3RcbiAgICBpbnZhbGlkYXRlKCkge1xuICAgICAgbm90aWZ5TGlzdGVuZXJzKCd2aXRlOmludmFsaWRhdGUnLCB7IHBhdGg6IG93bmVyUGF0aCB9KVxuICAgICAgdGhpcy5zZW5kKCd2aXRlOmludmFsaWRhdGUnLCB7IHBhdGg6IG93bmVyUGF0aCB9KVxuICAgIH0sXG5cbiAgICAvLyBjdXN0b20gZXZlbnRzXG4gICAgb24oZXZlbnQsIGNiKSB7XG4gICAgICBjb25zdCBhZGRUb01hcCA9IChtYXA6IE1hcDxzdHJpbmcsIGFueVtdPikgPT4ge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IG1hcC5nZXQoZXZlbnQpIHx8IFtdXG4gICAgICAgIGV4aXN0aW5nLnB1c2goY2IpXG4gICAgICAgIG1hcC5zZXQoZXZlbnQsIGV4aXN0aW5nKVxuICAgICAgfVxuICAgICAgYWRkVG9NYXAoY3VzdG9tTGlzdGVuZXJzTWFwKVxuICAgICAgYWRkVG9NYXAobmV3TGlzdGVuZXJzKVxuICAgIH0sXG5cbiAgICBzZW5kKGV2ZW50LCBkYXRhKSB7XG4gICAgICBtZXNzYWdlQnVmZmVyLnB1c2goSlNPTi5zdHJpbmdpZnkoeyB0eXBlOiAnY3VzdG9tJywgZXZlbnQsIGRhdGEgfSkpXG4gICAgICBzZW5kTWVzc2FnZUJ1ZmZlcigpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvdFxufVxuXG4vKipcbiAqIHVybHMgaGVyZSBhcmUgZHluYW1pYyBpbXBvcnQoKSB1cmxzIHRoYXQgY291bGRuJ3QgYmUgc3RhdGljYWxseSBhbmFseXplZFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0UXVlcnkodXJsOiBzdHJpbmcsIHF1ZXJ5VG9JbmplY3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIHNraXAgdXJscyB0aGF0IHdvbid0IGJlIGhhbmRsZWQgYnkgdml0ZVxuICBpZiAoIXVybC5zdGFydHNXaXRoKCcuJykgJiYgIXVybC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICByZXR1cm4gdXJsXG4gIH1cblxuICAvLyBjYW4ndCB1c2UgcGF0aG5hbWUgZnJvbSBVUkwgc2luY2UgaXQgbWF5IGJlIHJlbGF0aXZlIGxpa2UgLi4vXG4gIGNvbnN0IHBhdGhuYW1lID0gdXJsLnJlcGxhY2UoLyMuKiQvLCAnJykucmVwbGFjZSgvXFw/LiokLywgJycpXG4gIGNvbnN0IHsgc2VhcmNoLCBoYXNoIH0gPSBuZXcgVVJMKHVybCwgJ2h0dHA6Ly92aXRlanMuZGV2JylcblxuICByZXR1cm4gYCR7cGF0aG5hbWV9PyR7cXVlcnlUb0luamVjdH0ke3NlYXJjaCA/IGAmYCArIHNlYXJjaC5zbGljZSgxKSA6ICcnfSR7XG4gICAgaGFzaCB8fCAnJ1xuICB9YFxufVxuXG5leHBvcnQgeyBFcnJvck92ZXJsYXkgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7QUFDQSxNQUFNLFFBQVEsWUFBWSxDQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBNEh6QixDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUE7QUFDL0MsTUFBTSxXQUFXLEdBQUcsMENBQTBDLENBQUE7QUFFOUQ7QUFDQTtBQUNBLE1BQU0sRUFBRSxXQUFXLEdBQUcsTUFBQTtD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
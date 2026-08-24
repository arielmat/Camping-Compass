/* auth.js — shared sign-in / register UI and session state.
   Renders the account control in the nav and a modal used across pages. */

import { API } from "./api.js";
import { esc, toast } from "./ui.js";

let user = null;
const listeners = [];

export function getUser() { return user; }
export function onAuth(cb) { listeners.push(cb); cb(user); }
function emit() { listeners.forEach((cb) => cb(user)); }

/* Build the auth modal once and append to <body>. */
function ensureModal() {
  if (document.getElementById("authModal")) return;
  const el = document.createElement("div");
  el.className = "modal-backdrop";
  el.id = "authModal";
  el.innerHTML = `
    <div class="modal auth-modal" role="dialog" aria-modal="true" aria-label="Account">
      <button class="modal-close" data-close aria-label="Close">×</button>
      <div class="modal-body">
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">Sign in</button>
          <button class="auth-tab" data-tab="register">Create account</button>
        </div>

        <form class="form-grid" id="loginForm" style="max-width:none">
          <label class="field">Email
            <input type="email" name="email" autocomplete="email" required>
          </label>
          <label class="field">Password
            <input type="password" name="password" autocomplete="current-password" required>
          </label>
          <div><button class="btn" type="submit">Sign in</button></div>
        </form>

        <form class="form-grid" id="registerForm" style="max-width:none;display:none">
          <label class="field">Playa name / display name
            <input type="text" name="name" maxlength="60" required>
          </label>
          <label class="field">Email
            <input type="email" name="email" autocomplete="email" required>
          </label>
          <label class="field">Password
            <input type="password" name="password" autocomplete="new-password" minlength="6" required>
            <div class="hint">At least 6 characters.</div>
          </label>
          <div><button class="btn" type="submit">Create account</button></div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(el);

  const close = () => { el.classList.remove("open"); document.body.style.overflow = ""; };
  el.querySelector("[data-close]").addEventListener("click", close);
  el.addEventListener("click", (e) => { if (e.target === el) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  const loginForm = el.querySelector("#loginForm");
  const registerForm = el.querySelector("#registerForm");
  el.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      el.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const isLogin = tab.dataset.tab === "login";
      loginForm.style.display = isLogin ? "" : "none";
      registerForm.style.display = isLogin ? "none" : "";
    });
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const { user: u } = await API.login(loginForm.email.value.trim(), loginForm.password.value);
      user = u; emit(); toast("Welcome back, " + u.name + "!"); close();
      window.dispatchEvent(new Event("auth:success"));
    } catch (err) { toast(err.message); }
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const { user: u } = await API.register(
        registerForm.name.value.trim(), registerForm.email.value.trim(), registerForm.password.value);
      user = u; emit(); toast("Account created — welcome, " + u.name + "!"); close();
      window.dispatchEvent(new Event("auth:success"));
    } catch (err) { toast(err.message); }
  });
}

export function openAuth(tab = "login") {
  ensureModal();
  const el = document.getElementById("authModal");
  el.querySelector(`.auth-tab[data-tab="${tab}"]`).click();
  el.classList.add("open");
  document.body.style.overflow = "hidden";
}

/* Resolve to the current user, opening the modal if needed. */
export function ensureAuth() {
  if (user) return Promise.resolve(user);
  openAuth("login");
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener("auth:success", done); resolve(user); };
    window.addEventListener("auth:success", done);
  });
}

/* Render the nav account control. */
function renderNav() {
  const slot = document.getElementById("account");
  if (!slot) return;
  if (user) {
    slot.innerHTML = `<span class="acct-name" title="${esc(user.email)}">👤 ${esc(user.name)}</span>
      <button class="acct-btn" id="logoutBtn">Sign out</button>`;
    slot.querySelector("#logoutBtn").addEventListener("click", async () => {
      await API.logout(); user = null; emit(); renderNav(); toast("Signed out");
      window.dispatchEvent(new Event("auth:changed"));
    });
  } else {
    slot.innerHTML = `<button class="acct-btn primary" id="signinBtn">Sign in</button>`;
    slot.querySelector("#signinBtn").addEventListener("click", () => openAuth("login"));
  }
}

export async function initAuth() {
  ensureModal();
  try { const { user: u } = await API.me(); user = u; } catch (_) { user = null; }
  emit();
  renderNav();
  onAuth(renderNav);
}

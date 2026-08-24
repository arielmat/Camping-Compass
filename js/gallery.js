/* gallery.js — gallery grid, project modal (ratings + comments) and the
   upload form, all backed by the server API. */

import { API } from "./api.js";
import { initNav, starsHtml, esc, timeAgo, toast } from "./ui.js";
import { initAuth, getUser, ensureAuth } from "./auth.js";

initNav();
initAuth();

const grid = document.getElementById("grid");
const filters = document.getElementById("filters");
const sortSel = document.getElementById("sort");
let activeFilter = "all";
let projects = [];

const THEME_LABEL = {
  disco: "Disco", jungle: "Jungle", playa: "Playa Art",
  neon: "Neon", spa: "Spa & Zen", other: "Other",
};

async function refresh() {
  try {
    const { projects: list } = await API.list();
    projects = list;
    render();
  } catch (err) {
    grid.innerHTML = `<div class="empty">Couldn't load builds: ${esc(err.message)}</div>`;
  }
}

/* ---------- Grid ---------- */
function render() {
  let list = projects.slice();
  if (activeFilter !== "all") list = list.filter((p) => p.theme === activeFilter);

  const sort = sortSel.value;
  if (sort === "top") list.sort((a, b) => b.avg - a.avg);
  else if (sort === "discussed") list.sort((a, b) => b.commentCount - a.commentCount);
  else list.sort((a, b) => b.created - a.created);

  if (!list.length) {
    grid.innerHTML = '<div class="empty">No potties here yet — be the first to <a href="#upload">share your build</a>.</div>';
    return;
  }

  grid.innerHTML = list.map((p) => `
    <article class="card project-card" data-id="${p.id}" tabindex="0">
      <div class="thumb"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></div>
      <div class="card-body">
        <span class="tag">${esc(THEME_LABEL[p.theme] || "Other")} · ${p.year}</span>
        <h3>${esc(p.title)}</h3>
        <div class="camp">${esc(p.camp || "Unaffiliated")}${p.artists ? " · " + esc(p.artists) : ""}</div>
        <div class="meta">
          <span class="rating-line">${starsHtml(p.avg)}<span class="count">${p.ratingCount ? p.avg.toFixed(1) : "—"}</span></span>
          <span class="count">💬 ${p.commentCount}</span>
        </div>
      </div>
    </article>`).join("");

  grid.querySelectorAll(".project-card").forEach((el) => {
    el.addEventListener("click", () => openModal(el.dataset.id));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(el.dataset.id); }
    });
  });
}

/* ---------- Filters / sort ---------- */
filters.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filters.querySelector(".chip.active")?.classList.remove("active");
    chip.classList.add("active");
    activeFilter = chip.dataset.theme;
    render();
  });
});
sortSel.addEventListener("change", render);

/* ---------- Modal ---------- */
const backdrop = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
let currentId = null;

async function openModal(id) {
  currentId = id;
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  modalBody.innerHTML = '<div class="modal-body"><p class="hint">Loading…</p></div>';
  try {
    const { project: p, comments } = await API.get(id);
    paintModal(p, comments);
  } catch (err) {
    modalBody.innerHTML = `<div class="modal-body"><p class="hint">${esc(err.message)}</p></div>`;
  }
}

function paintModal(p, comments) {
  const signedIn = !!getUser();
  modalBody.innerHTML = `
    <img class="modal-img" src="${esc(p.image)}" alt="${esc(p.title)}">
    <div class="modal-body">
      <span class="tag">${esc(THEME_LABEL[p.theme] || "Other")} · ${p.year}</span>
      <h2>${esc(p.title)}</h2>
      <div class="camp" style="color:var(--muted);margin-bottom:10px">
        ${esc(p.camp || "Unaffiliated")}${p.artists ? " · decorated by " + esc(p.artists) : ""}
        ${p.author ? ' · shared by ' + esc(p.author) : ''}
      </div>
      <p style="color:var(--ink-soft)">${esc(p.desc || "")}</p>

      <div class="rating-line" style="margin:16px 0 4px">
        ${starsHtml(p.avg)}
        <span class="count">${p.ratingCount ? p.avg.toFixed(1) + " from " + p.ratingCount + " rating" + (p.ratingCount === 1 ? "" : "s") : "No ratings yet"}</span>
      </div>

      <div style="margin-top:14px">
        <div class="hint" style="margin-bottom:4px">${p.myRating ? "Your rating (tap to change):" : "Rate this build:"}</div>
        <div class="stars input" id="rateInput" role="radiogroup" aria-label="Rate this build">
          ${[1,2,3,4,5].map((i) => `<span class="star ${p.myRating && i <= p.myRating ? "on" : ""}" data-v="${i}" role="radio" aria-label="${i} stars" tabindex="0">★</span>`).join("")}
        </div>
        ${signedIn ? "" : '<div class="hint" style="margin-top:6px">Sign in to rate and comment.</div>'}
      </div>

      <div class="comments">
        <h3 style="font-size:1.1rem">Comments (${comments.length})</h3>
        <div id="commentList">
          ${comments.length ? comments.map(commentHtml).join("")
            : '<p class="hint">No comments yet — say something nice.</p>'}
        </div>
        <div class="form-grid" style="margin-top:14px;max-width:none">
          <label class="field">Comment
            <textarea id="cText" placeholder="${signedIn ? "Share your feedback…" : "Sign in to comment…"}" maxlength="600" ${signedIn ? "" : "disabled"}></textarea>
          </label>
          <div><button class="btn disco" id="cPost">${signedIn ? "Post comment" : "Sign in to comment"}</button></div>
        </div>
      </div>
    </div>`;

  const rateInput = modalBody.querySelector("#rateInput");
  const paintHover = (v) => rateInput.querySelectorAll(".star").forEach((s, i) => s.classList.toggle("on", i < v));
  rateInput.querySelectorAll(".star").forEach((s) => {
    const v = +s.dataset.v;
    s.addEventListener("mouseenter", () => paintHover(v));
    s.addEventListener("click", () => submitRating(v));
    s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); submitRating(v); } });
  });
  rateInput.addEventListener("mouseleave", () =>
    paintHover(getUser() && p.myRating ? p.myRating : 0));

  modalBody.querySelector("#cPost").addEventListener("click", submitComment);
}

function commentHtml(c) {
  return `<div class="comment">
    <span class="who">${esc(c.who)}</span> <span class="when">· ${timeAgo(c.created)}</span>
    <p>${esc(c.text)}</p>
  </div>`;
}

async function submitRating(v) {
  await ensureAuth();
  if (!getUser()) return;
  try {
    await API.rate(currentId, v);
    toast("Thanks — you rated it " + v + " ★");
    const { project, comments } = await API.get(currentId);
    paintModal(project, comments);
    await refresh();
  } catch (err) { toast(err.message); }
}

async function submitComment() {
  await ensureAuth();
  if (!getUser()) return;
  const text = modalBody.querySelector("#cText").value.trim();
  if (!text) { toast("Write a comment first"); return; }
  try {
    const { project, comments } = await API.comment(currentId, text);
    toast("Comment posted");
    paintModal(project, comments);
    await refresh();
  } catch (err) { toast(err.message); }
}

function closeModal() {
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
  currentId = null;
}
document.getElementById("modalClose").addEventListener("click", closeModal);
backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && backdrop.classList.contains("open")) closeModal(); });

/* ---------- Upload form ---------- */
const form = document.getElementById("uploadForm");
const drop = document.getElementById("imageDrop");
const fileInput = document.getElementById("imageFile");
let imageDataUrl = null;

drop.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
["dragover", "dragenter"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.borderColor = "var(--sun)"; }));
["dragleave", "drop"].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.style.borderColor = ""; }));
drop.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) { toast("Please choose an image file"); return; }
  if (file.size > 6 * 1024 * 1024) { toast("Image is too large (max 6 MB)"); return; }
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = reader.result;
    let prev = drop.querySelector(".image-preview");
    if (!prev) { prev = document.createElement("img"); prev.className = "image-preview"; drop.appendChild(prev); }
    prev.src = imageDataUrl;
    drop.querySelector(".drop-hint").textContent = "Looks great — tap to choose a different photo";
  };
  reader.readAsDataURL(file);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await ensureAuth();
  if (!getUser()) return;
  const title = form.title.value.trim();
  if (!title) { toast("Give your potty a title"); return; }
  if (!imageDataUrl) { toast("Add a photo of your build"); return; }
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = "Uploading…";
  try {
    await API.create({
      title,
      camp: form.camp.value.trim(),
      artists: form.artists.value.trim(),
      theme: form.theme.value,
      year: +form.year.value || new Date().getFullYear(),
      desc: form.desc.value.trim(),
      image: imageDataUrl,
    });
    form.reset();
    imageDataUrl = null;
    const prev = drop.querySelector(".image-preview");
    if (prev) prev.remove();
    drop.querySelector(".drop-hint").textContent = "Tap or drop a photo here";
    toast("Your potty is on the playa! 🎉");
    activeFilter = "all";
    filters.querySelector(".chip.active")?.classList.remove("active");
    filters.querySelector('[data-theme="all"]').classList.add("active");
    sortSel.value = "newest";
    await refresh();
    document.getElementById("gallery").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Add to gallery";
  }
});

/* Update the upload CTA label based on auth. */
window.addEventListener("auth:changed", () => {});

refresh();

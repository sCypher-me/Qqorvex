const screens = [...document.querySelectorAll("[data-screen]")];
const viewButtons = [...document.querySelectorAll("[data-view]")];
let returnFocus = null;

function updateBreakpointClass() {
  document.documentElement.classList.toggle("below-shell", window.innerWidth <= 1023);
}

updateBreakpointClass();
window.addEventListener("resize", updateBreakpointClass);

function showScreen(name, updateUrl = true) {
  const selected = screens.some((screen) => screen.dataset.screen === name) ? name : "login";
  screens.forEach((screen) => { screen.hidden = screen.dataset.screen !== selected; });
  viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === selected)));
  document.title = `Qqorvex · ${selected === "today" ? "Hoje" : selected === "components" ? "Componentes" : "Login"}`;
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", selected);
    url.searchParams.delete("state");
    history.replaceState({}, "", url);
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

viewButtons.forEach((button) => button.addEventListener("click", () => showScreen(button.dataset.view)));

const password = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");
passwordToggle.addEventListener("click", () => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  passwordToggle.setAttribute("aria-pressed", String(!showing));
  passwordToggle.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
});

document.querySelector("#login-form").addEventListener("submit", (event) => event.preventDefault());

const captureDialog = document.querySelector("#capture-dialog");
const vexDialog = document.querySelector("#vex-dialog");

function focusables(container) {
  return [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getAttribute("tabindex") !== "-1" && !element.hidden && element.getClientRects().length);
}

function openDialog(dialog, trigger) {
  returnFocus = trigger || document.activeElement;
  [...dialog.parentElement.children].forEach((sibling) => {
    if (sibling !== dialog) sibling.inert = true;
  });
  dialog.hidden = false;
  document.body.style.overflow = "hidden";
  const first = dialog.querySelector("input") || focusables(dialog)[0];
  requestAnimationFrame(() => first?.focus());
}

function closeDialog(dialog) {
  dialog.hidden = true;
  [...dialog.parentElement.children].forEach((sibling) => { sibling.inert = false; });
  document.body.style.overflow = "";
  returnFocus?.focus();
  returnFocus = null;
  const url = new URL(window.location.href);
  url.searchParams.delete("state");
  history.replaceState({}, "", url);
}

function trapDialog(event, dialog) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog(dialog);
    return;
  }
  if (event.key !== "Tab") return;
  const list = focusables(dialog);
  if (!list.length) return;
  const first = list[0];
  const last = list[list.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

[captureDialog, vexDialog].forEach((dialog) => {
  dialog.addEventListener("keydown", (event) => trapDialog(event, dialog));
  dialog.querySelectorAll(".dialog-close, .dialog-scrim").forEach((button) => button.addEventListener("click", () => closeDialog(dialog)));
});

document.querySelector("#capture-open").addEventListener("click", (event) => openDialog(captureDialog, event.currentTarget));
document.querySelector("#mobile-capture").addEventListener("click", (event) => openDialog(captureDialog, event.currentTarget));
document.querySelector(".vex-trigger").addEventListener("click", (event) => openDialog(vexDialog, event.currentTarget));

const captureForm = document.querySelector("#capture-form");
const captureSubmit = document.querySelector("#capture-submit");
const taskTitle = document.querySelector("#task-title");
const taskError = document.querySelector("#task-error");
captureForm.addEventListener("submit", (event) => {
  event.preventDefault();
  taskError.hidden = true;
  taskTitle.removeAttribute("aria-invalid");
  captureSubmit.disabled = true;
  captureSubmit.textContent = "Salvando…";
  window.setTimeout(() => {
    captureSubmit.disabled = false;
    captureSubmit.textContent = "Tentar novamente";
    taskError.hidden = false;
    taskTitle.setAttribute("aria-invalid", "true");
    taskTitle.focus();
  }, 700);
});

const vexConfirm = document.querySelector("#vex-confirm");
const vexStatus = document.querySelector("#vex-status");
vexConfirm.addEventListener("click", () => {
  vexConfirm.disabled = true;
  vexConfirm.textContent = "Executando…";
  vexStatus.textContent = "Criando uma tarefa. Esta ação está bloqueada contra repetição.";
  vexStatus.className = "vex-status vex-status--pending";
  window.setTimeout(() => {
    vexConfirm.disabled = false;
    vexConfirm.textContent = "Tentar novamente";
    vexStatus.textContent = "A tarefa não foi criada. O contexto e a proposta foram preservados.";
    vexStatus.className = "vex-status vex-status--error";
    vexConfirm.focus();
  }, 1500);
});

const params = new URLSearchParams(window.location.search);
showScreen(params.get("screen") || "login", false);
if (params.get("screen") === "today" && params.get("state") === "capture") {
  const captureTriggers = [document.querySelector("#capture-open"), document.querySelector("#mobile-capture")];
  openDialog(captureDialog, captureTriggers.find((trigger) => trigger.getClientRects().length));
}
if (params.get("screen") === "today" && params.get("state") === "vex") {
  openDialog(vexDialog, document.querySelector(".vex-trigger"));
}

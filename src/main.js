const $ = (id) => document.getElementById(id);
const profiles = {
  dani: { name: "Dani", initials: "DA" },
  demo: { name: "Demo", initials: "DE" },
};

const authScreen = $("authScreen");
const profilePicker = $("profilePicker");
const loginForm = $("loginForm");
const authStatus = $("authStatus");
const authError = $("authError");
const passwordInput = $("password");
let selectedProfile = null;

function showProfiles(status = "") {
  loginForm.hidden = true;
  profilePicker.hidden = false;
  authStatus.textContent = status;
  authStatus.hidden = !status;
  $("authLead").textContent = "Válaszd ki a profilodat a folytatáshoz.";
}

function showLogin(profileId) {
  selectedProfile = profileId;
  const profile = profiles[profileId];
  profilePicker.hidden = true;
  loginForm.hidden = false;
  authStatus.hidden = true;
  authError.hidden = true;
  passwordInput.value = "";
  $("authLead").textContent = "Add meg a jelszavad a folytatáshoz.";
  $("selectedName").textContent = profile.name;
  $("selectedAvatar").className = `profile-avatar profile-avatar--${profileId}`;
  $("selectedAvatar").textContent = profile.initials;
  requestAnimationFrame(() => passwordInput.focus());
}

async function enterApp(user) {
  document.body.dataset.userId = user.id;
  $("activeUserName").textContent = user.name;
  authScreen.hidden = true;
  $("appShell").hidden = false;

  $("switchUser").onclick = async () => {
    const button = $("switchUser");
    button.disabled = true;
    try {
      const response = await fetch("/api/auth", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("Nem sikerült kijelentkezni.");
      window.location.reload();
    } catch {
      button.disabled = false;
      const note = $("note");
      note.textContent = "A fiókváltás nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra.";
      note.hidden = false;
    }
  };

  try {
    await import("./app.js");
  } catch {
    $("appShell").hidden = true;
    authScreen.hidden = false;
    showProfiles("Nem sikerült betölteni a tanulófelületet. Frissítsd az oldalt.");
  }
}

document.querySelectorAll("[data-profile]").forEach((button) => {
  button.addEventListener("click", () => showLogin(button.dataset.profile));
});

$("backToProfiles").addEventListener("click", () => showProfiles());

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authError.hidden = true;
  const button = $("loginButton");
  button.disabled = true;
  button.textContent = "Ellenőrzés…";

  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: selectedProfile, password: passwordInput.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "A belépés nem sikerült.");
    await enterApp(result.user);
  } catch (error) {
    authError.textContent = error.message || "A belépési szolgáltatás nem érhető el.";
    authError.hidden = false;
    passwordInput.focus();
  } finally {
    button.disabled = false;
    button.textContent = "Belépés";
  }
});

async function initialize() {
  try {
    const response = await fetch("/api/auth", { cache: "no-store", credentials: "same-origin" });
    const result = await response.json();
    if (response.ok && result.user) {
      await enterApp(result.user);
      return;
    }
    showProfiles(response.ok ? "" : result.error || "A belépés most nem érhető el.");
  } catch {
    showProfiles("A belépési szolgáltatás nem érhető el. Helyi futtatáshoz használd a Vercel Devet.");
  }
}

initialize();
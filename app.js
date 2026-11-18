
const $ = (id) => document.getElementById(id);

let verifiedStudentName = "";
let verifiedInviteCode = "";

$("year").textContent = new Date().getFullYear();

function showStatus(message, type = "info") {
  const box = $("statusMessage");
  box.textContent = message;
  box.className = `status-message visible ${type}`;
}

function clearStatus() {
  $("statusMessage").textContent = "";
  $("statusMessage").className = "status-message";
}

function switchView(view) {
  clearStatus();

  $("loginForm").classList.toggle("hidden", view !== "login");
  $("registerForm").classList.toggle("hidden", view !== "register");

  document.querySelectorAll(".mode-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  if (view === "login") {
    $("formTitle").textContent = "Content de te revoir.";
    $("formSubtitle").textContent =
      "Connecte-toi pour retrouver ton espace de classe.";
  } else {
    $("formTitle").textContent = "Bienvenue parmi nous.";
    $("formSubtitle").textContent =
      "Utilise le code personnel fourni par Ziyad pour créer ton compte.";
    resetRegistration();
  }
}

document.querySelectorAll(".mode-tab").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

function resetRegistration() {
  verifiedStudentName = "";
  verifiedInviteCode = "";
  $("registerStepOne").classList.remove("hidden");
  $("registerStepTwo").classList.add("hidden");
  $("stepOneDot").classList.add("active");
  $("stepTwoDot").classList.remove("active");
  $("inviteCode").value = "";
  $("newIdentifier").value = "";
  $("newPassword").value = "";
  $("confirmPassword").value = "";
}

function showRegistrationStepTwo(name, code) {
  verifiedStudentName = name;
  verifiedInviteCode = code;

  $("greetingName").textContent = `Bonjour ${name} !`;
  $("registerStepOne").classList.add("hidden");
  $("registerStepTwo").classList.remove("hidden");
  $("stepOneDot").classList.add("active");
  $("stepTwoDot").classList.add("active");
}

// Vérification provisoire : elle sera remplacée par la vérification
// sécurisée du code dans Supabase.
$("verifyCodeButton").addEventListener("click", () => {
  const code = $("inviteCode").value.trim();

  if (!code) {
    showStatus("Saisis d'abord le code qui t'a été donné par Ziyad.", "error");
    return;
  }

  showStatus(
    "La vérification des codes sera activée lors du branchement à Supabase. Aucun code n'est validé pour le moment.",
    "info"
  );
});

// Connexion : pas de faux accès local.
// La vérification réelle sera faite par Supabase.
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const identifier = $("loginIdentifier").value.trim();
  const password = $("loginPassword").value;

  if (!identifier || !password) {
    showStatus("Renseigne ton identifiant et ton mot de passe.", "error");
    return;
  }

  showStatus(
    "La connexion sécurisée sera activée après le branchement à Supabase. Aucun compte n'est encore connecté.",
    "info"
  );
});

// Création du compte après validation du code.
// La création réelle sera faite côté serveur avec Supabase.
$("registerForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!verifiedInviteCode || !verifiedStudentName) {
    showStatus("Il faut d'abord faire vérifier ton code.", "error");
    return;
  }

  const identifier = $("newIdentifier").value.trim();
  const password = $("newPassword").value;
  const confirmation = $("confirmPassword").value;

  if (identifier.length < 3) {
    showStatus("Ton identifiant doit contenir au moins 3 caractères.", "error");
    return;
  }

  if (password.length < 8) {
    showStatus("Ton mot de passe doit contenir au moins 8 caractères.", "error");
    return;
  }

  if (password !== confirmation) {
    showStatus("Les deux mots de passe ne correspondent pas.", "error");
    return;
  }

  showStatus(
    "Le formulaire est prêt. La création sécurisée du compte et la consommation du code seront activées avec Supabase.",
    "info"
  );
});

document.querySelectorAll(".toggle-password").forEach(button => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.textContent = show ? "◎" : "◉";
  });
});

$("delegateButton").addEventListener("click", () => {
  switchView("login");
  $("loginIdentifier").focus();
  showStatus(
    "Ziyad se connectera avec son identifiant et son mot de passe habituels. Son rôle délégué sera reconnu par Supabase.",
    "info"
  );
});

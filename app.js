
const SUPABASE_URL = "https://drsiluusqoyndlcglduv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-hO6YX_UrreBu38ZyKwvJA_2IS-DhDH";

let supabaseClient = null;
let currentInvitation = null;

function showStatus(message) {
  const element = document.getElementById("statusMessage");
  if (element) element.textContent = message || "";
}

function showPage(page) {
  document.querySelectorAll("[data-page]").forEach(section => {
    section.hidden = section.dataset.page !== page;
  });
  showStatus("");
}

function showError(error) {
  showStatus(error.message || "Une erreur est survenue.");
}

function initSupabase() {
  if (!window.supabase) {
    showStatus("Supabase ne se charge pas. Vérifie Internet.");
    return false;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  return true;
}

async function callAuthFunction(action, values = {}) {
  if (!supabaseClient) throw new Error("Supabase n'est pas connecté.");

  const { data } = await supabaseClient.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/classe-5e3-auth`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ action, ...values })
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Erreur Supabase.");
  return result;
}

async function login(username, password) {
  if (!supabaseClient) throw new Error("Supabase n'est pas connecté.");

  const normalized = username.trim().toLowerCase();
  const email = normalized === "ziyad"
    ? "hamiedziyad@gmail.com"
    : `${normalized}@classe5e3.invalid`;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("first_name, username, role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    await supabaseClient.auth.signOut();
    throw profileError;
  }

  return profile;
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentInvitation = null;
  showPage("home");
}

function setupAdminTabs() {
  const tabs = document.querySelectorAll("[data-admin-tab]");
  const sections = document.querySelectorAll("[data-admin-section]");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.adminTab;

      tabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });

      sections.forEach(section => {
        section.hidden = section.dataset.adminSection !== selected;
      });

      showStatus("");
    });
  });

  if (tabs.length) {
    tabs[0].click();
  }
}

function setupButtons() {
  // Navigation générale
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  // Onglets de l'espace délégué
  setupAdminTabs();

  // Connexion élève
  document.getElementById("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const profile = await login(
        document.getElementById("loginUsername").value,
        document.getElementById("loginPassword").value
      );

      if (profile.role === "delegate") {
        showPage("delegate");
      } else {
        document.getElementById("studentWelcome").textContent =
          `Bienvenue ${profile.first_name} !`;
        showPage("student");
      }
    } catch (error) {
      showError(error);
    }
  });

  // Connexion délégué
  document.getElementById("delegateLoginForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const profile = await login(
        document.getElementById("delegateUsername").value,
        document.getElementById("delegatePassword").value
      );

      if (profile.role !== "delegate") {
        await supabaseClient.auth.signOut();
        throw new Error("Ce compte n'a pas les droits de délégué.");
      }

      showPage("delegate");
    } catch (error) {
      showError(error);
    }
  });

  // Vérifier le code d'invitation
  document.getElementById("verifyCode")?.addEventListener("click", async () => {
    showStatus("");
    currentInvitation = null;
    document.getElementById("signupFields").hidden = true;

    try {
      const code = document.getElementById("inviteCode").value.trim();
      const result = await callAuthFunction("verify_code", { code });

      currentInvitation = result;

      document.getElementById("welcomeName").textContent =
        `Bienvenue ${result.firstName} ! Tu peux créer ton compte.`;

      document.getElementById("signupFields").hidden = false;
    } catch (error) {
      showError(error);
    }
  });

  // Créer un compte élève
  document.getElementById("signupForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentInvitation) {
      showStatus("Vérifie d'abord ton code d'invitation.");
      return;
    }

    try {
      const result = await callAuthFunction("signup", {
        username: document.getElementById("newUsername").value,
        password: document.getElementById("newPassword").value,
        invitationId: currentInvitation.invitationId,
        reservationToken: currentInvitation.reservationToken
      });

      alert(result.message || "Compte créé ! Tu peux te connecter.");

      currentInvitation = null;
      event.target.reset();
      document.getElementById("signupFields").hidden = true;
      showPage("login");
    } catch (error) {
      showError(error);
    }
  });

  // Créer une invitation : cette fonction reste disponible pour Ziyad
  document.getElementById("invitationForm")?.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const firstName = document.getElementById("studentFirstName").value.trim();

      const result = await callAuthFunction("create_invitation", {
        studentFirstName: firstName
      });

      const output = document.getElementById("generatedCode");

      if (output) {
        output.hidden = false;
        output.textContent =
          `Code de ${result.studentFirstName} : ${result.code}`;
      }

      event.target.reset();
    } catch (error) {
      showError(error);
    }
  });

  // Déconnexion
  document.getElementById("studentLogout")?.addEventListener("click", logout);
  document.getElementById("delegateLogout")?.addEventListener("click", logout);
}

async function restoreSession() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) return;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("first_name, role")
    .eq("id", data.session.user.id)
    .single();

  if (error || !profile) {
    await supabaseClient.auth.signOut();
    return;
  }

  if (profile.role === "delegate") {
    showPage("delegate");
  } else {
    document.getElementById("studentWelcome").textContent =
      `Bienvenue ${profile.first_name} !`;
    showPage("student");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupButtons();

  if (initSupabase()) {
    restoreSession().catch(showError);
  }
});

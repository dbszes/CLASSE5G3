
/* =========================================
   CLASSE 5e3 — APPLICATION
========================================= */

const SUPABASE_URL = "https://drsiluusqoyndlcglduv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-hO6YX_UrreBu38ZyKwvJA_2IS-DhDH";

let supabaseClient = null;
let currentInvitation = null;
let currentProfile = null;
let currentUserId = null;

let notificationChannel = null;
let notificationItems = [];

/* =========================================
   MESSAGES
========================================= */

function showStatus(message) {
  const element = document.getElementById("statusMessage");

  if (element) {
    element.textContent = message || "";
  }
}

function showError(error) {
  console.error(error);
  showStatus(error?.message || "Une erreur est survenue.");
}

/* =========================================
   NAVIGATION DES PAGES
========================================= */

function showPage(page) {
  document.querySelectorAll("[data-page]").forEach(section => {
    section.hidden = section.dataset.page !== page;
  });

  showStatus("");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================
   INITIALISATION SUPABASE
========================================= */

function initSupabase() {
  if (!window.supabase) {
    showStatus("Impossible de charger Supabase. Vérifie Internet.");
    return false;
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  return true;
}

/* =========================================
   APPEL À LA FONCTION D'AUTHENTIFICATION
========================================= */

async function callAuthFunction(action, values = {}) {
  if (!supabaseClient) {
    throw new Error("Supabase n'est pas connecté.");
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) throw error;

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
      body: JSON.stringify({
        action,
        ...values
      })
    }
  );

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("Réponse invalide du serveur.");
  }

  if (!response.ok) {
    throw new Error(result.error || "Erreur Supabase.");
  }

  return result;
}

/* =========================================
   NOTIFICATIONS — AFFICHAGE
========================================= */

function renderNotifications() {
  const unreadCount = notificationItems.filter(
    item => !item.read_at
  ).length;

  document.querySelectorAll("[data-notification-count]").forEach(badge => {
    badge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
    badge.hidden = unreadCount === 0;
  });

  document.querySelectorAll("[data-notification-list]").forEach(list => {
    list.replaceChildren();

    if (notificationItems.length === 0) {
      const empty = document.createElement("p");
      empty.className = "notification-empty";
      empty.textContent = "Tu n'as pas encore de notifications.";
      list.appendChild(empty);
      return;
    }

    notificationItems.forEach(item => {
      const article = document.createElement("article");
      article.className = "notification-item";

      if (!item.read_at) {
        article.classList.add("unread");
      }

      const title = document.createElement("strong");
      title.textContent = item.title || "Notification";

      const body = document.createElement("p");
      body.textContent = item.body || "";

      const date = document.createElement("small");
      date.textContent = formatNotificationDate(item.created_at);

      article.appendChild(title);

      if (item.body) {
        article.appendChild(body);
      }

      article.appendChild(date);

      if (!item.read_at) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "notification-read-button";
        button.textContent = "Marquer comme lu";

        button.addEventListener("click", () => {
          markNotificationAsRead(item.id);
        });

        article.appendChild(button);
      } else {
        const readLabel = document.createElement("small");
        readLabel.textContent = "Lu";
        article.appendChild(readLabel);
      }

      list.appendChild(article);
    });
  });
}

function formatNotificationDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* =========================================
   NOTIFICATIONS — CHARGEMENT
========================================= */

async function loadNotifications() {
  if (!supabaseClient || !currentUserId) return;

  const { data, error } = await supabaseClient
    .from("notifications")
    .select("id, type, title, body, link, created_at, read_at")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Chargement des notifications :", error);
    showStatus("Impossible de charger les notifications.");
    return;
  }

  notificationItems = data || [];
  renderNotifications();
}

/* =========================================
   NOTIFICATIONS — TEMPS RÉEL
========================================= */

async function startNotificationRealtime() {
  if (!supabaseClient || !currentUserId) return;

  await stopNotificationRealtime();

  await loadNotifications();

  notificationChannel = supabaseClient
    .channel(`notifications-${currentUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUserId}`
      },
      async () => {
        await loadNotifications();
      }
    )
    .subscribe(status => {
      console.log("Notifications Realtime :", status);
    });
}

async function stopNotificationRealtime() {
  if (notificationChannel && supabaseClient) {
    await supabaseClient.removeChannel(notificationChannel);
    notificationChannel = null;
  }

  notificationItems = [];
  renderNotifications();
}

/* =========================================
   NOTIFICATIONS — MARQUER COMME LUE
========================================= */

async function markNotificationAsRead(notificationId) {
  if (!supabaseClient || !currentUserId) return;

  const { error } = await supabaseClient
    .from("notifications")
    .update({
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", currentUserId);

  if (error) {
    showError(error);
    return;
  }

  notificationItems = notificationItems.map(item => {
    if (item.id === notificationId) {
      return {
        ...item,
        read_at: new Date().toISOString()
      };
    }

    return item;
  });

  renderNotifications();
}

/* =========================================
   NOTIFICATIONS — OUVERTURE DU PANNEAU
========================================= */

function setupNotificationButtons() {
  document.querySelectorAll("[data-notification-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const page = button.closest("[data-page]");

      if (!page) return;

      const panel = page.querySelector("[data-notification-panel]");

      if (!panel) return;

      panel.hidden = !panel.hidden;
    });
  });

  document.querySelectorAll("[data-notification-close]").forEach(button => {
    button.addEventListener("click", () => {
      const panel = button.closest("[data-notification-panel]");

      if (panel) {
        panel.hidden = true;
      }
    });
  });
}

/* =========================================
   CONNEXION
========================================= */

async function login(username, password) {
  if (!supabaseClient) {
    throw new Error("Supabase n'est pas connecté.");
  }

  const normalized = username.trim().toLowerCase();

  if (!normalized || !password) {
    throw new Error("Entre ton identifiant et ton mot de passe.");
  }

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

  currentProfile = profile;
  currentUserId = data.user.id;

  return profile;
}

/* =========================================
   DÉCONNEXION
========================================= */

async function logout() {
  if (supabaseClient) {
    await stopNotificationRealtime();

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      showError(error);
      return;
    }
  }

  currentProfile = null;
  currentUserId = null;
  currentInvitation = null;

  showPage("home");
}

/* =========================================
   ONGLETS DE L'ADMINISTRATION
========================================= */

function setupAdminTabs() {
  const tabs = Array.from(
    document.querySelectorAll("[data-admin-tab]")
  );

  const sections = Array.from(
    document.querySelectorAll("[data-admin-section]")
  );

  function activateTab(name) {
    tabs.forEach(tab => {
      const active = tab.dataset.adminTab === name;

      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    sections.forEach(section => {
      section.hidden = section.dataset.adminSection !== name;
      section.classList.toggle(
        "active",
        section.dataset.adminSection === name
      );
    });

    showStatus("");
  }

  tabs.forEach(tab => {
    tab.setAttribute("role", "tab");

    tab.addEventListener("click", event => {
      event.preventDefault();
      activateTab(tab.dataset.adminTab);
    });
  });

  sections.forEach(section => {
    section.setAttribute("role", "tabpanel");
  });

  if (tabs.some(tab => tab.dataset.adminTab === "invitations")) {
    activateTab("invitations");
  } else if (tabs.length > 0) {
    activateTab(tabs[0].dataset.adminTab);
  }
}

/* =========================================
   CONNEXION ÉLÈVE
========================================= */

function setupStudentLogin() {
  const form = document.getElementById("loginForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showStatus("");

    const button = form.querySelector('button[type="submit"]');

    try {
      if (button) button.disabled = true;

      const profile = await login(
        document.getElementById("loginUsername").value,
        document.getElementById("loginPassword").value
      );

      await startNotificationRealtime();

      if (profile.role === "delegate") {
        showPage("delegate");
      } else {
        document.getElementById("studentWelcome").textContent =
          `Bienvenue ${profile.first_name} !`;

        showPage("student");
      }
    } catch (error) {
      showError(error);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* =========================================
   CONNEXION DÉLÉGUÉ
========================================= */

function setupDelegateLogin() {
  const form = document.getElementById("delegateLoginForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showStatus("");

    const button = form.querySelector('button[type="submit"]');

    try {
      if (button) button.disabled = true;

      const profile = await login(
        document.getElementById("delegateUsername").value,
        document.getElementById("delegatePassword").value
      );

      if (profile.role !== "delegate") {
        await supabaseClient.auth.signOut();
        currentProfile = null;
        currentUserId = null;

        throw new Error(
          "Ce compte ne possède pas les droits de délégué."
        );
      }

      await startNotificationRealtime();
      showPage("delegate");
    } catch (error) {
      showError(error);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* =========================================
   VÉRIFICATION DU CODE D'INVITATION
========================================= */

function setupInvitationVerification() {
  const button = document.getElementById("verifyCode");

  if (!button) return;

  button.addEventListener("click", async () => {
    showStatus("");
    currentInvitation = null;

    const fields = document.getElementById("signupFields");
    const welcome = document.getElementById("welcomeName");
    const codeInput = document.getElementById("inviteCode");

    fields.hidden = true;
    welcome.textContent = "";

    try {
      const code = codeInput.value.trim();

      if (!code) {
        throw new Error("Entre ton code d'invitation.");
      }

      button.disabled = true;

      const result = await callAuthFunction("verify_code", {
        code
      });

      currentInvitation = result;

      welcome.textContent =
        `Bienvenue ${result.firstName} ! Tu peux créer ton compte.`;

      fields.hidden = false;
    } catch (error) {
      showError(error);
    } finally {
      button.disabled = false;
    }
  });
}

/* =========================================
   CRÉATION DU COMPTE ÉLÈVE
========================================= */

function setupSignup() {
  const form = document.getElementById("signupForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showStatus("");

    if (!currentInvitation) {
      showStatus("Vérifie d'abord ton code d'invitation.");
      return;
    }

    const button = form.querySelector(
      '#signupFields button[type="submit"]'
    );

    try {
      if (button) button.disabled = true;

      const result = await callAuthFunction("signup", {
        username: document.getElementById("newUsername").value,
        password: document.getElementById("newPassword").value,
        invitationId: currentInvitation.invitationId,
        reservationToken: currentInvitation.reservationToken
      });

      alert(
        result.message ||
        "Compte créé ! Tu peux maintenant te connecter."
      );

      currentInvitation = null;

      form.reset();

      document.getElementById("signupFields").hidden = true;
      document.getElementById("welcomeName").textContent = "";

      showPage("login");
    } catch (error) {
      showError(error);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* =========================================
   CRÉATION DES INVITATIONS PAR ZIYAD
========================================= */

function setupInvitationCreation() {
  const form = document.getElementById("invitationForm");

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    showStatus("");

    const button = form.querySelector('button[type="submit"]');

    try {
      const firstName = document
        .getElementById("studentFirstName")
        .value
        .trim();

      if (!firstName) {
        throw new Error("Entre le prénom de l'élève.");
      }

      if (button) button.disabled = true;

      const result = await callAuthFunction("create_invitation", {
        studentFirstName: firstName
      });

      const output = document.getElementById("generatedCode");

      output.hidden = false;
      output.textContent =
        `Code de ${result.studentFirstName} : ${result.code}`;

      form.reset();
    } catch (error) {
      showError(error);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

/* =========================================
   NAVIGATION GÉNÉRALE
========================================= */

function setupNavigation() {
  document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.go);
    });
  });

  document.getElementById("studentLogout")
    ?.addEventListener("click", logout);

  document.getElementById("delegateLogout")
    ?.addEventListener("click", logout);
}

/* =========================================
   RESTAURATION DE SESSION
========================================= */

async function restoreSession() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) throw error;

  if (!data.session) return;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("first_name, username, role")
    .eq("id", data.session.user.id)
    .single();

  if (profileError || !profile) {
    await supabaseClient.auth.signOut();
    return;
  }

  currentProfile = profile;
  currentUserId = data.session.user.id;

  await startNotificationRealtime();

  if (profile.role === "delegate") {
    showPage("delegate");
  } else {
    document.getElementById("studentWelcome").textContent =
      `Bienvenue ${profile.first_name} !`;

    showPage("student");
  }
}

/* =========================================
   DÉMARRAGE DE L'APPLICATION
========================================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupAdminTabs();
  setupNotificationButtons();

  setupStudentLogin();
  setupDelegateLogin();

  setupInvitationVerification();
  setupSignup();
  setupInvitationCreation();

  if (!initSupabase()) return;

  try {
    await restoreSession();
  } catch (error) {
    showError(error);
  }
});

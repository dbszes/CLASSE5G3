
const SUPABASE_URL = "https://drsiluusqoyndlcglduv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-hO6YX_UrreBu38ZyKwvJA_2IS-DhDH";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/classe-5e3-auth`;

let currentInvitation = null;

function showPage(page) {
  document.querySelectorAll("[data-page]").forEach(section => {
    section.hidden = section.dataset.page !== page;
  });
  showStatus("");
}

function showStatus(message) {
  document.getElementById("statusMessage").textContent = message || "";
}

function showError(error) {
  showStatus(error.message || "Une erreur est survenue.");
}

async function callAuthFunction(action, values = {}) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ action, ...values })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erreur Supabase.");
  }

  return result;
}

async function login(username, password) {
  const normalized = username.trim().toLowerCase();

  // Le compte délégué a été créé avec son adresse e-mail personnelle.
  // Les comptes élèves utilisent l'adresse technique créée à l'inscription.
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
    throw new Error("Profil introuvable. Vérifie le compte dans Supabase.");
  }

  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentInvitation = null;
  showPage("home");
}

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

document.getElementById("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  showStatus("");

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

document.getElementById("delegateLoginForm").addEventListener("submit", async event => {
  event.preventDefault();
  showStatus("");

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

document.getElementById("verifyCode").addEventListener("click", async () => {
  showStatus("");
  currentInvitation = null;
  document.getElementById("signupFields").hidden = true;
  document.getElementById("welcomeName").textContent = "";

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

document.getElementById("signupForm").addEventListener("submit", async event => {
  event.preventDefault();
  showStatus("");

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

    alert(result.message + " Tu peux maintenant te connecter.");
    currentInvitation = null;
    event.target.reset();
    document.getElementById("signupFields").hidden = true;
    showPage("login");
  } catch (error) {
    showError(error);
  }
});

document.getElementById("invitationForm").addEventListener("submit", async event => {
  event.preventDefault();
  showStatus("");

  try {
    const firstName = document.getElementById("studentFirstName").value.trim();
    const result = await callAuthFunction("create_invitation", {
      studentFirstName: firstName
    });

    const output = document.getElementById("generatedCode");
    output.hidden = false;
    output.textContent = `Code de ${result.studentFirstName} : ${result.code}`;
    event.target.reset();
  } catch (error) {
    showError(error);
  }
});

document.getElementById("studentLogout").addEventListener("click", logout);
document.getElementById("delegateLogout").addEventListener("click", logout);

async function restoreSession() {
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

restoreSession().catch(showError);

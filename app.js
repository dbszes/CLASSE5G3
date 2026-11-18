
const SUPABASE_URL = "https://drsiluusqoyndlcglduv.supabase.co";
const SUPABASE_KEY = "sb_publishable_-hO6YX_UrreBu38ZyKwvJA_2IS-DhDH";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/classe-5e3-auth`;

async function authFunction(action, data = {}) {
  const { data: sessionData } =
    await supabaseClient.auth.getSession();

  const token = sessionData.session?.access_token;

  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ action, ...data })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Une erreur est survenue.");
  }

  return result;
}

function showMessage(message) {
  alert(message);
}

function showPage(page) {
  document.querySelectorAll("[data-page]").forEach(element => {
    element.hidden = element.dataset.page !== page;
  });
}

async function login(username, password) {
  const normalized = username.trim().toLowerCase();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: `${normalized}@classe5e3.invalid`,
    password
  });

  if (error) throw error;

  const { data: profile, error: profileError } =
    await supabaseClient
      .from("profiles")
      .select("first_name, username, role")
      .eq("id", data.user.id)
      .single();

  if (profileError) throw profileError;

  return profile;
}

async function verifyInvitation(code) {
  return await authFunction("verify_code", { code });
}

async function createStudentAccount(username, password, invitation) {
  return await authFunction("signup", {
    username,
    password,
    invitationId: invitation.invitationId,
    reservationToken: invitation.reservationToken
  });
}

async function createInvitation(firstName) {
  return await authFunction("create_invitation", {
    studentFirstName: firstName
  });
}

async function logout() {
  await supabaseClient.auth.signOut();
  showPage("home");
}

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("first_name, username, role")
    .eq("id", data.session.user.id)
    .single();

  if (profile) {
    showMessage(`Bienvenue ${profile.first_name} !`);
    showPage(profile.role === "delegate" ? "delegate" : "student");
  }
}

window.ClassApp = {
  login,
  verifyInvitation,
  createStudentAccount,
  createInvitation,
  logout,
  showPage,
  checkExistingSession
};

document.addEventListener("DOMContentLoaded", () => {
  checkExistingSession().catch(console.error);
});

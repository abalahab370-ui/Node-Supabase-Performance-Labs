const defaultApiOrigin = window.location.port === "5501"
  ? `${window.location.protocol}//${window.location.hostname}:5000`
  : window.location.origin;
const state = {
  accessToken: localStorage.getItem("diagnosticAccessToken") || "",
  apiOrigin: localStorage.getItem("diagnosticApiOrigin") || defaultApiOrigin,
  authMode: "login",
  search: { query: "", limit: 10, offset: 0, totalCount: 0 }
};

const byId = (id) => document.getElementById(id);
const ui = {
  authState: byId("authState"),
  authMessage: byId("authMessage"),
  googleMessage: byId("googleMessage"),
  accessToken: byId("accessToken"),
  apiOrigin: byId("apiOrigin"),
  saveApiOrigin: byId("saveApiOrigin"),
  signOut: byId("signOut"),
  loginForm: byId("loginForm"),
  signInMode: byId("signInMode"),
  registerMode: byId("registerMode"),
  credentialSubmit: byId("credentialSubmit"),
  googleButton: byId("googleButton"),
  applyToken: byId("applyToken"),
  searchTab: byId("searchTab"),
  reservationTab: byId("reservationTab"),
  searchPanel: byId("searchPanel"),
  reservationPanel: byId("reservationPanel"),
  searchForm: byId("searchForm"),
  searchQuery: byId("searchQuery"),
  searchLimit: byId("searchLimit"),
  searchResults: byId("searchResults"),
  searchMessage: byId("searchMessage"),
  searchTotal: byId("searchTotal"),
  searchPage: byId("searchPage"),
  searchReturned: byId("searchReturned"),
  searchTime: byId("searchTime"),
  pageSummary: byId("pageSummary"),
  previousPage: byId("previousPage"),
  nextPage: byId("nextPage"),
  reservationForm: byId("reservationForm"),
  itemId: byId("itemId"),
  quantity: byId("quantity"),
  batchSize: byId("batchSize"),
  runBenchmark: byId("runBenchmark"),
  reservationResults: byId("reservationResults"),
  reservationMessage: byId("reservationMessage"),
  metadata: byId("metadata"),
  inspectorLabel: byId("inspectorLabel")
};

ui.apiOrigin.value = state.apiOrigin;

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function setAccessToken(token) {
  state.accessToken = token.trim().replace(/^Bearer\s+/i, "");
  if (state.accessToken) {
    localStorage.setItem("diagnosticAccessToken", state.accessToken);
  } else {
    localStorage.removeItem("diagnosticAccessToken");
  }
  ui.accessToken.value = state.accessToken;
  ui.authState.textContent = state.accessToken ? "Connected" : "Token required";
  ui.authState.classList.toggle("connected", Boolean(state.accessToken));
  ui.signOut.hidden = !state.accessToken;
  setMessage(ui.authMessage, state.accessToken ? "Access token is ready for protected API requests." : "Paste a valid access token or log in.");
}

function apiUrl(path) {
  return `${state.apiOrigin.replace(/\/+$/, "")}${path}`;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isRegister = mode === "register";
  ui.signInMode.classList.toggle("active", !isRegister);
  ui.registerMode.classList.toggle("active", isRegister);
  ui.signInMode.setAttribute("aria-selected", String(!isRegister));
  ui.registerMode.setAttribute("aria-selected", String(isRegister));
  ui.credentialSubmit.textContent = isRegister ? "Create account" : "Sign in";
  byId("loginPassword").autocomplete = isRegister ? "new-password" : "current-password";
  setMessage(ui.authMessage, isRegister ? "Create an account to connect to the playground." : "Sign in to connect to the playground.");
}

function showMetadata(label, value) {
  ui.inspectorLabel.textContent = label;
  ui.metadata.textContent = JSON.stringify(value, null, 2);
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function apiRequest(url, options = {}) {
  if (!state.accessToken) throw new Error("Connect with a valid access token before making this request.");
  const response = await fetch(apiUrl(url), {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${state.accessToken}` }
  });
  return { response, body: await readResponse(response) };
}

ui.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = ui.loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  const isRegister = state.authMode === "register";
  setMessage(ui.authMessage, isRegister ? "Creating your account…" : "Signing in…");
  try {
    const response = await fetch(apiUrl(`/api/v1/auth/${isRegister ? "register" : "login"}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: byId("loginName").value.trim(),
        password: byId("loginPassword").value
      })
    });
    const body = await readResponse(response);
    if (!response.ok || !body.accessToken) {
      throw new Error(body.message || body.error || `${isRegister ? "Registration" : "Sign in"} failed with HTTP ${response.status}.`);
    }
    setAccessToken(body.accessToken);
    ui.loginForm.reset();
    setMessage(ui.authMessage, isRegister ? "Account created and connected." : "Signed in and connected.");
  } catch (error) {
    setMessage(ui.authMessage, error.message || "Unable to reach the login endpoint.", true);
  } finally {
    button.disabled = false;
  }
});

ui.applyToken.addEventListener("click", () => setAccessToken(ui.accessToken.value));
ui.signInMode.addEventListener("click", () => setAuthMode("login"));
ui.registerMode.addEventListener("click", () => setAuthMode("register"));
ui.signOut.addEventListener("click", () => setAccessToken(""));

ui.saveApiOrigin.addEventListener("click", () => {
  const origin = ui.apiOrigin.value.trim().replace(/\/+$/, "");
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash) {
        throw new Error("Enter only the backend origin, such as http://127.0.0.1:5000.");
      }
      state.apiOrigin = parsed.origin;
    } catch (error) {
      setMessage(ui.authMessage, error.message || "Enter a valid backend API origin.", true);
      return;
    }
  } else {
    state.apiOrigin = "";
  }
  localStorage.setItem("diagnosticApiOrigin", state.apiOrigin);
  ui.apiOrigin.value = state.apiOrigin;
  setMessage(ui.authMessage, `Using backend API: ${state.apiOrigin || window.location.origin}`);
  initializeGoogleSignIn();
});

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (window.googleIdentityScriptPromise) return window.googleIdentityScriptPromise;
  window.googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Google Identity Services."));
    document.head.append(script);
  });
  return window.googleIdentityScriptPromise;
}

async function initializeGoogleSignIn() {
  ui.googleButton.replaceChildren();
  setMessage(ui.googleMessage, "Loading Google sign-in…");
  try {
    const response = await fetch(apiUrl("/api/v1/auth/google/config"));
    const config = await readResponse(response);
    if (!response.ok) throw new Error(config.message || `Google config failed with HTTP ${response.status}.`);
    if (!config.clientId) {
      setMessage(ui.googleMessage, "Google sign-in is unavailable: configure GOOGLE_CLIENT_ID on the backend.", true);
      return;
    }
    await loadGoogleIdentityServices();
    window.google.accounts.id.initialize({
      client_id: config.clientId,
      callback: async ({ credential }) => {
        setMessage(ui.googleMessage, "Verifying your Google account…");
        try {
          const googleResponse = await fetch(apiUrl("/api/v1/auth/google"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credential })
          });
          const body = await readResponse(googleResponse);
          if (!googleResponse.ok || !body.accessToken) {
            throw new Error(body.message || body.error || `Google sign-in failed with HTTP ${googleResponse.status}.`);
          }
          setAccessToken(body.accessToken);
          setMessage(ui.googleMessage, "Google sign-in complete. New Google accounts are registered automatically.");
        } catch (error) {
          setMessage(ui.googleMessage, error.message || "Google sign-in failed.", true);
        }
      }
    });
    window.google.accounts.id.renderButton(ui.googleButton, {
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: Math.min(ui.googleButton.clientWidth || 280, 360)
    });
    setMessage(ui.googleMessage, "Sign in with Google. New Google accounts are registered automatically.");
  } catch (error) {
    setMessage(ui.googleMessage, error.message || "Google sign-in could not be initialized.", true);
  }
}

ui.accessToken.value = state.accessToken;
ui.authState.textContent = state.accessToken ? "Connected" : "Token required";
ui.authState.classList.toggle("connected", Boolean(state.accessToken));
ui.signOut.hidden = !state.accessToken;
initializeGoogleSignIn();

function selectTab(name) {
  const showSearch = name === "search";
  ui.searchPanel.hidden = !showSearch;
  ui.reservationPanel.hidden = showSearch;
  ui.searchTab.classList.toggle("active", showSearch);
  ui.reservationTab.classList.toggle("active", !showSearch);
  ui.searchTab.setAttribute("aria-selected", String(showSearch));
  ui.reservationTab.setAttribute("aria-selected", String(!showSearch));
}
ui.searchTab.addEventListener("click", () => selectTab("search"));
ui.reservationTab.addEventListener("click", () => selectTab("reservation"));

function renderSearchResults(posts) {
  ui.searchResults.replaceChildren();
  if (posts.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty-cell";
    cell.textContent = "No matching posts found on this page.";
    row.append(cell);
    ui.searchResults.append(row);
    return;
  }
  for (const post of posts) {
    const row = document.createElement("tr");
    const postCell = document.createElement("td");
    const title = document.createElement("strong");
    const body = document.createElement("div");
    const authorCell = document.createElement("td");
    const relevanceCell = document.createElement("td");
    title.textContent = post.title || "(Untitled post)";
    body.className = "post-body";
    body.textContent = post.body || "";
    postCell.append(title, body);
    authorCell.textContent = post.full_name || "Unknown author";
    relevanceCell.textContent = Number(post.relevance_score || 0).toFixed(3);
    row.append(postCell, authorCell, relevanceCell);
    ui.searchResults.append(row);
  }
}

async function fetchSearchPage() {
  setMessage(ui.searchMessage, "Searching…");
  const params = new URLSearchParams({
    q: state.search.query,
    limit: String(state.search.limit),
    offset: String(state.search.offset)
  });
  try {
    const { response, body } = await apiRequest(`/api/v1/search?${params}`);
    if (!response.ok || body.success === false) throw new Error(body.message || body.error || `Search failed with HTTP ${response.status}.`);
    const posts = Array.isArray(body.data) ? body.data : [];
    state.search.totalCount = Number(body.totalCount ?? body.meta?.totalCount ?? body.count ?? posts.length);
    renderSearchResults(posts);
    const page = Math.floor(state.search.offset / state.search.limit) + 1;
    const pageCount = Math.min(
      Math.max(1, Math.ceil(state.search.totalCount / state.search.limit)),
      Math.floor(500 / state.search.limit) + 1
    );
    ui.searchTotal.textContent = String(state.search.totalCount);
    ui.searchPage.textContent = `${page} / ${pageCount}`;
    ui.searchReturned.textContent = String(posts.length);
    ui.searchTime.textContent = body.meta?.executionTimeMs || "—";
    ui.pageSummary.textContent = `Showing ${posts.length ? state.search.offset + 1 : 0}–${state.search.offset + posts.length} of ${state.search.totalCount} matches`;
    ui.previousPage.disabled = state.search.offset <= 0;
    ui.nextPage.disabled =
      state.search.offset >= 500 ||
      state.search.offset + state.search.limit >= state.search.totalCount;
    setMessage(ui.searchMessage, `Search completed. ${posts.length} result(s) on this page.`);
    showMetadata("Search response", body);
  } catch (error) {
    setMessage(ui.searchMessage, error.message || "Search request failed.", true);
    showMetadata("Search error", { error: error.message });
  }
}

ui.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.search.query = ui.searchQuery.value.trim();
  state.search.limit = Number(ui.searchLimit.value);
  state.search.offset = 0;
  fetchSearchPage();
});
ui.previousPage.addEventListener("click", () => {
  state.search.offset = Math.max(0, state.search.offset - state.search.limit);
  fetchSearchPage();
});
ui.nextPage.addEventListener("click", () => {
  if (state.search.offset + state.search.limit < state.search.totalCount) {
    state.search.offset += state.search.limit;
    fetchSearchPage();
  }
});

function renderReservationResults(results) {
  ui.reservationResults.replaceChildren();
  for (const result of results) {
    const row = document.createElement("tr");
    const userCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const outcomeCell = document.createElement("td");
    const timeCell = document.createElement("td");
    userCell.textContent = result.userId;
    statusCell.textContent = String(result.status);
    const isStockRejection = result.status === 400 &&
      result.body.error?.toLowerCase().includes("insufficient stock");
    statusCell.className = result.status === 201 ? "status-success" : isStockRejection ? "status-rejected" : "status-failed";
    outcomeCell.textContent = result.status === 201 ? "Reservation secured" : result.body.error || result.body.message || "Request failed.";
    timeCell.textContent = result.body.meta?.executionTimeMs || "—";
    row.append(userCell, statusCell, outcomeCell, timeCell);
    ui.reservationResults.append(row);
  }
}

ui.reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const itemId = ui.itemId.value.trim();
  const quantity = Number(ui.quantity.value);
  const batchSize = Number(ui.batchSize.value);
  if (!itemId || !Number.isInteger(quantity) || quantity < 1) {
    setMessage(ui.reservationMessage, "Enter an item ID and a positive whole-number quantity.", true);
    return;
  }
  if (!state.accessToken) {
    setMessage(ui.reservationMessage, "Connect with a valid access token before running the test.", true);
    return;
  }

  ui.runBenchmark.disabled = true;
  ui.runBenchmark.textContent = "Running requests…";
  setMessage(ui.reservationMessage, `Sending ${batchSize} parallel reservation request(s)…`);
  const startedAt = performance.now();
  try {
    const results = await Promise.all(Array.from({ length: batchSize }, async (_, index) => {
      const userId = `usr_${index + 1}`;
      try {
        const { response, body } = await apiRequest("/api/v1/concurrency/reserve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, itemId, quantity })
        });
        return { userId, status: response.status, body };
      } catch (error) {
        return { userId, status: "Network error", body: { error: error.message } };
      }
    }));
    renderReservationResults(results);
    const successes = results.filter((result) => result.status === 201).length;
    const stockRejections = results.filter((result) =>
      result.status === 400 && result.body.error?.toLowerCase().includes("insufficient stock")
    ).length;
    const otherFailures = results.length - successes - stockRejections;
    setMessage(ui.reservationMessage, `Finished in ${(performance.now() - startedAt).toFixed(2)} ms · ${successes} secured · ${stockRejections} stock rejection(s) · ${otherFailures} other failure(s).`, otherFailures > 0);
    showMetadata("Reservation responses", results);
  } finally {
    ui.runBenchmark.disabled = false;
    ui.runBenchmark.textContent = "Run parallel requests";
  }
});

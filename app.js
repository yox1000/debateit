const modeButtons = document.querySelectorAll(".mode-button");
const switchButton = document.querySelector("#switch-mode");
const form = document.querySelector("#auth-form");
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const surveyView = document.querySelector("#survey-view");
const debateView = document.querySelector("#debate-view");
const roomView = document.querySelector("#room-view");
const profileView = document.querySelector("#profile-view");
const nameField = document.querySelector("#name-field");
const loginOptions = document.querySelector("#login-options");
const formKicker = document.querySelector("#form-kicker");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const switchText = document.querySelector("#switch-text");
const formMessage = document.querySelector("#form-message");
const myDebatesButton = document.querySelector("#my-debates");
const headerProfileButton = document.querySelector("#header-profile");
const headerProfileInitial = document.querySelector("#header-profile-initial");
const appHeaderActions = document.querySelector("#app-header-actions");
const debateHeaderActions = document.querySelector("#debate-header-actions");
const profileHeaderActions = document.querySelector("#profile-header-actions");
const accountName = document.querySelector("#account-name");
const profileSource = document.querySelector("#profile-source");
const profileStyle = document.querySelector("#profile-style");
const profileSummary = document.querySelector("#profile-summary");
const profileStats = document.querySelector("#profile-stats");
const profileTopics = document.querySelector("#profile-topics");
const profileSignals = document.querySelector("#profile-signals");
const profileSuggestions = document.querySelector("#profile-suggestions");
const profileEditForm = document.querySelector("#profile-edit-form");
const cancelProfileEditButton = document.querySelector("#cancel-profile-edit");
const profileEditMessage = document.querySelector("#profile-edit-message");
const profileHomeButton = document.querySelector("#profile-home");
const profileMenu = document.querySelector("#profile-menu");
const profileMenuName = document.querySelector("#profile-menu-name");
const profileMenuMeta = document.querySelector("#profile-menu-meta");
const profileMenuEdit = document.querySelector("#profile-menu-edit");
const profileMenuLogout = document.querySelector("#profile-menu-logout");
const matchSource = document.querySelector("#match-source");
const matchGrid = document.querySelector("#match-grid");
const topicCount = document.querySelector("#topic-count");
const topicSearch = document.querySelector("#topic-search");
const searchSuggestions = document.querySelector("#search-suggestions");
const backHomeButton = document.querySelector("#back-home");
const roomHomeButton = document.querySelector("#room-home");
const roomHeaderActions = document.querySelector("#room-header-actions");
const roomTitle = document.querySelector("#room-title");
const roomDetail = document.querySelector("#room-detail");
const chatThread = document.querySelector("#chat-thread");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const sendButton = chatForm.querySelector(".send-button");
const micButton = document.querySelector("#mic-button");
const turnStatus = document.querySelector("#turn-status");
const copilotTabs = document.querySelectorAll(".copilot-tab");
const copilotContent = document.querySelector("#copilot-content");
const debateCategory = document.querySelector("#debate-category");
const debateTitle = document.querySelector("#debate-title");
const debateTags = document.querySelector("#debate-tags");
const debatePrompt = document.querySelector("#debate-prompt");
const stanceCards = document.querySelectorAll(".stance-card");
const findOpponentButton = document.querySelector("#find-opponent");
const matchmakingStatus = document.querySelector("#matchmaking-status");
const notificationCenter = document.querySelector("#notification-center");
const mailButton = document.querySelector("#mail-button");
const notificationBadge = document.querySelector("#notification-badge");
const notificationPanel = document.querySelector("#notification-panel");
const notificationState = document.querySelector("#notification-state");
const notificationList = document.querySelector("#notification-list");
const passwordInput = document.querySelector('input[name="password"]');
const emailInput = document.querySelector('input[name="email"]');
const testAccountButtons = document.querySelectorAll("[data-login]");
const surveyForm = document.querySelector("#survey-form");
const skipSurveyButton = document.querySelector("#skip-survey");
const surveySubmitButton = surveyForm.querySelector('button[type="submit"]');

const sessionKey = "debateit.mockSession";
const detectedCountryCodeKey = "debateit.detectedCountryCode";
const countryCodes = [
  "AF", "AX", "AL", "DZ", "AS", "AD", "AO", "AI", "AQ", "AG", "AR", "AM", "AW", "AU", "AT", "AZ",
  "BS", "BH", "BD", "BB", "BY", "BE", "BZ", "BJ", "BM", "BT", "BO", "BQ", "BA", "BW", "BV", "BR",
  "IO", "BN", "BG", "BF", "BI", "CV", "KH", "CM", "CA", "KY", "CF", "TD", "CL", "CN", "CX", "CC",
  "CO", "KM", "CG", "CD", "CK", "CR", "CI", "HR", "CU", "CW", "CY", "CZ", "DK", "DJ", "DM", "DO",
  "EC", "EG", "SV", "GQ", "ER", "EE", "SZ", "ET", "FK", "FO", "FJ", "FI", "FR", "GF", "PF", "TF",
  "GA", "GM", "GE", "DE", "GH", "GI", "GR", "GL", "GD", "GP", "GU", "GT", "GG", "GN", "GW", "GY",
  "HT", "HM", "VA", "HN", "HK", "HU", "IS", "IN", "ID", "IR", "IQ", "IE", "IM", "IL", "IT", "JM",
  "JP", "JE", "JO", "KZ", "KE", "KI", "KP", "KR", "KW", "KG", "LA", "LV", "LB", "LS", "LR", "LY",
  "LI", "LT", "LU", "MO", "MG", "MW", "MY", "MV", "ML", "MT", "MH", "MQ", "MR", "MU", "YT", "MX",
  "FM", "MD", "MC", "MN", "ME", "MS", "MA", "MZ", "MM", "NA", "NR", "NP", "NL", "NC", "NZ", "NI",
  "NE", "NG", "NU", "NF", "MK", "MP", "NO", "OM", "PK", "PW", "PS", "PA", "PG", "PY", "PE", "PH",
  "PN", "PL", "PT", "PR", "QA", "RE", "RO", "RU", "RW", "BL", "SH", "KN", "LC", "MF", "PM", "VC",
  "WS", "SM", "ST", "SA", "SN", "RS", "SC", "SL", "SG", "SX", "SK", "SI", "SB", "SO", "ZA", "GS",
  "SS", "ES", "LK", "SD", "SR", "SJ", "SE", "CH", "SY", "TW", "TJ", "TZ", "TH", "TL", "TG", "TK",
  "TO", "TT", "TN", "TR", "TM", "TC", "TV", "UG", "UA", "AE", "GB", "US", "UM", "UY", "UZ", "VU",
  "VE", "VN", "VG", "VI", "WF", "EH", "YE", "ZM", "ZW",
];
const timezoneCountryMap = {
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL",
  "Europe/Stockholm": "SE",
  "Europe/Zurich": "CH",
  "Europe/Warsaw": "PL",
  "Europe/Kyiv": "UA",
  "Europe/Istanbul": "TR",
  "Asia/Dubai": "AE",
  "Asia/Jerusalem": "IL",
  "Asia/Kolkata": "IN",
  "Asia/Shanghai": "CN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Singapore": "SG",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Lagos": "NG",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
};

let currentMode = "login";
let activeUser = null;
let topicCatalog = [];
let topicCatalogVersion = "";
let userDirectory = [];
let userDebates = [];
let userProposals = [];
let messageCache = new Map();
let annotationCache = new Map();
let unreadProposalIds = new Set();
let activeTopic = null;
let selectedStance = "";
let pendingMatch = null;
let activeHeaderPanel = "";
let debateFilters = new Set();
let activeRoomDebateId = "";
let activeCopilotTab = "notes";
let pendingAnnotationSelection = null;
let statePollId = 0;
let documentGlowTimeout = 0;
let documentStatusTimeout = 0;
let realtimeSocket = null;
let realtimeReconnectTimeout = 0;
let realtimeManuallyClosed = false;
let typingTimeout = 0;
let typingBroadcastTimeout = 0;
let sendingChat = false;

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function getUsers() {
  return userDirectory;
}

function saveUsers(users) {
  userDirectory = users;
}

function getWebSocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

function upsertById(items, item) {
  if (!item?.id) {
    return items;
  }

  const existingIndex = items.findIndex((candidate) => candidate.id === item.id);

  if (existingIndex === -1) {
    return [item, ...items];
  }

  const nextItems = [...items];
  nextItems[existingIndex] = item;
  return nextItems;
}

function appendById(items, item) {
  if (!item?.id || items.some((candidate) => candidate.id === item.id)) {
    return items;
  }

  return [...items, item];
}

function sendRealtime(payload) {
  if (realtimeSocket?.readyState === WebSocket.OPEN) {
    realtimeSocket.send(JSON.stringify(payload));
  }
}

function updateRealtimeStatus(status) {
  document.body.dataset.realtime = status;

  if (activeRoomDebateId && status !== "connected") {
    turnStatus.textContent = status === "connecting" ? "Reconnecting..." : "Realtime offline. Retrying...";
  }
}

function refreshOpenRealtimeViews() {
  if (activeHeaderPanel === "mail") {
    renderNotificationCenter();
    notificationPanel.hidden = false;
  } else if (activeHeaderPanel === "debates") {
    renderMyDebates();
    notificationPanel.hidden = false;
  }

  if (activeRoomDebateId) {
    const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);

    if (debate) {
      renderChatThread(debate);
    }
  }
}

async function handleRealtimeEvent(event) {
  if (!activeUser) {
    return;
  }

  if (event.type === "proposal_found") {
    userProposals = upsertById(userProposals, event.proposal);

    if (!event.proposal.acceptedBy?.includes(activeUser.id)) {
      setUnread(activeUser.id, event.proposal.id);
    }

    await refreshUserState(false);
    notificationBadge.hidden = !hasUnread();
    refreshOpenRealtimeViews();
    return;
  }

  if (event.type === "proposal_updated") {
    userProposals = upsertById(userProposals, event.proposal);
    await refreshUserState(false);
    refreshOpenRealtimeViews();
    return;
  }

  if (event.type === "debate_started") {
    await refreshUserState(false);
    glowMyDebatesIcon();
    showMyDebatesStatus("Active", "active");
    setUnread(activeUser.id, `active-${event.debateId}`);
    notificationBadge.hidden = false;
    refreshOpenRealtimeViews();
    return;
  }

  if (event.type === "proposal_rejected" || event.type === "match_request_cancelled") {
    await refreshUserState(false);
    refreshOpenRealtimeViews();
    notificationBadge.hidden = !hasUnread();
    return;
  }

  if (event.type === "chat_message") {
    const messages = getChatMessages(event.debateId);
    saveChatMessages(event.debateId, appendById(messages, event.message));

    if (event.debateId === activeRoomDebateId) {
      const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);
      const role = getMessageRole(event.message);

      if (debate) {
        renderChatThread(debate);
      }

      turnStatus.textContent = role === "opponent" ? "Your turn" : "Waiting for opponent";
    }
    return;
  }

  if (event.type === "typing" && event.debateId === activeRoomDebateId && event.isTyping) {
    window.clearTimeout(typingTimeout);
    turnStatus.textContent = `${event.name || "Opponent"} is typing...`;
    typingTimeout = window.setTimeout(() => {
      turnStatus.textContent = "Your turn";
    }, 1800);
    return;
  }

  if (event.type === "room_presence" && event.debateId === activeRoomDebateId) {
    turnStatus.textContent = event.status === "joined"
      ? `${event.name || "Opponent"} joined`
      : `${event.name || "Opponent"} left`;
    return;
  }

  if (event.type === "annotation_created") {
    const annotations = getAnnotations(event.debateId);
    saveAnnotations(event.debateId, upsertById(annotations, event.annotation));

    if (event.debateId === activeRoomDebateId) {
      const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);

      if (debate) {
        renderChatThread(debate);
      }
    }
  }
}

function connectRealtime() {
  if (!activeUser || !("WebSocket" in window)) {
    return;
  }

  if (realtimeSocket?.readyState === WebSocket.OPEN || realtimeSocket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  realtimeManuallyClosed = false;
  window.clearTimeout(realtimeReconnectTimeout);
  updateRealtimeStatus("connecting");

  realtimeSocket = new WebSocket(getWebSocketUrl());

  realtimeSocket.addEventListener("open", () => {
    updateRealtimeStatus("connected");
    sendRealtime({ type: "subscribe" });

    if (activeRoomDebateId) {
      sendRealtime({ type: "join_room", debateId: activeRoomDebateId });
    }
  });

  realtimeSocket.addEventListener("message", (messageEvent) => {
    try {
      handleRealtimeEvent(JSON.parse(messageEvent.data)).catch(() => {});
    } catch {
      // Ignore malformed realtime messages so one bad event does not break the UI.
    }
  });

  realtimeSocket.addEventListener("close", () => {
    realtimeSocket = null;
    updateRealtimeStatus("offline");

    if (!realtimeManuallyClosed && activeUser) {
      realtimeReconnectTimeout = window.setTimeout(connectRealtime, 1500);
    }
  });
}

function disconnectRealtime() {
  realtimeManuallyClosed = true;
  window.clearTimeout(realtimeReconnectTimeout);
  updateRealtimeStatus("offline");

  if (realtimeSocket) {
    realtimeSocket.close();
    realtimeSocket = null;
  }
}

function getLocalDebates() {
  return userDebates;
}

function saveLocalDebates(debates) {
  userDebates = debates;
}

function upsertLocalDebate(debate) {
  const debates = getLocalDebates();
  const existingIndex = debates.findIndex((candidate) => candidate.id === debate.id);

  if (existingIndex === -1) {
    debates.unshift(debate);
  } else {
    debates[existingIndex] = {
      ...debates[existingIndex],
      ...debate,
    };
  }

  saveLocalDebates(debates);
}

function getMatchQueue() {
  return pendingMatch ? [pendingMatch] : [];
}

function saveMatchQueue(queue) {
  pendingMatch = queue.at(-1) || null;
}

function getDebatesForUser(userId) {
  return userId === activeUser?.id ? userDebates : [];
}

function saveDebatesForUser(userId, debates) {
  if (userId === activeUser?.id) {
    userDebates = debates;
  }
}

function upsertDebateForUser(userId, debate) {
  const debates = getDebatesForUser(userId);
  const existingIndex = debates.findIndex((candidate) => candidate.id === debate.id);

  if (existingIndex === -1) {
    debates.unshift(debate);
  } else {
    debates[existingIndex] = {
      ...debates[existingIndex],
      ...debate,
    };
  }

  saveDebatesForUser(userId, debates);
}

function getMatchProposals() {
  return userProposals;
}

function saveMatchProposals(proposals) {
  userProposals = proposals;
}

function getUserProposals(userId = activeUser?.id) {
  return getMatchProposals().filter((proposal) => proposal.users.some((user) => user.userId === userId));
}

function getPendingUserProposals(userId = activeUser?.id) {
  return getUserProposals(userId).filter((proposal) => !proposal.acceptedBy?.includes(userId));
}

function getUnreadUsers() {
  return hasUnread() ? [activeUser?.id] : [];
}

function setUnread(_userId, proposalId = null) {
  if (proposalId) {
    unreadProposalIds.add(proposalId);
  }
}

function clearUnread(_userId = activeUser?.id) {
  unreadProposalIds.clear();
}

function hasUnread(userId = activeUser?.id) {
  return Boolean(userId) && unreadProposalIds.size > 0;
}

function glowMyDebatesIcon() {
  window.clearTimeout(documentGlowTimeout);
  myDebatesButton.classList.add("attention-glow");
  documentGlowTimeout = window.setTimeout(() => {
    myDebatesButton.classList.remove("attention-glow");
  }, 5000);
}

function showMyDebatesStatus(label, tone = "pending", mode = "label") {
  window.clearTimeout(documentStatusTimeout);
  myDebatesButton.dataset.status = label;
  myDebatesButton.dataset.statusTone = tone;
  myDebatesButton.dataset.statusMode = mode;
  documentStatusTimeout = window.setTimeout(() => {
    delete myDebatesButton.dataset.status;
    delete myDebatesButton.dataset.statusTone;
    delete myDebatesButton.dataset.statusMode;
  }, 5000);
}

function cleanupFakeOpponentDebates() {
  // Old localStorage cleanup is no longer needed now that debate state is server-backed.
}

function updateStoredUser(user) {
  activeUser = user;
  userDirectory = [user, ...userDirectory.filter((candidate) => candidate.id !== user.id)];
  return user;
}

function showMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.dataset.type = type;
}

function clearMessage() {
  formMessage.textContent = "";
  delete formMessage.dataset.type;
}

function formatSource(source) {
  if (!source) {
    return "Local";
  }

  return source.charAt(0).toUpperCase() + source.slice(1);
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getExperienceLevel(xp = 0) {
  if (xp >= 250) {
    return { label: "Arena Veteran", next: null, progress: 100 };
  }

  if (xp >= 100) {
    return { label: "Policy Builder", next: 250, progress: Math.round((xp / 250) * 100) };
  }

  if (xp >= 50) {
    return { label: "Calm Rebutter", next: 100, progress: Math.round((xp / 100) * 100) };
  }

  return { label: "Newcomer", next: 50, progress: Math.round((xp / 50) * 100) };
}

function countryCodeToFlag(code) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function getCountryDisplayName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function getCountryNameByCode(code) {
  return getCountryDisplayName(code.toUpperCase());
}

function normalizeCountryCode(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  return countryCodes.includes(normalizedCode) ? normalizedCode : "";
}

function getCountryCodeByName(name) {
  const normalizedName = String(name || "").trim().toLowerCase();
  return countryCodes.find((code) => getCountryDisplayName(code).toLowerCase() === normalizedName) || "";
}

function getBrowserRegionCode() {
  return (
    navigator.languages
      ?.map((language) => {
        try {
          return normalizeCountryCode(new Intl.Locale(language).region);
        } catch {
          return "";
        }
      })
      .find(Boolean) || ""
  );
}

function getDetectedCountryName() {
  const savedCountryCode = normalizeCountryCode(localStorage.getItem(detectedCountryCodeKey));
  const localeRegion = getBrowserRegionCode();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countryCode = savedCountryCode || localeRegion || timezoneCountryMap[timezone] || "";

  return countryCode ? getCountryNameByCode(countryCode) : "";
}

function setCountrySelectValue(select, countryName) {
  const option = Array.from(select.options).find((candidate) => candidate.value === countryName);

  if (option) {
    select.value = countryName;
  }
}

async function getGeolocatedCountryName() {
  if (!("geolocation" in navigator) || !window.isSecureContext) {
    return "";
  }

  const coords = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      {
        enableHighAccuracy: false,
        maximumAge: 24 * 60 * 60 * 1000,
        timeout: 6000,
      },
    );
  });

  if (!coords) {
    return "";
  }

  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
        coords.latitude,
      )}&longitude=${encodeURIComponent(coords.longitude)}&localityLanguage=en`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    const countryCode = normalizeCountryCode(data.countryCode);

    if (!countryCode) {
      return "";
    }

    localStorage.setItem(detectedCountryCodeKey, countryCode);
    return getCountryNameByCode(countryCode);
  } catch {
    return "";
  }
}

function applyDetectedCountryDefault(select, fallbackCountry) {
  const startingValue = select.value;

  getGeolocatedCountryName().then((countryName) => {
    if (!countryName || (select.value && select.value !== startingValue && select.value !== fallbackCountry)) {
      return;
    }

    setCountrySelectValue(select, countryName);
  });
}

function populateCountrySelect() {
  const select = profileEditForm.elements.country;
  const selectedValue = select.value;
  const countries = countryCodes
    .map((code) => ({
      code,
      name: getCountryDisplayName(code),
      flag: countryCodeToFlag(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select country";
  select.append(placeholder);

  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.name;
    option.textContent = `${country.flag} ${country.name}`;
    select.append(option);
  });

  select.value = selectedValue;
}

function fillProfileEditForm(user) {
  const profile = user.debateProfile || {};
  const countrySelect = profileEditForm.elements.country;
  profileEditForm.elements.name.value = user.name || "";
  populateCountrySelect();
  if (user.country) {
    setCountrySelectValue(countrySelect, user.country);
  } else {
    const detectedCountry = getDetectedCountryName();
    setCountrySelectValue(countrySelect, detectedCountry);
    applyDetectedCountryDefault(countrySelect, detectedCountry);
  }
  profileEditForm.elements.debateStyle.value = profile.debateStyle || "Exploratory";
  profileEditForm.elements.interests.value = (profile.topics?.length ? profile.topics : user.interests || []).join(", ");
  profileEditForm.elements.debateBio.value = user.debateBio || "";
  profileEditMessage.textContent = "";
}

function createChip(text) {
  const chip = document.createElement("span");
  chip.className = "profile-chip";
  chip.textContent = text;
  return chip;
}

function setNotificationVisibility(isVisible) {
  notificationCenter.hidden = !isVisible;

  if (!isVisible) {
    notificationPanel.hidden = true;
  }
}

function mountNotificationCenter(container) {
  if (container && notificationCenter.parentElement !== container) {
    const insertAfter = container.querySelector("#my-debates");

    if (insertAfter) {
      insertAfter.after(notificationCenter);
    } else {
      container.prepend(notificationCenter);
    }
  }
}

function mountProfileButton(container) {
  if (!container) {
    return;
  }

  if (headerProfileButton.parentElement !== container) {
    const homeButton = container.querySelector(".home-button");

    if (homeButton) {
      homeButton.before(headerProfileButton);
    } else {
      container.append(headerProfileButton);
    }
  }

  if (profileMenu.parentElement !== container) {
    container.append(profileMenu);
  }
}

function updateHeaderProfile(user = activeUser) {
  const name = user?.name || user?.email || "Debater";
  const level = getExperienceLevel(user?.xp || 0);
  headerProfileInitial.textContent = name.trim().charAt(0).toUpperCase() || "D";
  headerProfileButton.title = `${name} profile`;
  profileMenuName.textContent = name;
  profileMenuMeta.textContent = `${level.label} • ${user?.xp || 0} XP`;
}

function renderNotificationCenter() {
  activeHeaderPanel = "mail";
  notificationPanel.querySelector(".notification-head strong").textContent = "Match inbox";
  const proposals = getUserProposals();
  const activeDebates = getLocalDebates().filter((debate) => debate.status === "active");
  notificationBadge.hidden = !hasUnread();
  notificationPanel.hidden = true;
  notificationList.replaceChildren();

  if (proposals.length) {
    notificationState.textContent = proposals.some((proposal) => !proposal.acceptedBy?.includes(activeUser.id))
      ? "Potential match"
      : "Waiting";
    proposals.forEach((proposal) => {
      const opponent = proposal.users.find((user) => user.userId !== activeUser.id);
      const accepted = proposal.acceptedBy || [];
      const currentAccepted = accepted.includes(activeUser.id);
      const card = document.createElement("article");
      const body = document.createElement("button");
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      const actions = document.createElement("div");
      const accept = document.createElement("button");
      const ignore = document.createElement("button");
      const deny = document.createElement("button");

      card.className = "potential-match-card";
      body.className = "potential-match-row";
      body.type = "button";
      actions.className = "mini-actions";
      accept.className = "mini-action accept-action";
      ignore.className = "mini-action ignore-action";
      deny.className = "mini-action deny-action";
      accept.type = "button";
      ignore.type = "button";
      deny.type = "button";
      title.textContent = proposal.topicTitle;
      detail.textContent = currentAccepted
        ? `Waiting for ${getUserName(opponent.userId)} to accept • They argue ${opponent.stance}`
        : `Potential match with ${getUserName(opponent.userId)} • They argue ${opponent.stance}`;
      accept.textContent = currentAccepted ? "Waiting" : "Accept";
      accept.disabled = currentAccepted;
      ignore.textContent = "Ignore";
      deny.textContent = "Deny";
      body.append(title, detail);
      body.addEventListener("click", () => {
        clearUnread();
        notificationBadge.hidden = true;
        renderProposalDetails(proposal.id);
      });
      accept.addEventListener("click", () => acceptProposal(proposal.id));
      ignore.addEventListener("click", () => {
        clearUnread();
        notificationBadge.hidden = true;
        notificationPanel.hidden = true;
      });
      deny.addEventListener("click", () => rejectProposal(proposal.id));
      actions.append(accept, ignore, deny);
      card.append(body, actions);
      notificationList.append(card);
    });
    return;
  }

  if (activeDebates.length) {
    notificationState.textContent = "Matched";
    const matched = document.createElement("p");
    matched.textContent = "You have an active debate match. Open My debates to view it.";
    notificationList.append(matched);
    return;
  }

  if (!pendingMatch) {
    notificationState.textContent = "No new matches";
    const empty = document.createElement("p");
    empty.textContent = "No active debate invitations.";
    notificationList.append(empty);
    return;
  }

  if (!pendingMatch.opponent) {
    notificationState.textContent = "Searching";
    const searching = document.createElement("p");
    searching.textContent = "Your debate request is open. When another account matches, it will appear here.";
    notificationList.append(searching, createCancelButton());
  }
}

function getMockUserStats(userId) {
  const proposalUser = userProposals.flatMap((proposal) => proposal.users || []).find((user) => user.userId === userId);

  if (proposalUser?.stats) {
    return proposalUser.stats;
  }

  const stats = {
    "empty-account": { country: "United States", since: "2026", xp: 12, level: "Newcomer" },
    "alex-account": { country: "United States", since: "2026", xp: 120, level: "Policy Builder" },
    "sam-account": { country: "Canada", since: "2026", xp: 95, level: "Calm Rebutter" },
  };

  return stats[userId] || { country: "Unknown", since: "2026", xp: 25, level: "New Debater" };
}

function renderProposalDetails(proposalId) {
  const proposal = getMatchProposals().find((candidate) => candidate.id === proposalId);

  clearUnread();
  notificationBadge.hidden = true;

  if (!proposal) {
    renderNotificationCenter();
    notificationPanel.hidden = false;
    return;
  }

  const opponent = proposal.users.find((user) => user.userId !== activeUser.id);
  const current = proposal.users.find((user) => user.userId === activeUser.id);
  const stats = getMockUserStats(opponent.userId);
  const accepted = proposal.acceptedBy || [];

  notificationPanel.querySelector(".notification-head strong").textContent = "Potential match";
  notificationState.textContent = accepted.includes(activeUser.id) ? "Waiting" : "Review";
  notificationList.replaceChildren();

  const card = document.createElement("article");
  const title = document.createElement("h3");
  const detail = document.createElement("p");
  const meta = document.createElement("dl");
  const interests = document.createElement("div");
  const bio = document.createElement("p");
  const xp = document.createElement("div");
  const actions = document.createElement("div");
  const accept = document.createElement("button");
  const reject = document.createElement("button");

  card.className = "notification-card";
  meta.className = "opponent-meta";
  interests.className = "opponent-interests";
  bio.className = "opponent-bio";
  xp.className = "experience-bar";
  actions.className = "notification-actions";
  accept.className = "primary-button compact-button";
  reject.className = "secondary-button compact-button";
  accept.type = "button";
  reject.type = "button";
  title.textContent = getUserName(opponent.userId);
  detail.textContent = `${proposal.topicTitle} • Your side: ${current.stance} • Their side: ${opponent.stance}`;
  xp.innerHTML = `<span style="width:${Math.min(stats.xp, 100)}%"></span>`;

  [
    ["Level", stats.level],
    ["XP", String(stats.xp)],
    ["Country", stats.country],
    ["User since", stats.since],
    ["Style", stats.debateStyle || "Exploratory"],
  ].forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    meta.append(term, description);
  });

  (stats.interests?.length ? stats.interests : ["General debate"]).slice(0, 4).forEach((topic) => {
    interests.append(createChip(topic));
  });
  bio.textContent = stats.debateBio || stats.summary || "No debate bio added yet.";

  accept.textContent = accepted.includes(activeUser.id) ? "Accepted" : "Accept";
  accept.disabled = accepted.includes(activeUser.id);
  reject.textContent = "Reject";

  accept.addEventListener("click", () => acceptProposal(proposal.id));
  reject.addEventListener("click", () => rejectProposal(proposal.id));

  actions.append(accept, reject);
  card.append(title, detail, meta, interests, bio, xp, actions);
  notificationList.append(card);
}

function createDebateRecord(debate) {
  return {
    id: debate.id,
    status: debate.status,
    title: debate.topicTitle,
    detail: debate.detail || "No details yet.",
  };
}

function getUserName(userId) {
  const proposalUser = userProposals.flatMap((proposal) => proposal.users || []).find((user) => user.userId === userId);
  return proposalUser?.name || getUsers().find((user) => user.id === userId)?.name || "Opponent";
}

function removePendingDebate(userId, requestId) {
  saveDebatesForUser(
    userId,
    getDebatesForUser(userId).filter((debate) => debate.id !== requestId),
  );
}

function createActiveDebateFromMatch(currentRequest, opponentRequest) {
  const debateId = currentRequest.id || `match-${Date.now()}`;
  const now = Date.now();

  upsertDebateForUser(currentRequest.userId, {
    id: debateId,
    status: "active",
    topicTitle: currentRequest.topicTitle,
    detail: `Matched with ${getUserName(opponentRequest.userId)}. Your side: ${currentRequest.stance}.`,
    updatedAt: now,
  });

  upsertDebateForUser(opponentRequest.userId, {
    id: debateId,
    status: "active",
    topicTitle: currentRequest.topicTitle,
    detail: `Matched with ${getUserName(currentRequest.userId)}. Your side: ${opponentRequest.stance}.`,
    updatedAt: now,
  });

  return debateId;
}

function syncAcceptedProposals() {
  const proposals = getMatchProposals();
  const remaining = [];

  proposals.forEach((proposal) => {
    if ((proposal.acceptedBy || []).length === proposal.users.length) {
      const [first, second] = proposal.users;
      createActiveDebateFromMatch(
        {
          id: proposal.id,
          userId: first.userId,
          topicId: proposal.topicId,
          topicTitle: proposal.topicTitle,
          stance: first.stance,
        },
        {
          id: proposal.id,
          userId: second.userId,
          topicId: proposal.topicId,
          topicTitle: proposal.topicTitle,
          stance: second.stance,
        },
      );
    } else {
      remaining.push(proposal);
    }
  });

  if (remaining.length !== proposals.length) {
    saveMatchProposals(remaining);
  }
}

function createProposalFromMatch(currentRequest, opponentRequest) {
  const proposalId = `proposal-${Date.now()}`;
  const now = Date.now();
  const proposal = {
    id: proposalId,
    topicId: currentRequest.topicId,
    topicTitle: currentRequest.topicTitle,
    users: [
      { userId: currentRequest.userId, stance: currentRequest.stance, requestId: currentRequest.id },
      { userId: opponentRequest.userId, stance: opponentRequest.stance, requestId: opponentRequest.id },
    ],
    acceptedBy: [],
    createdAt: now,
  };

  saveMatchProposals([proposal, ...getMatchProposals()]);
  setUnread(currentRequest.userId);
  setUnread(opponentRequest.userId);

  proposal.users.forEach((user) => {
    removePendingDebate(user.userId, user.requestId);
    upsertDebateForUser(user.userId, {
      id: proposalId,
      status: "pending",
      topicTitle: proposal.topicTitle,
      detail: `Potential match with ${getUserName(
        proposal.users.find((candidate) => candidate.userId !== user.userId).userId,
      )}. Waiting for both sides to accept.`,
      updatedAt: now,
    });
  });

  return proposal;
}

async function acceptProposal(proposalId) {
  const result = await apiRequest(`/api/proposals/${encodeURIComponent(proposalId)}/accept`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await refreshUserState(false);
  clearUnread();
  notificationBadge.hidden = true;

  if (result.debateId) {
    glowMyDebatesIcon();
    showMyDebatesStatus("Active", "active");
    renderNotificationCenter();
  } else {
    showMyDebatesStatus("", "pending", "dot");
    renderProposalDetails(proposalId);
  }

  notificationPanel.hidden = false;
}

async function rejectProposal(proposalId) {
  await apiRequest(`/api/proposals/${encodeURIComponent(proposalId)}/reject`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  await refreshUserState(false);
  clearUnread();
  notificationBadge.hidden = true;
  renderNotificationCenter();
  notificationPanel.hidden = false;
}

function getDebateRecords() {
  return getLocalDebates().map(createDebateRecord);
}

function renderMyDebates() {
  const statuses = ["pending", "active", "closed"];
  const allRecords = getDebateRecords();
  const records = debateFilters.size
    ? allRecords.filter((record) => debateFilters.has(record.status))
    : allRecords;
  const filterBar = document.createElement("div");
  const list = document.createElement("div");

  notificationState.textContent = debateFilters.size
    ? Array.from(debateFilters).map(formatStatus).join(", ")
    : "All";
  filterBar.className = "debate-filter-bar";
  list.className = "debate-record-list";

  statuses.forEach((status) => {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = formatStatus(status);
    button.classList.toggle("active", debateFilters.has(status));
    button.addEventListener("click", () => {
      if (debateFilters.has(status)) {
        debateFilters.delete(status);
      } else {
        debateFilters.add(status);
      }

      if (debateFilters.size === statuses.length) {
        debateFilters.clear();
      }

      renderMyDebates();
    });
    filterBar.append(button);
  });

  if (!records.length) {
    const empty = document.createElement("p");
    empty.textContent = debateFilters.size ? "No debates match those filters." : "No debates yet.";
    list.append(empty);
  } else {
    records.forEach((record) => {
      const item = document.createElement(record.status === "active" ? "button" : "article");
      const title = document.createElement("h3");
      const detail = document.createElement("p");

      item.className = "debate-record";
      if (record.status === "active") {
        item.type = "button";
        item.classList.add("clickable-record");
        item.addEventListener("click", () => showDebateRoom(record.id));
      }
      title.textContent = record.title;
      detail.textContent = record.detail;
      item.append(title, detail);
      list.append(item);
    });
  }

  notificationList.replaceChildren(filterBar, list);
}

function createCancelButton() {
  const cancel = document.createElement("button");
  cancel.className = "secondary-button compact-button";
  cancel.type = "button";
  cancel.textContent = "Cancel queue";
  cancel.addEventListener("click", () => {
    clearPendingMatch(true);
  });
  return cancel;
}

async function clearPendingMatch(updateStatus) {
  if (pendingMatch) {
    await apiRequest(`/api/match-requests/${encodeURIComponent(pendingMatch.id)}/cancel`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await refreshUserState(false);
  }

  pendingMatch = null;
  notificationBadge.hidden = true;
  renderNotificationCenter();

  if (updateStatus) {
    matchmakingStatus.textContent = selectedStance
      ? "Matchmaking cancelled. You can start a new search."
      : "Pick a side before entering the matchmaking queue.";
    findOpponentButton.disabled = !selectedStance;
    findOpponentButton.textContent = "Find opponent";
  }
}

function renderProfile(user) {
  const profile = user.debateProfile || null;
  const topics = profile?.topics?.length ? profile.topics : user.interests || [];
  const suggestedTopics = profile?.suggestedTopics || [];
  const matchingSignals = profile?.matchingSignals || {};
  const prefers = matchingSignals.prefers || [];
  const avoids = matchingSignals.avoids || [];

  profileSource.textContent = formatSource(profile?.source);
  profileStyle.textContent = profile?.debateStyle || "Profile pending";
  profileSummary.textContent =
    profile?.summary || "Complete the first-login survey to generate debate recommendations.";
  profileStats.replaceChildren();
  const level = getExperienceLevel(user.xp || 0);
  [
    `${level.label}`,
    `${user.xp || 0} XP`,
    user.country || "Country unset",
  ].forEach((value) => profileStats.append(createChip(value)));
  fillProfileEditForm(user);

  profileTopics.replaceChildren();
  (topics.length ? topics : ["General debate"]).forEach((topic) => {
    profileTopics.append(createChip(topic));
  });

  profileSignals.replaceChildren();
  [
    ["Difficulty", matchingSignals.difficulty || "Casual"],
    ["Prefers", prefers.length ? prefers.join(", ") : "Clear rounds, civil rebuttals"],
    ["Avoids", avoids.length ? avoids.join(", ") : "None listed"],
  ].forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = value;
    profileSignals.append(term, description);
  });

  profileSuggestions.replaceChildren();
  (
    suggestedTopics.length
      ? suggestedTopics
      : ["Should online anonymity be protected?", "Should AI tools be allowed in classrooms?"]
  ).forEach((topic) => {
    const item = document.createElement("li");
    item.textContent = topic;
    profileSuggestions.append(item);
  });
}

function renderMatches(result) {
  const matches = result?.matches || [];

  matchSource.textContent = formatSource(result?.source || "local");
  matchGrid.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "profile-summary";
    empty.textContent = "No topic matches yet. Complete the survey to generate recommendations.";
    matchGrid.append(empty);
    return;
  }

  matches.forEach((match) => {
    const card = document.createElement("article");
    const meta = document.createElement("div");
    const category = document.createElement("span");
    const score = document.createElement("span");
    const title = document.createElement("h3");
    const reason = document.createElement("p");
    const stance = document.createElement("p");

    card.className = "match-card";
    meta.className = "match-meta";
    category.className = "match-category";
    score.className = "match-score";
    stance.className = "stance-prompt";

    category.textContent = match.category || "Debate";
    score.textContent = `${match.score || 0}% match`;
    title.textContent = match.title || "Untitled debate";
    reason.textContent = match.reason || "Recommended from your debate profile.";
    stance.textContent = match.stancePrompt || "Choose a side and prepare your opening argument.";

    meta.append(category, score);
    card.append(meta, title, reason, stance);
    card.addEventListener("click", () => {
      const topic = topicCatalog.find((candidate) => candidate.id === match.topicId) || {
        id: match.topicId,
        title: match.title,
        category: match.category,
        tags: [],
      };
      showDebateTopic(topic, match.stancePrompt);
    });
    matchGrid.append(card);
  });
}

function topicToMatch(topic, reason = "Selected from topic search.") {
  return {
    topicId: topic.id,
    title: topic.title,
    category: topic.category,
    score: 100,
    reason,
    stancePrompt: "Choose a side to start a debate on this topic.",
  };
}

function hideSearchSuggestions() {
  searchSuggestions.hidden = true;
  searchSuggestions.replaceChildren();
}

function showSearchSuggestions(topics) {
  searchSuggestions.replaceChildren();

  if (!topics.length) {
    const row = document.createElement("div");
    row.className = "suggestion-empty";
    row.textContent = "No topics found";
    searchSuggestions.append(row);
    searchSuggestions.hidden = false;
    return;
  }

  topics.slice(0, 6).forEach((topic) => {
    const button = document.createElement("button");
    const title = document.createElement("span");
    const meta = document.createElement("span");

    button.className = "suggestion-row";
    button.type = "button";
    title.textContent = topic.title;
    meta.textContent = topic.category;

    button.append(title, meta);
    button.addEventListener("click", () => {
      topicSearch.value = topic.title;
      hideSearchSuggestions();
      renderMatches({
        source: "search",
        matches: [topicToMatch(topic, "Selected from your topic search.")],
      });
      showDebateTopic(topic, "Choose a side to start a debate on this topic.");
    });

    searchSuggestions.append(button);
  });

  searchSuggestions.hidden = false;
}

function searchTopics(query) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    hideSearchSuggestions();
    return;
  }

  const terms = normalizedQuery.split(/\s+/);
  const results = topicCatalog.filter((topic) => {
    const text = [topic.title, topic.category, ...(topic.tags || [])].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  showSearchSuggestions(results);
}

async function loadTopicCatalog() {
  if (topicCatalog.length) {
    searchTopics(topicSearch.value);
    return topicCatalog;
  }

  try {
    const response = await fetch("/api/topics");
    const data = await response.json();
    topicCatalog = data.topics || [];
    topicCatalogVersion = data.version || `${topicCatalog.length}`;
    topicCount.textContent = `${topicCatalog.length} topics`;
    searchTopics(topicSearch.value);
  } catch {
    topicCount.textContent = "Unavailable";
  }

  return topicCatalog;
}

function createMatchSignature(user) {
  return JSON.stringify({
    catalogVersion: topicCatalogVersion || user.matchCatalogVersion || "",
    profile: user.debateProfile || {},
  });
}

async function loadMatches(user) {
  const matchSignature = createMatchSignature(user);

  if (user.debateMatches?.matches?.length && user.matchSignature === matchSignature) {
    renderMatches(user.debateMatches);
    return;
  }

  renderMatches({ source: "loading", matches: [] });

  try {
    const response = await fetch("/api/matches", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debateProfile: user.debateProfile || {},
        limit: 8,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.matches) {
      throw new Error(result.error || "Match request failed");
    }

    const updatedUser = updateStoredUser({
      ...user,
      debateMatches: result,
      matchCatalogVersion: result.catalogVersion || topicCatalogVersion,
      matchSignature,
    });

    renderMatches(updatedUser.debateMatches);
  } catch {
    const fallbackMatches = {
      source: "local",
      catalogVersion: topicCatalogVersion,
      matches: (user.debateProfile?.suggestedTopics || []).map((topic, index) => ({
        topicId: `local-${index}`,
        title: topic,
        category: user.debateProfile?.topics?.[0] || "General",
        score: 70 - index * 5,
        reason: "Fallback recommendation from your saved profile.",
        stancePrompt: "Choose the side you can argue most clearly.",
      })),
    };

    updateStoredUser({
      ...user,
      debateMatches: fallbackMatches,
      matchCatalogVersion: topicCatalogVersion,
      matchSignature,
    });
    renderMatches(fallbackMatches);
  }
}

async function refreshUserState(markUnread = false) {
  if (!activeUser) {
    userDebates = [];
    userProposals = [];
    return;
  }

  const [debatesData, proposalsData] = await Promise.all([
    apiRequest(`/api/users/${encodeURIComponent(activeUser.id)}/debates`),
    apiRequest(`/api/users/${encodeURIComponent(activeUser.id)}/proposals`),
  ]);
  const previousProposalIds = new Set(userProposals.map((proposal) => proposal.id));
  const previousActiveIds = new Set(
    userDebates.filter((debate) => debate.status === "active").map((debate) => debate.id),
  );
  const hadPreviousDebates = userDebates.length > 0;

  userDebates = debatesData.debates || [];
  userProposals = proposalsData.proposals || [];

  if (markUnread) {
    userProposals.forEach((proposal) => {
      if (!previousProposalIds.has(proposal.id) && !proposal.acceptedBy?.includes(activeUser.id)) {
        unreadProposalIds.add(proposal.id);
      }
    });
  }

  const newActiveDebate = userDebates.find(
    (debate) => debate.status === "active" && !previousActiveIds.has(debate.id),
  );

  if (hadPreviousDebates && newActiveDebate) {
    glowMyDebatesIcon();
    showMyDebatesStatus("Active", "active");
    setUnread(activeUser.id, `active-${newActiveDebate.id}`);
  }

  notificationBadge.hidden = !hasUnread();
}

function startStatePolling() {
  window.clearInterval(statePollId);
  statePollId = window.setInterval(() => {
    if (activeUser) {
      refreshUserState(true).catch(() => {});
    }
  }, 30000);
}

function stopStatePolling() {
  window.clearInterval(statePollId);
  statePollId = 0;
}

function leaveActiveRoom() {
  if (activeRoomDebateId) {
    sendRealtime({ type: "leave_room", debateId: activeRoomDebateId });
    activeRoomDebateId = "";
  }
}

async function showApp(user) {
  leaveActiveRoom();
  activeUser = user;
  connectRealtime();
  mountNotificationCenter(appHeaderActions);
  mountProfileButton(appHeaderActions);
  updateHeaderProfile(user);
  accountName.textContent = user.name || "Debater";
  renderProfile(user);
  await loadTopicCatalog();
  await refreshUserState(true);
  startStatePolling();
  loadMatches(activeUser);
  setNotificationVisibility(true);
  authView.hidden = true;
  surveyView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  profileView.hidden = true;
  appView.hidden = false;
  document.title = "Debate.it | Home";
}

function showAuth() {
  stopStatePolling();
  leaveActiveRoom();
  disconnectRealtime();
  activeUser = null;
  userDebates = [];
  userProposals = [];
  messageCache = new Map();
  annotationCache = new Map();
  unreadProposalIds.clear();
  profileMenu.hidden = true;
  setNotificationVisibility(false);
  authView.hidden = false;
  surveyView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  profileView.hidden = true;
  appView.hidden = true;
  document.title = "Debate.it | Login";
}

function showSurvey(user) {
  leaveActiveRoom();
  activeUser = user;
  setNotificationVisibility(false);
  authView.hidden = true;
  appView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  profileView.hidden = true;
  surveyView.hidden = false;
  document.title = "Debate.it | Survey";
}

function showProfilePage() {
  if (!activeUser) {
    showAuth();
    return;
  }

  leaveActiveRoom();
  mountNotificationCenter(profileHeaderActions);
  mountProfileButton(profileHeaderActions);
  updateHeaderProfile();
  fillProfileEditForm(activeUser);
  profileMenu.hidden = true;
  notificationPanel.hidden = true;
  authView.hidden = true;
  appView.hidden = true;
  surveyView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  profileView.hidden = false;
  setNotificationVisibility(true);
  document.title = "Debate.it | Profile";
}

function showDebateTopic(topic, prompt) {
  leaveActiveRoom();
  activeTopic = topic;
  selectedStance = "";
  mountNotificationCenter(debateHeaderActions);
  mountProfileButton(debateHeaderActions);
  updateHeaderProfile();
  debateCategory.textContent = topic.category || "Topic";
  debateTitle.textContent = topic.title || "Selected debate topic";
  debatePrompt.textContent = prompt || "Choose a side to start a debate on this topic.";
  matchmakingStatus.textContent = "Pick a side before entering the matchmaking queue.";
  findOpponentButton.disabled = true;
  findOpponentButton.textContent = "Find opponent";
  stanceCards.forEach((card) => card.classList.remove("selected"));
  debateTags.replaceChildren();

  (topic.tags || []).forEach((tag) => {
    debateTags.append(createChip(tag));
  });

  authView.hidden = true;
  appView.hidden = true;
  surveyView.hidden = true;
  roomView.hidden = true;
  profileView.hidden = true;
  debateView.hidden = false;
  setNotificationVisibility(true);
  document.title = "Debate.it | Debate";
}

async function showDebateRoom(debateId) {
  const debate = getLocalDebates().find((candidate) => candidate.id === debateId);

  if (!debate || debate.status !== "active") {
    return;
  }

  mountNotificationCenter(roomHeaderActions);
  mountProfileButton(roomHeaderActions);
  updateHeaderProfile();
  activeRoomDebateId = debateId;
  pendingAnnotationSelection = null;
  roomTitle.textContent = debate.topicTitle;
  roomDetail.textContent = debate.detail;
  await loadRoomState(debateId);
  sendRealtime({ type: "join_room", debateId });
  renderChatThread(debate);
  notificationPanel.hidden = true;
  authView.hidden = true;
  appView.hidden = true;
  surveyView.hidden = true;
  debateView.hidden = true;
  profileView.hidden = true;
  roomView.hidden = false;
  setNotificationVisibility(true);
  document.title = "Debate.it | Room";
}

function getChatKey(debateId) {
  return `debateit.chat.${debateId}`;
}

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getChatMessages(debateId) {
  const saved = messageCache.get(debateId) || null;

  if (saved?.length) {
    let changed = false;
    const normalized = saved.map((message) => {
      if (message.id) {
        return message;
      }

      changed = true;
      return {
        ...message,
        id: createLocalId("message"),
      };
    });

    if (changed) {
      saveChatMessages(debateId, normalized);
    }

    return normalized;
  }

  const starter = [
    {
      id: createLocalId("message"),
      speaker: "system",
      text: "Debate started. Keep arguments focused, civil, and evidence-based.",
      at: Date.now(),
    },
  ];

  saveChatMessages(debateId, starter);
  return starter;
}

function saveChatMessages(debateId, messages) {
  messageCache.set(debateId, messages);
}

function getAnnotations(debateId = activeRoomDebateId) {
  if (!debateId) {
    return [];
  }

  return annotationCache.get(debateId) || [];
}

function saveAnnotations(debateId, annotations) {
  annotationCache.set(debateId, annotations);
}

async function loadRoomState(debateId) {
  const [messagesData, annotationsData] = await Promise.all([
    apiRequest(`/api/debates/${encodeURIComponent(debateId)}/messages`),
    apiRequest(`/api/debates/${encodeURIComponent(debateId)}/annotations`),
  ]);

  messageCache.set(debateId, messagesData.messages || []);
  annotationCache.set(debateId, annotationsData.annotations || []);
}

function renderMessageText(message) {
  const fragment = document.createDocumentFragment();
  const annotations = getAnnotations(activeRoomDebateId)
    .filter((annotation) => annotation.messageId === message.id)
    .sort((a, b) => a.start - b.start);
  let cursor = 0;

  annotations.forEach((annotation) => {
    const start = Math.max(cursor, annotation.start);
    const end = Math.min(message.text.length, annotation.end);

    if (start >= end) {
      return;
    }

    if (start > cursor) {
      fragment.append(document.createTextNode(message.text.slice(cursor, start)));
    }

    const mark = document.createElement("mark");
    mark.className = "annotation-highlight";
    mark.dataset.annotationId = annotation.id;
    mark.textContent = message.text.slice(start, end);
    fragment.append(mark);
    cursor = end;
  });

  if (cursor < message.text.length) {
    fragment.append(document.createTextNode(message.text.slice(cursor)));
  }

  return fragment;
}

function getMessageTextElement(node) {
  if (!node) {
    return null;
  }

  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  return element?.closest(".message-text") || null;
}

function getSelectionOffset(container, rangeBoundaryNode, rangeBoundaryOffset) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(rangeBoundaryNode, rangeBoundaryOffset);
  return range.toString().length;
}

function captureAnnotationSelection() {
  const selection = window.getSelection();

  if (!activeRoomDebateId || !selection || selection.isCollapsed || !selection.rangeCount) {
    return;
  }

  const range = selection.getRangeAt(0);
  const startText = getMessageTextElement(range.startContainer);
  const endText = getMessageTextElement(range.endContainer);
  const quote = selection.toString().trim();

  if (!quote || !startText || startText !== endText) {
    return;
  }

  const start = getSelectionOffset(startText, range.startContainer, range.startOffset);
  const end = getSelectionOffset(startText, range.endContainer, range.endOffset);

  if (start === end) {
    return;
  }

  pendingAnnotationSelection = {
    debateId: activeRoomDebateId,
    messageId: startText.dataset.messageId,
    speaker: startText.dataset.speaker,
    start: Math.min(start, end),
    end: Math.max(start, end),
    quote,
  };
  activeCopilotTab = "notes";
  renderCopilot(getChatMessages(activeRoomDebateId), getLocalDebates().find((debate) => debate.id === activeRoomDebateId));
}

async function savePendingAnnotation(note) {
  if (!pendingAnnotationSelection || !note.trim()) {
    return;
  }

  const debateId = pendingAnnotationSelection.debateId;
  const { annotation } = await apiRequest(`/api/debates/${encodeURIComponent(debateId)}/annotations`, {
    method: "POST",
      body: JSON.stringify({
        ...pendingAnnotationSelection,
        note: note.trim(),
      }),
  });

  const annotations = getAnnotations(debateId);
  annotations.unshift(annotation);
  saveAnnotations(debateId, annotations);
  pendingAnnotationSelection = null;
  window.getSelection()?.removeAllRanges();
  renderChatThread(getLocalDebates().find((debate) => debate.id === debateId));
}

function scrollToAnnotation(annotationId, target = "note") {
  if (target === "highlight") {
    const mark = chatThread.querySelector(`[data-annotation-id="${annotationId}"]`);

    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      mark.classList.add("pulse");
      window.setTimeout(() => mark.classList.remove("pulse"), 900);
    }

    return;
  }

  activeCopilotTab = "notes";
  renderCopilot(getChatMessages(activeRoomDebateId), getLocalDebates().find((debate) => debate.id === activeRoomDebateId));

  const note = copilotContent.querySelector(`[data-note-id="${annotationId}"]`);

  if (note) {
    note.scrollIntoView({ behavior: "smooth", block: "center" });
    note.classList.add("active");
    window.setTimeout(() => note.classList.remove("active"), 900);
  }
}

function getMessageRole(message) {
  if (message.speaker === "system") {
    return "system";
  }

  if (message.userId && activeUser?.id) {
    return message.userId === activeUser.id ? "me" : "opponent";
  }

  return message.speaker === "opponent" ? "opponent" : "me";
}

function getMessageLabel(message) {
  const role = getMessageRole(message);

  if (role === "system") {
    return "System";
  }

  return role === "me" ? "You" : message.authorName || getRoomOpponent()?.name || "Opponent";
}

function getRoomOpponent() {
  const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);
  return debate?.participants?.find((participant) => participant.userId !== activeUser?.id) || null;
}

function formatMessageTime(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderChatThread(debate) {
  const messages = getChatMessages(debate.id);

  chatThread.replaceChildren();
  messages.forEach((message) => {
    const bubble = document.createElement("article");
    const meta = document.createElement("div");
    const label = document.createElement("span");
    const time = document.createElement("span");
    const text = document.createElement("p");
    const role = getMessageRole(message);

    bubble.className = `chat-message ${role}`;
    meta.className = "message-meta";
    label.textContent = getMessageLabel(message);
    time.textContent = role === "me" ? `Sent ${formatMessageTime(message.at)}` : formatMessageTime(message.at);
    text.className = "message-text";
    text.dataset.messageId = message.id;
    text.dataset.speaker = role;
    text.append(renderMessageText(message));
    meta.append(label, time);
    bubble.append(meta, text);
    chatThread.append(bubble);
  });
  chatThread.scrollTop = chatThread.scrollHeight;
  renderCopilot(messages, debate);
}

async function addChatMessage(speaker, text) {
  if (!activeRoomDebateId || !text.trim()) {
    return;
  }

  if (sendingChat) {
    return false;
  }

  const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);

  sendingChat = true;
  sendButton.disabled = true;
  turnStatus.textContent = "Sending...";

  try {
    const { message } = await apiRequest(`/api/debates/${encodeURIComponent(activeRoomDebateId)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        text: text.trim(),
      }),
    });
    const messages = getChatMessages(activeRoomDebateId);
    saveChatMessages(activeRoomDebateId, appendById(messages, message));

    if (debate) {
      renderChatThread(debate);
    }

    return true;
  } catch (error) {
    turnStatus.textContent = error.message || "Could not send message.";
    return false;
  } finally {
    sendingChat = false;
    sendButton.disabled = false;
  }
}

function getDebateSide(detail = "") {
  return detail.match(/Your side: ([^.]+)/)?.[1] || "your stance";
}

function summarizeMessage(message) {
  const text = message.text.trim();
  const compact = text.length > 116 ? `${text.slice(0, 113)}...` : text;
  return `${getMessageLabel(message)}: ${compact}`;
}

function findFactSignals(messages) {
  const claimWords = ["study", "studies", "data", "evidence", "research", "percent", "%", "always", "never", "prove"];
  const debateMessages = messages.filter((message) => getMessageRole(message) !== "system");
  const flagged = debateMessages.filter((message) =>
    claimWords.some((word) => message.text.toLowerCase().includes(word)),
  );

  if (flagged.length) {
    return flagged.slice(-3).map((message) => ({
      claim: message.text.length > 96 ? `${message.text.slice(0, 93)}...` : message.text,
      status: "Needs source",
      question: "Ask for a citation, example, or clearer evidence before building on it.",
    }));
  }

  return [
    {
      claim: "No specific factual claim flagged yet.",
      status: "Watching",
      question: "When someone uses numbers, studies, or broad factual claims, they will show here.",
    },
  ];
}

function buildCopilotState(messages, debate = {}) {
  const debateMessages = messages.filter((message) => getMessageRole(message) !== "system");
  const recent = debateMessages.slice(-4);
  const last = debateMessages.at(-1);
  const side = getDebateSide(debate.detail);
  const unansweredOpponent = [...debateMessages].reverse().find((message) => getMessageRole(message) === "opponent");
  const notes = recent.length
    ? recent.map(summarizeMessage)
    : [`You are arguing ${side}. Start with one clear claim and one reason.`];
  const factChecks = findFactSignals(messages);
  const focus =
    getMessageRole(last || {}) === "opponent"
      ? "Answer the opponent's last point directly before adding a new argument."
      : unansweredOpponent
        ? "Tie your next point back to the strongest opponent claim so the debate does not drift."
        : `State the clearest reason for ${side}, then define what would count as evidence.`;

  return {
    notes,
    factChecks,
    focus,
  };
}

function renderCopilotList(items) {
  const list = document.createElement("ul");
  list.className = "copilot-list";

  items.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  });

  return list;
}

function renderCopilotFacts(factChecks) {
  const list = document.createElement("div");
  list.className = "fact-list";

  factChecks.forEach((fact) => {
    const card = document.createElement("article");
    const claim = document.createElement("strong");
    const status = document.createElement("span");
    const question = document.createElement("p");

    claim.textContent = fact.claim;
    status.textContent = fact.status;
    question.textContent = fact.question;
    card.append(claim, status, question);
    list.append(card);
  });

  return list;
}

function renderAnnotationNotes() {
  const wrap = document.createElement("div");
  const annotations = getAnnotations(activeRoomDebateId);

  wrap.className = "annotation-notes";

  if (pendingAnnotationSelection?.debateId === activeRoomDebateId) {
    const editor = document.createElement("form");
    const quote = document.createElement("blockquote");
    const textarea = document.createElement("textarea");
    const actions = document.createElement("div");
    const save = document.createElement("button");
    const cancel = document.createElement("button");

    editor.className = "annotation-editor";
    quote.textContent = pendingAnnotationSelection.quote;
    textarea.rows = 3;
    textarea.placeholder = "Write a note about this highlight...";
    actions.className = "annotation-actions";
    save.className = "primary-button compact-button";
    cancel.className = "secondary-button compact-button";
    save.type = "submit";
    cancel.type = "button";
    save.textContent = "Save note";
    cancel.textContent = "Cancel";
    actions.append(save, cancel);
    editor.append(quote, textarea, actions);
    editor.addEventListener("submit", async (event) => {
      event.preventDefault();
      await savePendingAnnotation(textarea.value);
    });
    cancel.addEventListener("click", () => {
      pendingAnnotationSelection = null;
      window.getSelection()?.removeAllRanges();
      renderCopilot(getChatMessages(activeRoomDebateId), getLocalDebates().find((debate) => debate.id === activeRoomDebateId));
    });
    wrap.append(editor);
    window.setTimeout(() => textarea.focus(), 0);
  }

  if (!annotations.length) {
    const empty = document.createElement("p");
    empty.className = "annotation-empty";
    empty.textContent = "Highlight text in the conversation to attach a note.";
    wrap.append(empty);
    return wrap;
  }

  const list = document.createElement("div");
  list.className = "annotation-list";

  annotations.forEach((annotation) => {
    const note = document.createElement("button");
    const quote = document.createElement("strong");
    const text = document.createElement("span");

    note.className = "annotation-note";
    note.type = "button";
    note.dataset.noteId = annotation.id;
    quote.textContent = annotation.quote;
    text.textContent = annotation.note;
    note.append(quote, text);
    note.addEventListener("click", () => scrollToAnnotation(annotation.id, "highlight"));
    list.append(note);
  });

  wrap.append(list);
  return wrap;
}

function renderCopilot(messages, debate = {}) {
  const state = buildCopilotState(messages, debate);

  copilotTabs.forEach((tab) => {
    const isActive = tab.dataset.copilotTab === activeCopilotTab;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  copilotContent.replaceChildren();

  if (activeCopilotTab === "facts") {
    copilotContent.append(renderCopilotFacts(state.factChecks));
    return;
  }

  if (activeCopilotTab === "focus") {
    const card = document.createElement("div");
    card.className = "focus-card";
    card.textContent = state.focus;
    copilotContent.append(card);
    return;
  }

  copilotContent.append(renderAnnotationNotes());
}

function startSpeechToText() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    turnStatus.textContent = "Speech to text is not supported in this browser.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micButton.disabled = true;
  turnStatus.textContent = "Listening...";

  recognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    chatInput.value = [chatInput.value.trim(), transcript].filter(Boolean).join(" ");
    chatInput.focus();
  });

  recognition.addEventListener("error", () => {
    turnStatus.textContent = "Could not capture speech. Try typing instead.";
  });

  recognition.addEventListener("end", () => {
    micButton.disabled = false;
    if (turnStatus.textContent === "Listening...") {
      turnStatus.textContent = "Your turn";
    }
  });

  recognition.start();
}

async function startSession(user) {
  localStorage.setItem(sessionKey, "active");

  if (user.surveyCompleted) {
    await showApp(user);
  } else {
    showSurvey(user);
  }
}

async function restoreSession() {
  try {
    const { user } = await apiRequest("/api/auth/session");

    if (user.surveyCompleted) {
      await showApp(user);
    } else {
      showSurvey(user);
    }
  } catch {
    localStorage.removeItem(sessionKey);
    showAuth();
  }
}

function setMode(mode) {
  currentMode = mode;
  const isSignup = mode === "signup";

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  nameField.hidden = !isSignup;
  nameField.querySelector("input").required = isSignup;
  loginOptions.hidden = isSignup;
  passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
  formKicker.textContent = isSignup ? "Join the room" : "Welcome back";
  formTitle.textContent = isSignup ? "Create your account" : "Log in to Debate.it";
  submitButton.textContent = isSignup ? "Sign up" : "Log in";
  switchText.textContent = isSignup ? "Already have an account?" : "New to Debate.it?";
  switchButton.textContent = isSignup ? "Log in" : "Create an account";
  clearMessage();
}

async function logIn(email, password) {
  try {
    const { user } = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await startSession(user);
  } catch (error) {
    showMessage(error.message || "No account matches those credentials.");
  }
}

async function signUp(formData) {
  const name = formData.get("name").trim();
  const email = formData.get("email").trim().toLowerCase();
  const password = formData.get("password");

  if (!name || !email || !password) {
    showMessage("Name, email, and password are required for sign-up.");
    return;
  }

  if (!email.includes("@")) {
    showMessage("Use an email-shaped value for this mock account.");
    return;
  }

  try {
    const { user } = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    await startSession(user);
  } catch (error) {
    showMessage(error.message || "Could not create that account.");
  }
}

function createLocalProfile(selectedTopics, debateBio) {
  const text = `${selectedTopics.join(" ")} ${debateBio}`.toLowerCase();
  const topics = new Set(selectedTopics);

  if (text.includes("ai") || text.includes("tech") || text.includes("phone") || text.includes("social media")) {
    topics.add("Technology");
  }

  if (text.includes("law") || text.includes("policy") || text.includes("government") || text.includes("rights")) {
    topics.add("Politics");
  }

  if (text.includes("moral") || text.includes("ethic") || text.includes("fair") || text.includes("bias")) {
    topics.add("Ethics");
  }

  if (text.includes("school") || text.includes("media") || text.includes("society")) {
    topics.add("Culture");
  }

  return {
    source: "local",
    topics: Array.from(topics).slice(0, 5),
    debateStyle: text.includes("policy") || text.includes("law") ? "Policy-focused" : "Exploratory",
    summary: "Interested in debates with clear claims, tradeoffs, and civil rebuttals.",
    suggestedTopics: [
      "Should schools ban smartphones during class?",
      "Is online anonymity good for public debate?",
      "Should AI-generated content be labeled everywhere?",
    ],
    matchingSignals: {
      difficulty: "casual",
      prefers: ["clear time limits", "evidence-based arguments"],
      avoids: [],
    },
  };
}

async function createDebateProfile(selectedTopics, debateBio) {
  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedTopics, debateBio }),
    });

    const data = await response.json();

    if (!response.ok || !data.profile) {
      throw new Error(data.error || "Profile request failed");
    }

    return data.profile;
  } catch {
    return createLocalProfile(selectedTopics, debateBio);
  }
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

switchButton.addEventListener("click", () => {
  setMode(currentMode === "login" ? "signup" : "login");
});

async function signOut() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Local sign-out should still clear browser state if the server is unreachable.
  }

  localStorage.removeItem(sessionKey);
  form.reset();
  setMode("login");
  profileMenu.hidden = true;
  showAuth();
}

headerProfileButton.addEventListener("click", (event) => {
  event.stopPropagation();

  if (!activeUser) {
    return;
  }

  updateHeaderProfile(activeUser);
  notificationPanel.hidden = true;
  profileMenu.hidden = !profileMenu.hidden;
});

profileMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

profileMenuEdit.addEventListener("click", () => {
  showProfilePage();
});

profileMenuLogout.addEventListener("click", signOut);

profileHomeButton.addEventListener("click", () => {
  if (activeUser) {
    showApp(activeUser);
  }
});

cancelProfileEditButton.addEventListener("click", () => {
  profileEditMessage.textContent = "";
  if (activeUser) {
    showApp(activeUser);
  }
});

profileEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activeUser) {
    return;
  }

  const formData = new FormData(profileEditForm);
  const interests = String(formData.get("interests") || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean)
    .slice(0, 6);
  const debateBio = String(formData.get("debateBio") || "").trim();
  const debateStyle = String(formData.get("debateStyle") || "Exploratory");
  const existingProfile = activeUser.debateProfile || {};

  try {
    const { user } = await apiRequest(`/api/users/${encodeURIComponent(activeUser.id)}/profile`, {
      method: "PUT",
      body: JSON.stringify({
        name: String(formData.get("name") || "").trim(),
        country: String(formData.get("country") || "").trim(),
        interests,
        debateBio,
        debateProfile: {
          ...existingProfile,
          source: existingProfile.source || "manual",
          topics: interests,
          debateStyle,
          summary: debateBio || existingProfile.summary || "Open to clear, civil debate.",
        },
      }),
    });

    activeUser = user;
    updateHeaderProfile(user);
    renderProfile(user);
    profileEditMessage.textContent = "Profile saved.";
  } catch (error) {
    profileEditMessage.textContent = error.message || "Could not save profile.";
  }
});

topicSearch.addEventListener("input", () => {
  searchTopics(topicSearch.value);
});

topicSearch.addEventListener("focus", () => {
  searchTopics(topicSearch.value);
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-field")) {
    hideSearchSuggestions();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  const formData = new FormData(form);

  if (currentMode === "login") {
    await logIn(formData.get("email"), formData.get("password"));
    return;
  }

  await signUp(formData);
});

testAccountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode("login");
    emailInput.value = button.dataset.login;
    passwordInput.value = button.dataset.password;
    logIn(button.dataset.login, button.dataset.password);
  });
});

backHomeButton.addEventListener("click", () => {
  if (activeUser) {
    showApp(activeUser);
  }
});

roomHomeButton.addEventListener("click", () => {
  if (activeUser) {
    showApp(activeUser);
  }
});

stanceCards.forEach((card) => {
  card.addEventListener("click", () => {
    selectedStance = card.dataset.stance;
    stanceCards.forEach((candidate) => candidate.classList.toggle("selected", candidate === card));
    findOpponentButton.disabled = false;
    matchmakingStatus.textContent = `You selected ${selectedStance}. Matching may take time because debates wait for a real compatible opponent.`;
  });
});

findOpponentButton.addEventListener("click", async () => {
  if (!activeTopic || !selectedStance) {
    return;
  }

  findOpponentButton.disabled = true;
  findOpponentButton.textContent = "Finding opponent...";
  matchmakingStatus.textContent =
    "Finding an opponent. This may take time, so we will notify you in the mail icon when someone matches.";

  try {
    const result = await apiRequest("/api/match-requests", {
      method: "POST",
      body: JSON.stringify({
        topicId: activeTopic.id,
        topicTitle: activeTopic.title,
        stance: selectedStance,
        topicCategory: activeTopic.category || "",
        topicTags: activeTopic.tags || [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      }),
    });

    await refreshUserState(false);

    if (result.status === "proposal") {
      pendingMatch = null;
      userProposals = [
        result.proposal,
        ...userProposals.filter((proposal) => proposal.id !== result.proposal.id),
      ];
      setUnread(activeUser.id, result.proposal.id);
      findOpponentButton.textContent = "Potential match";
      matchmakingStatus.textContent = "Potential match found. You still need to accept it in the mail inbox.";
      notificationBadge.hidden = false;
      renderNotificationCenter();
      notificationPanel.hidden = false;
      return;
    }

    pendingMatch = result.request;
    findOpponentButton.textContent = "Finding opponent...";
  } catch (error) {
    findOpponentButton.disabled = false;
    findOpponentButton.textContent = "Find opponent";
    matchmakingStatus.textContent = error.message || "Could not start matchmaking.";
  }
});

mailButton.addEventListener("click", async () => {
  const wasHidden = notificationPanel.hidden;
  await refreshUserState(true);
  profileMenu.hidden = true;
  clearUnread();
  renderNotificationCenter();
  notificationBadge.hidden = true;
  notificationPanel.hidden = !wasHidden;
  activeHeaderPanel = notificationPanel.hidden ? "" : "mail";
});

notificationPanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

myDebatesButton.addEventListener("click", async () => {
  mountNotificationCenter(appHeaderActions);
  activeHeaderPanel = "debates";
  debateFilters.clear();
  await refreshUserState(false);
  profileMenu.hidden = true;
  notificationPanel.querySelector(".notification-head strong").textContent = "My debates";
  renderMyDebates();
  notificationPanel.hidden = false;
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  const sent = await addChatMessage("me", message);

  if (sent) {
    chatInput.value = "";
    sendRealtime({ type: "typing", debateId: activeRoomDebateId, isTyping: false });
    turnStatus.textContent = "Waiting for opponent";
  }
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatInput.addEventListener("input", () => {
  if (!activeRoomDebateId) {
    return;
  }

  window.clearTimeout(typingBroadcastTimeout);
  sendRealtime({ type: "typing", debateId: activeRoomDebateId, isTyping: Boolean(chatInput.value.trim()) });
  typingBroadcastTimeout = window.setTimeout(() => {
    sendRealtime({ type: "typing", debateId: activeRoomDebateId, isTyping: false });
  }, 1200);
});

micButton.addEventListener("click", startSpeechToText);

chatThread.addEventListener("mouseup", () => {
  window.setTimeout(captureAnnotationSelection, 0);
});

chatThread.addEventListener("click", (event) => {
  const highlight = event.target.closest(".annotation-highlight");

  if (highlight) {
    event.preventDefault();
    scrollToAnnotation(highlight.dataset.annotationId, "note");
  }
});

copilotTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);

    activeCopilotTab = tab.dataset.copilotTab;
    renderCopilot(getChatMessages(activeRoomDebateId), debate);
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-actions")) {
    notificationPanel.hidden = true;
    profileMenu.hidden = true;
    activeHeaderPanel = "";
  }
});

surveyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!activeUser) {
    showAuth();
    return;
  }

  const formData = new FormData(surveyForm);
  const interests = formData.getAll("topics");
  const debateBio = formData.get("debateBio").trim();
  const originalSubmitText = surveySubmitButton.textContent;

  surveySubmitButton.disabled = true;
  surveySubmitButton.textContent = "Generating profile...";

  const debateProfile = await createDebateProfile(interests, debateBio);
  surveySubmitButton.disabled = false;
  surveySubmitButton.textContent = originalSubmitText;

  try {
    const { user } = await apiRequest(`/api/users/${encodeURIComponent(activeUser.id)}/profile`, {
      method: "PUT",
      body: JSON.stringify({ interests, debateBio, debateProfile }),
    });

    surveyForm.reset();
    await showApp(user);
  } catch {
    localStorage.removeItem(sessionKey);
    showAuth();
  }
});

skipSurveyButton.addEventListener("click", async () => {
  if (!activeUser) {
    showAuth();
    return;
  }

  try {
    const { user } = await apiRequest(`/api/users/${encodeURIComponent(activeUser.id)}/profile`, {
      method: "PUT",
      body: JSON.stringify({
        interests: activeUser.interests || [],
        debateBio: activeUser.debateBio || "",
        debateProfile: activeUser.debateProfile || null,
      }),
    });
    await showApp(user);
  } catch {
    showAuth();
  }
});

cleanupFakeOpponentDebates();
restoreSession();

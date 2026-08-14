const modeButtons = document.querySelectorAll(".mode-button");
const switchButton = document.querySelector("#switch-mode");
const form = document.querySelector("#auth-form");
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const surveyView = document.querySelector("#survey-view");
const debateView = document.querySelector("#debate-view");
const roomView = document.querySelector("#room-view");
const nameField = document.querySelector("#name-field");
const loginOptions = document.querySelector("#login-options");
const formKicker = document.querySelector("#form-kicker");
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector("#submit-button");
const switchText = document.querySelector("#switch-text");
const formMessage = document.querySelector("#form-message");
const signOutButton = document.querySelector("#sign-out");
const myDebatesButton = document.querySelector("#my-debates");
const appHeaderActions = document.querySelector("#app-header-actions");
const debateHeaderActions = document.querySelector("#debate-header-actions");
const accountName = document.querySelector("#account-name");
const profileSource = document.querySelector("#profile-source");
const profileStyle = document.querySelector("#profile-style");
const profileSummary = document.querySelector("#profile-summary");
const profileTopics = document.querySelector("#profile-topics");
const profileSignals = document.querySelector("#profile-signals");
const profileSuggestions = document.querySelector("#profile-suggestions");
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

const usersKey = "debateit.mockUsers";
const sessionKey = "debateit.mockSession";
const debatesKey = "debateit.localDebates";
const matchQueueKey = "debateit.matchQueue";
const proposalsKey = "debateit.matchProposals";
const unreadKey = "debateit.unreadNotifications";
const annotationsKey = "debateit.annotations";
const cleanupKey = "debateit.cleanedFakeBlueGavel";
const seedUsers = [
  {
    id: "empty-account",
    name: "Test Account",
    email: "",
    password: "",
    xp: 0,
  },
  {
    id: "alex-account",
    name: "Alex",
    email: "alex@debate.it",
    password: "test",
    xp: 120,
  },
  {
    id: "sam-account",
    name: "Sam",
    email: "sam@debate.it",
    password: "test",
    xp: 95,
  },
];

let currentMode = "login";
let activeUser = null;
let topicCatalog = [];
let topicCatalogVersion = "";
let activeTopic = null;
let selectedStance = "";
let pendingMatch = null;
let activeHeaderPanel = "";
let debateFilters = new Set();
let activeRoomDebateId = "";
let activeCopilotTab = "notes";
let pendingAnnotationSelection = null;

function getUsers() {
  const savedUsers = JSON.parse(localStorage.getItem(usersKey) || "[]");
  const savedEmails = new Set(savedUsers.map((user) => user.email));
  const missingSeeds = seedUsers.filter((user) => !savedEmails.has(user.email));
  const users = [...missingSeeds, ...savedUsers];

  localStorage.setItem(usersKey, JSON.stringify(users));
  return users;
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function getLocalDebates() {
  const key = `${debatesKey}.${activeUser?.id || "anonymous"}`;
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function saveLocalDebates(debates) {
  const key = `${debatesKey}.${activeUser?.id || "anonymous"}`;
  localStorage.setItem(key, JSON.stringify(debates));
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
  return JSON.parse(localStorage.getItem(matchQueueKey) || "[]");
}

function saveMatchQueue(queue) {
  localStorage.setItem(matchQueueKey, JSON.stringify(queue));
}

function getDebateStorageKey(userId) {
  return `${debatesKey}.${userId}`;
}

function getDebatesForUser(userId) {
  return JSON.parse(localStorage.getItem(getDebateStorageKey(userId)) || "[]");
}

function saveDebatesForUser(userId, debates) {
  localStorage.setItem(getDebateStorageKey(userId), JSON.stringify(debates));
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
  return JSON.parse(localStorage.getItem(proposalsKey) || "[]");
}

function saveMatchProposals(proposals) {
  localStorage.setItem(proposalsKey, JSON.stringify(proposals));
}

function getUserProposals(userId = activeUser?.id) {
  return getMatchProposals().filter((proposal) => proposal.users.some((user) => user.userId === userId));
}

function getPendingUserProposals(userId = activeUser?.id) {
  return getUserProposals(userId).filter((proposal) => !proposal.acceptedBy?.includes(userId));
}

function getUnreadUsers() {
  return JSON.parse(localStorage.getItem(unreadKey) || "[]");
}

function setUnread(userId) {
  localStorage.setItem(unreadKey, JSON.stringify(Array.from(new Set([...getUnreadUsers(), userId]))));
}

function clearUnread(userId = activeUser?.id) {
  localStorage.setItem(unreadKey, JSON.stringify(getUnreadUsers().filter((candidate) => candidate !== userId)));
}

function hasUnread(userId = activeUser?.id) {
  return getUnreadUsers().includes(userId);
}

function cleanupFakeOpponentDebates() {
  if (localStorage.getItem(cleanupKey)) {
    return;
  }

  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${debatesKey}.`))
    .forEach((key) => {
      const debates = JSON.parse(localStorage.getItem(key) || "[]").filter(
        (debate) =>
          !String(debate.detail || "").includes("Blue Gavel") &&
          !String(debate.detail || "").includes("Match accepted. Debate room setup pending."),
      );
      localStorage.setItem(key, JSON.stringify(debates));
    });

  localStorage.setItem(cleanupKey, "true");
}

function updateStoredUser(user) {
  const users = getUsers();
  const userIndex = users.findIndex((candidate) => candidate.id === user.id);

  if (userIndex === -1) {
    return user;
  }

  users[userIndex] = user;
  saveUsers(users);
  activeUser = user;
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

function renderNotificationCenter() {
  activeHeaderPanel = "mail";
  notificationPanel.querySelector(".notification-head strong").textContent = "Match inbox";
  const proposals = getPendingUserProposals();
  const activeDebates = getLocalDebates().filter((debate) => debate.status === "active");
  notificationBadge.hidden = !hasUnread();
  notificationPanel.hidden = true;
  notificationList.replaceChildren();

  if (proposals.length) {
    notificationState.textContent = "Potential match";
    proposals.forEach((proposal) => {
      const opponent = proposal.users.find((user) => user.userId !== activeUser.id);
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
      detail.textContent = `Potential match with ${getUserName(opponent.userId)} • They argue ${opponent.stance}`;
      accept.textContent = "Accept";
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
  const xp = document.createElement("div");
  const actions = document.createElement("div");
  const accept = document.createElement("button");
  const reject = document.createElement("button");

  card.className = "notification-card";
  meta.className = "opponent-meta";
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
  ].forEach(([label, value]) => {
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    meta.append(term, description);
  });

  accept.textContent = accepted.includes(activeUser.id) ? "Accepted" : "Accept";
  accept.disabled = accepted.includes(activeUser.id);
  reject.textContent = "Reject";

  accept.addEventListener("click", () => acceptProposal(proposal.id));
  reject.addEventListener("click", () => rejectProposal(proposal.id));

  actions.append(accept, reject);
  card.append(title, detail, meta, xp, actions);
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
  return getUsers().find((user) => user.id === userId)?.name || "Opponent";
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

function acceptProposal(proposalId) {
  const proposals = getMatchProposals();
  const proposal = proposals.find((candidate) => candidate.id === proposalId);

  if (!proposal) {
    return;
  }

  proposal.acceptedBy = Array.from(new Set([...(proposal.acceptedBy || []), activeUser.id]));

  if (proposal.acceptedBy.length === proposal.users.length) {
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
    saveMatchProposals(proposals.filter((candidate) => candidate.id !== proposalId));
    notificationState.textContent = "Active";
  } else {
    saveMatchProposals(proposals);
    upsertLocalDebate({
      id: proposal.id,
      status: "pending",
      topicTitle: proposal.topicTitle,
      detail: "You accepted. Waiting for the other side.",
      updatedAt: Date.now(),
    });
  }

  renderNotificationCenter();
  clearUnread();
  notificationBadge.hidden = true;
  notificationPanel.hidden = false;
}

function rejectProposal(proposalId) {
  const proposal = getMatchProposals().find((candidate) => candidate.id === proposalId);

  saveMatchProposals(getMatchProposals().filter((candidate) => candidate.id !== proposalId));

  if (proposal) {
    proposal.users.forEach((user) => removePendingDebate(user.userId, proposal.id));
  }

  renderNotificationCenter();
  clearUnread();
  notificationBadge.hidden = true;
  notificationPanel.hidden = false;
}

function getDebateRecords() {
  syncAcceptedProposals();
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

function clearPendingMatch(updateStatus) {
  if (pendingMatch) {
    saveMatchQueue(getMatchQueue().filter((request) => request.id !== pendingMatch.id));
    removePendingDebate(activeUser.id, pendingMatch.id);
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

async function showApp(user) {
  activeUser = user;
  mountNotificationCenter(appHeaderActions);
  notificationBadge.hidden = !hasUnread();
  accountName.textContent = user.name || "Debater";
  renderProfile(user);
  await loadTopicCatalog();
  loadMatches(activeUser);
  setNotificationVisibility(true);
  authView.hidden = true;
  surveyView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  appView.hidden = false;
  document.title = "Debate.it | Home";
}

function showAuth() {
  activeUser = null;
  setNotificationVisibility(false);
  authView.hidden = false;
  surveyView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  appView.hidden = true;
  document.title = "Debate.it | Login";
}

function showSurvey(user) {
  activeUser = user;
  setNotificationVisibility(false);
  authView.hidden = true;
  appView.hidden = true;
  debateView.hidden = true;
  roomView.hidden = true;
  surveyView.hidden = false;
  document.title = "Debate.it | Survey";
}

function showDebateTopic(topic, prompt) {
  activeTopic = topic;
  selectedStance = "";
  mountNotificationCenter(debateHeaderActions);
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
  debateView.hidden = false;
  setNotificationVisibility(true);
  document.title = "Debate.it | Debate";
}

function showDebateRoom(debateId) {
  const debate = getLocalDebates().find((candidate) => candidate.id === debateId);

  if (!debate || debate.status !== "active") {
    return;
  }

  mountNotificationCenter(roomHeaderActions);
  activeRoomDebateId = debateId;
  pendingAnnotationSelection = null;
  roomTitle.textContent = debate.topicTitle;
  roomDetail.textContent = debate.detail;
  renderChatThread(debate);
  notificationPanel.hidden = true;
  authView.hidden = true;
  appView.hidden = true;
  surveyView.hidden = true;
  debateView.hidden = true;
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
  const saved = JSON.parse(localStorage.getItem(getChatKey(debateId)) || "null");

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
  localStorage.setItem(getChatKey(debateId), JSON.stringify(messages));
}

function getAnnotationKey(debateId) {
  return `${annotationsKey}.${debateId}`;
}

function getAnnotations(debateId = activeRoomDebateId) {
  if (!debateId) {
    return [];
  }

  return JSON.parse(localStorage.getItem(getAnnotationKey(debateId)) || "[]");
}

function saveAnnotations(debateId, annotations) {
  localStorage.setItem(getAnnotationKey(debateId), JSON.stringify(annotations));
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

function savePendingAnnotation(note) {
  if (!pendingAnnotationSelection || !note.trim()) {
    return;
  }

  const debateId = pendingAnnotationSelection.debateId;
  const annotations = getAnnotations(debateId);
  annotations.unshift({
    ...pendingAnnotationSelection,
    id: createLocalId("note"),
    note: note.trim(),
    createdAt: Date.now(),
  });
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

function renderChatThread(debate) {
  const messages = getChatMessages(debate.id);

  chatThread.replaceChildren();
  messages.forEach((message) => {
    const bubble = document.createElement("article");
    const label = document.createElement("span");
    const text = document.createElement("p");

    bubble.className = `chat-message ${message.speaker}`;
    label.textContent = message.speaker === "me" ? "You" : message.speaker === "opponent" ? "Opponent" : "System";
    text.className = "message-text";
    text.dataset.messageId = message.id;
    text.dataset.speaker = message.speaker;
    text.append(renderMessageText(message));
    bubble.append(label, text);
    chatThread.append(bubble);
  });
  chatThread.scrollTop = chatThread.scrollHeight;
  renderCopilot(messages, debate);
}

function addChatMessage(speaker, text) {
  if (!activeRoomDebateId || !text.trim()) {
    return;
  }

  const debate = getLocalDebates().find((candidate) => candidate.id === activeRoomDebateId);
  const messages = getChatMessages(activeRoomDebateId);
  messages.push({ id: createLocalId("message"), speaker, text: text.trim(), at: Date.now() });
  saveChatMessages(activeRoomDebateId, messages);

  if (debate) {
    renderChatThread(debate);
  }
}

function getDebateSide(detail = "") {
  return detail.match(/Your side: ([^.]+)/)?.[1] || "your stance";
}

function summarizeMessage(message) {
  const text = message.text.trim();
  const compact = text.length > 116 ? `${text.slice(0, 113)}...` : text;
  return `${message.speaker === "me" ? "You" : "Opponent"}: ${compact}`;
}

function findFactSignals(messages) {
  const claimWords = ["study", "studies", "data", "evidence", "research", "percent", "%", "always", "never", "prove"];
  const debateMessages = messages.filter((message) => message.speaker !== "system");
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
  const debateMessages = messages.filter((message) => message.speaker !== "system");
  const recent = debateMessages.slice(-4);
  const last = debateMessages.at(-1);
  const side = getDebateSide(debate.detail);
  const unansweredOpponent = [...debateMessages].reverse().find((message) => message.speaker === "opponent");
  const notes = recent.length
    ? recent.map(summarizeMessage)
    : [`You are arguing ${side}. Start with one clear claim and one reason.`];
  const factChecks = findFactSignals(messages);
  const focus =
    last?.speaker === "opponent"
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
    editor.addEventListener("submit", (event) => {
      event.preventDefault();
      savePendingAnnotation(textarea.value);
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

function addMockOpponentReply() {
  const replies = [
    "I see the point, but I think the tradeoff is being understated. What evidence supports that claim?",
    "That argument depends on who is affected most. I would push for clearer limits before accepting it.",
    "I agree with part of that, but the stronger counterpoint is whether the policy works in practice.",
  ];
  const reply = replies[Math.floor(Math.random() * replies.length)];

  window.setTimeout(() => {
    addChatMessage("opponent", reply);
    turnStatus.textContent = "Your turn";
  }, 700);
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

function startSession(user) {
  localStorage.setItem(
    sessionKey,
    JSON.stringify({
      userId: user.id,
      email: user.email,
    }),
  );

  if (user.surveyCompleted) {
    showApp(user);
  } else {
    showSurvey(user);
  }
}

function restoreSession() {
  const session = JSON.parse(localStorage.getItem(sessionKey) || "null");

  if (!session) {
    showAuth();
    return;
  }

  const user = getUsers().find((candidate) => candidate.id === session.userId);

  if (user) {
    if (user.surveyCompleted) {
      showApp(user);
    } else {
      showSurvey(user);
    }
  } else {
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

function logIn(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getUsers().find(
    (candidate) => candidate.email.toLowerCase() === normalizedEmail && candidate.password === password,
  );

  if (!user) {
    showMessage("No mock account matches those credentials.");
    return;
  }

  startSession(user);
}

function signUp(formData) {
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

  const users = getUsers();
  const accountExists = users.some((user) => user.email.toLowerCase() === email);

  if (accountExists) {
    showMessage("That mock account already exists.");
    return;
  }

  const user = {
    id: `local-${Date.now()}`,
    name,
    email,
    password,
    xp: 0,
    surveyCompleted: false,
    interests: [],
    debateBio: "",
  };

  users.push(user);
  saveUsers(users);
  startSession(user);
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage();

  const formData = new FormData(form);

  if (currentMode === "login") {
    logIn(formData.get("email"), formData.get("password"));
    return;
  }

  signUp(formData);
});

testAccountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode("login");
    emailInput.value = button.dataset.login;
    passwordInput.value = button.dataset.password;
    logIn(button.dataset.login, button.dataset.password);
  });
});

signOutButton.addEventListener("click", () => {
  localStorage.removeItem(sessionKey);
  form.reset();
  setMode("login");
  showAuth();
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

findOpponentButton.addEventListener("click", () => {
  if (!activeTopic || !selectedStance) {
    return;
  }

  const queue = getMatchQueue();
  const existingMatch = queue.find(
    (request) =>
      request.topicId === activeTopic.id && request.userId !== activeUser.id && request.stance !== selectedStance,
  );
  const now = Date.now();

  if (existingMatch) {
    const currentRequest = {
      id: `pending-${now}`,
      userId: activeUser.id,
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      stance: selectedStance,
      requestedAt: now,
    };

    saveMatchQueue(queue.filter((request) => request.id !== existingMatch.id));
    createProposalFromMatch(currentRequest, existingMatch);
    pendingMatch = null;
    notificationBadge.hidden = false;
    findOpponentButton.disabled = true;
    findOpponentButton.textContent = "Potential match";
    matchmakingStatus.textContent = `Potential match with ${getUserName(existingMatch.userId)}. Open the mail icon to review and accept.`;
    return;
  }

  pendingMatch = {
    id: `pending-${now}`,
    userId: activeUser.id,
    topic: activeTopic,
    topicId: activeTopic.id,
    topicTitle: activeTopic.title,
    stance: selectedStance,
    opponent: null,
    requestedAt: now,
  };

  saveMatchQueue([
    ...queue.filter((request) => request.userId !== activeUser.id || request.topicId !== activeTopic.id),
    {
      id: pendingMatch.id,
      userId: activeUser.id,
      topicId: activeTopic.id,
      topicTitle: activeTopic.title,
      stance: selectedStance,
      requestedAt: pendingMatch.requestedAt,
    },
  ]);

  upsertLocalDebate({
    id: pendingMatch.id,
    status: "pending",
    topicTitle: activeTopic.title,
    detail: "Finding an opponent. Match request remains open.",
    updatedAt: pendingMatch.requestedAt,
  });

  findOpponentButton.disabled = true;
  findOpponentButton.textContent = "Finding opponent...";
  matchmakingStatus.textContent =
    "Finding an opponent. This may take time, so we will notify you in the mail icon when someone matches.";
  renderNotificationCenter();
});

mailButton.addEventListener("click", () => {
  const wasHidden = notificationPanel.hidden;
  clearUnread();
  renderNotificationCenter();
  notificationBadge.hidden = true;
  notificationPanel.hidden = !wasHidden;
  activeHeaderPanel = notificationPanel.hidden ? "" : "mail";
});

notificationPanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

myDebatesButton.addEventListener("click", () => {
  mountNotificationCenter(appHeaderActions);
  activeHeaderPanel = "debates";
  debateFilters.clear();
  notificationPanel.querySelector(".notification-head strong").textContent = "My debates";
  renderMyDebates();
  notificationPanel.hidden = false;
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = chatInput.value.trim();

  if (!message) {
    return;
  }

  addChatMessage("me", message);
  chatInput.value = "";
  turnStatus.textContent = "Opponent thinking...";
  addMockOpponentReply();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
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
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === activeUser.id);

  surveySubmitButton.disabled = false;
  surveySubmitButton.textContent = originalSubmitText;

  if (userIndex === -1) {
    localStorage.removeItem(sessionKey);
    showAuth();
    return;
  }

  users[userIndex] = {
    ...users[userIndex],
    interests,
    debateBio,
    debateProfile,
    surveyCompleted: true,
  };

  saveUsers(users);
  surveyForm.reset();
  showApp(users[userIndex]);
});

skipSurveyButton.addEventListener("click", () => {
  if (!activeUser) {
    showAuth();
    return;
  }

  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === activeUser.id);

  if (userIndex !== -1) {
    users[userIndex] = {
      ...users[userIndex],
      surveyCompleted: true,
    };
    saveUsers(users);
    showApp(users[userIndex]);
  }
});

cleanupFakeOpponentDebates();
getUsers();
restoreSession();

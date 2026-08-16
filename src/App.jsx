import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import PanelOverlay from "./components/PanelOverlay.jsx";
import CreateDebateModal from "./components/CreateDebateModal.jsx";
import AuthView from "./views/AuthView.jsx";
import SurveyView from "./views/SurveyView.jsx";
import HomeView from "./views/HomeView.jsx";
import TopicView from "./views/TopicView.jsx";
import DebateRoom from "./views/DebateRoom.jsx";
import ProfileEdit from "./views/ProfileEdit.jsx";
import FactResearchView from "./views/FactResearchView.jsx";
import useRealtime from "./hooks/useRealtime.js";
import Brand from "./components/Brand.jsx";
import { apiRequest } from "./lib/api.js";

function getInitialRoute() {
  const path = window.location.pathname;

  if (path.startsWith("/debates/")) {
    return { view: "room", debateId: decodeURIComponent(path.split("/").at(-1) || "") };
  }

  if (path.startsWith("/topics/")) {
    return { view: "topic", topicId: decodeURIComponent(path.split("/").at(-1) || "") };
  }

  if (path === "/profile") {
    return { view: "profile" };
  }

  if (path === "/research") {
    return { view: "research" };
  }

  return { view: "home" };
}

function routePath(route) {
  if (route.view === "room" && route.debateId) return `/debates/${encodeURIComponent(route.debateId)}`;
  if (route.view === "topic" && route.topicId) return `/topics/${encodeURIComponent(route.topicId)}`;
  if (route.view === "profile") return "/profile";
  if (route.view === "research") return "/research";
  return "/";
}

export default function App() {
  const initialRoute = useMemo(() => getInitialRoute(), []);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("loading");
  const [topics, setTopics] = useState([]);
  const [openRooms, setOpenRooms] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchSource, setMatchSource] = useState("Loading");
  const [debates, setDebates] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [panel, setPanelState] = useState({ open: "" });
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicPrompt, setTopicPrompt] = useState("");
  const [createTopic, setCreateTopic] = useState(null);
  const [activeDebateId, setActiveDebateId] = useState(initialRoute.debateId || "");
  const [activeFactCheck, setActiveFactCheck] = useState(null);

  function navigate(route, replace = false) {
    const nextPath = routePath(route);
    if (window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"](route, "", nextPath);
    }
    setView(route.view);
  }

  function setPanel(open) {
    setPanelState({ open });
  }

  const refreshState = useCallback(async (nextUser = user) => {
    if (!nextUser) return;
    const [debateData, proposalData] = await Promise.all([
      apiRequest(`/api/users/${encodeURIComponent(nextUser.id)}/debates`),
      apiRequest(`/api/users/${encodeURIComponent(nextUser.id)}/proposals`),
    ]);
    setDebates(debateData.debates || []);
    setProposals(proposalData.proposals || []);
  }, [user]);

  async function loadMatches(nextUser) {
    const result = await apiRequest("/api/matches", {
      method: "POST",
      body: JSON.stringify({ debateProfile: nextUser.debateProfile || {}, limit: 5 }),
    });
    setMatches(result.matches || []);
    setMatchSource(result.source || "local");
  }

  async function loadCatalog() {
    const [topicData, roomData] = await Promise.all([
      apiRequest("/api/topics"),
      apiRequest("/api/open-rooms"),
    ]);
    setTopics(topicData.topics || []);
    setOpenRooms(roomData.rooms || []);
    return topicData.topics || [];
  }

  async function enterApp(nextUser) {
    setUser(nextUser);
    if (!nextUser.surveyCompleted) {
      setView("survey");
      return;
    }

    const loadedTopics = await loadCatalog();
    await Promise.all([
      refreshState(nextUser),
      loadMatches(nextUser).catch(() => setMatchSource("local")),
    ]);

    if (initialRoute.view === "room" && initialRoute.debateId) {
      setActiveDebateId(initialRoute.debateId);
      setView("room");
      return;
    }

    if (initialRoute.view === "topic" && initialRoute.topicId) {
      const topic = loadedTopics.find((item) => item.id === initialRoute.topicId);
      if (topic) {
        setSelectedTopic(topic);
        setView("topic");
        return;
      }
    }

    setView(initialRoute.view === "profile" ? "profile" : "home");
  }

  useEffect(() => {
    apiRequest("/api/auth/session")
      .then(({ user: sessionUser }) => enterApp(sessionUser))
      .catch(() => setView("auth"));
    // Initial session hydration should only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPopState() {
      const route = getInitialRoute();
      if (route.view === "room") {
        setActiveDebateId(route.debateId || "");
      }
      if (route.view === "topic") {
        setSelectedTopic(topics.find((topic) => topic.id === route.topicId) || null);
      }
      setView(route.view);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [topics]);

  useRealtime({
    userId: user?.id,
    onEvent: useCallback((payload) => {
      if (["proposal_found", "proposal_updated", "proposal_rejected", "debate_started", "chat_message", "debate_state", "annotation_created"].includes(payload.type)) {
        refreshState().catch(() => {});
      }
    }, [refreshState]),
  });

  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("auth");
    window.history.replaceState({}, "", "/");
  }

  function chooseTopic(topic, prompt = "Choose a side and set the debate rules before entering matchmaking.") {
    setSelectedTopic(topic);
    setTopicPrompt(prompt);
    setCreateTopic(null);
    navigate({ view: "topic", topicId: topic.id });
  }

  async function createOpenRoom(config) {
    const topic = config.topic;
    const result = await apiRequest("/api/open-rooms", {
      method: "POST",
      body: JSON.stringify({
        topicId: topic.id,
        topicTitle: topic.title,
        category: topic.category,
        visibility: config.visibility,
        format: config.format,
        sideSize: config.sideSize,
        pace: config.pace,
        evidence: config.evidence,
      }),
    });

    setOpenRooms((current) => [result.room, ...current.filter((room) => room.id !== result.room.id)]);

    if (!topics.some((item) => item.id === topic.id)) {
      setTopics((current) => [topic, ...current]);
    }

    return result.room;
  }

  async function acceptProposal(id) {
    const result = await apiRequest(`/api/proposals/${encodeURIComponent(id)}/accept`, { method: "POST", body: "{}" });
    await refreshState();
    if (result.debateId) {
      setActiveDebateId(result.debateId);
      navigate({ view: "room", debateId: result.debateId });
    }
  }

  async function rejectProposal(id) {
    await apiRequest(`/api/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" });
    await refreshState();
  }

  if (view === "loading") {
    return <main className="auth-shell"><section className="auth-panel"><Brand onHome={() => {}} /><p className="profile-summary">Loading Debate.it...</p></section></main>;
  }

  if (view === "auth") {
    return <AuthView onUser={enterApp} />;
  }

  if (view === "survey") {
    return <SurveyView user={user} onUser={enterApp} />;
  }

  if (view === "profile") {
    return <ProfileEdit user={user} onUser={setUser} onHome={() => navigate({ view: "home" })} />;
  }

  if (view === "research") {
    return <FactResearchView factCheck={activeFactCheck} onBack={() => navigate({ view: "room", debateId: activeDebateId })} />;
  }

  if (view === "topic" && selectedTopic) {
    return <TopicView topic={selectedTopic} prompt={topicPrompt} onBack={() => navigate({ view: "home" })} onRefreshState={() => refreshState()} />;
  }

  if (view === "room" && activeDebateId) {
    return (
      <DebateRoom
        debateId={activeDebateId}
        user={user}
        onHome={() => navigate({ view: "home" })}
        onResearch={(factCheck) => {
          setActiveFactCheck(factCheck);
          navigate({ view: "research" });
        }}
      />
    );
  }

  return (
    <main className="app-shell">
      <Header
        user={user}
        panel={{ ...panel, proposals }}
        setPanel={setPanel}
        onHome={() => navigate({ view: "home" })}
        onLogout={logout}
        onProfile={() => { setPanel(""); navigate({ view: "profile" }); }}
      />
      <HomeView
        topics={topics}
        matches={matches}
        matchSource={matchSource}
        debates={debates}
        openRooms={openRooms}
        onTopic={chooseTopic}
        onOpenDebate={(id) => { setActiveDebateId(id); navigate({ view: "room", debateId: id }); }}
        onCreate={(query) => setCreateTopic(query || "")}
      />
      <PanelOverlay
        panel={{ ...panel, proposals }}
        user={user}
        debates={debates}
        proposals={proposals}
        onClose={() => setPanel("")}
        onAccept={acceptProposal}
        onReject={rejectProposal}
        onOpenDebate={(id) => { setPanel(""); setActiveDebateId(id); navigate({ view: "room", debateId: id }); }}
      />
      {createTopic !== null ? <CreateDebateModal initialTopic={createTopic} topics={topics} openRooms={openRooms} onClose={() => setCreateTopic(null)} onSelectTopic={chooseTopic} onCreateRoom={createOpenRoom} /> : null}
    </main>
  );
}

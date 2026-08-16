import { useEffect, useMemo, useRef, useState } from "react";
import CategoryIcon from "../components/CategoryIcon.jsx";
import { featuredDebates } from "../data/catalog.js";
import { apiRequest } from "../lib/api.js";
import { cleanSearchQuery, fuzzyTopicSearch } from "../utils/fuzzySearch.js";

function getSuggestionMeta(suggestion) {
  if (suggestion.kind === "room") {
    return [
      `Room waiting for ${suggestion.room?.need || "opponent"}`,
      suggestion.room?.visibility || "Public",
      suggestion.room?.pace || "Timed rounds",
      `${suggestion.topic.searchScore}% match`,
    ].filter(Boolean).join(" - ");
  }

  const prefix = ["Related", "Semantic", "Friend room"].includes(suggestion.topic.matchType)
    ? suggestion.topic.matchType
    : suggestion.topic.category;
  const concepts = suggestion.topic.matchType === "Related" && suggestion.topic.sharedConcepts?.length
    ? ` - ${suggestion.topic.sharedConcepts.slice(0, 2).join(", ")}`
    : "";

  return `Topic idea - ${prefix}${concepts} - choose a side or create a room`;
}

function getSuggestionActionLabel(suggestion) {
  return suggestion.kind === "room" ? "Join" : "Explore";
}

function isDirectRoomSupported(room = {}) {
  return String(room.sideSize || room.roomConfig?.sideSize || "1") === "1";
}

function getMeaningfulTerms(query = "") {
  const stopWords = new Set(["a", "an", "and", "are", "be", "do", "does", "for", "from", "in", "is", "of", "on", "or", "should", "the", "to"]);

  return cleanSearchQuery(query)
    .split(" ")
    .filter((term) => term.length >= 3 && !stopWords.has(term));
}

function shouldRequestSemanticSearch(query, localSuggestions) {
  const cleanQuery = cleanSearchQuery(query);
  const terms = getMeaningfulTerms(query);

  if (cleanQuery.length < 4 || terms.length < 2) {
    return false;
  }

  const top = localSuggestions[0]?.topic;

  if (!top) {
    return true;
  }

  return !(top.matchType === "Text match" && top.searchScore >= 82);
}

function scoreRecommendedRoom(room, topicMatches = []) {
  const title = String(room.topic || "").toLowerCase();
  const category = String(room.category || "").toLowerCase();
  const matchedTopic = topicMatches.find((match) => {
    const matchTitle = String(match.title || "").toLowerCase();
    const matchCategory = String(match.category || "").toLowerCase();

    return matchTitle === title || (matchCategory && matchCategory === category);
  });
  const recommendationScore = matchedTopic ? Number(matchedTopic.score || 0) : 0;
  const friendBoost = room.friendHost ? 18 : 0;
  const publicBoost = room.visibility === "Public" ? 4 : 0;

  return recommendationScore + friendBoost + publicBoost;
}

export default function HomeView({ topics, matches, matchSource, debates, openRooms, onTopic, onOpenDebate, onCreate }) {
  const [query, setQuery] = useState("");
  const [semanticSearch, setSemanticSearch] = useState({ query: "", source: "", results: [] });
  const semanticCacheRef = useRef(new Map());
  const joinableRooms = useMemo(() => openRooms.filter(isDirectRoomSupported), [openRooms]);
  const localSuggestions = useMemo(() => {
    if (!cleanSearchQuery(query)) return [];
    const topicSuggestions = fuzzyTopicSearch(topics, query, 5).map((topic) => ({ kind: "topic", topic }));
    const openRoomTopics = joinableRooms.map((room) => ({
      id: room.topicId || room.id || room.topic,
      title: room.topic,
      category: room.category,
      tags: [room.format, room.pace, room.evidence, room.visibility].filter(Boolean),
      room,
    }));
    const roomSuggestions = fuzzyTopicSearch(openRoomTopics, query, 4).map((topic) => {
      const friendBoost = topic.room?.friendHost ? 8 : 0;

      return {
        kind: "room",
        topic: {
          ...topic,
          searchScore: Math.min(100, topic.searchScore + friendBoost),
          matchType: topic.room?.friendHost ? "Friend room" : topic.matchType,
        },
        room: topic.room,
      };
    });
    const seen = new Set();

    return [...roomSuggestions, ...topicSuggestions].filter((suggestion) => {
      const key = `${suggestion.kind}:${suggestion.topic.title.toLowerCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [joinableRooms, query, topics]);
  const suggestions = useMemo(() => {
    if (semanticSearch.query !== cleanSearchQuery(query) || !semanticSearch.results.length) {
      return localSuggestions;
    }

    const remoteSuggestions = semanticSearch.results
      .filter((result) => result.kind !== "room" || isDirectRoomSupported(result.room))
      .map((result) => ({
        kind: result.kind,
        topic: {
          id: result.topic?.id || result.id,
          title: result.title,
          category: result.category,
          tags: result.topic?.tags || [],
          searchScore: result.searchScore,
          matchType: result.matchType,
        },
        room: result.room,
      }));
    const seen = new Set();

    return [...remoteSuggestions, ...localSuggestions].filter((suggestion) => {
      const key = `${suggestion.kind}:${suggestion.topic.title.toLowerCase()}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [localSuggestions, query, semanticSearch]);
  const hasSearch = Boolean(cleanSearchQuery(query));
  const currentDebates = debates.filter((debate) => ["active", "pending"].includes(debate.status)).slice(0, 4);
  const recommendedRooms = useMemo(() => joinableRooms
    .map((room) => ({ ...room, recommendationScore: scoreRecommendedRoom(room, matches) }))
    .sort((a, b) =>
      b.recommendationScore - a.recommendationScore ||
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() ||
      String(a.topic || "").localeCompare(String(b.topic || "")),
    ), [joinableRooms, matches]);

  useEffect(() => {
    const cleanQuery = cleanSearchQuery(query);

    if (!cleanQuery || !shouldRequestSemanticSearch(query, localSuggestions)) {
      setSemanticSearch({ query: "", source: "", results: [] });
      return undefined;
    }

    if (semanticCacheRef.current.has(cleanQuery)) {
      setSemanticSearch(semanticCacheRef.current.get(cleanQuery));
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      apiRequest(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((result) => {
          const nextSearch = {
            query: cleanQuery,
            source: result.source || "",
            results: result.results || [],
          };
          semanticCacheRef.current.set(cleanQuery, nextSearch);
          setSemanticSearch(nextSearch);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            setSemanticSearch({ query: cleanQuery, source: "local-fallback", results: [] });
          }
        });
    }, 800);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [localSuggestions, query]);

  return (
    <section className="home-panel" aria-label="Debate.it home">
      {currentDebates.length ? (
        <section className="continue-panel">
          <div className="matches-head"><div><p className="eyebrow">Continue</p><h2>Current debates</h2></div></div>
          <div className="continue-list">
            {currentDebates.map((debate) => (
              <button key={debate.id} className="continue-card" type="button" onClick={() => debate.status === "active" && onOpenDebate(debate.id)}>
                <span>{debate.status}</span>
                <strong>{debate.topicTitle}</strong>
                <span>{debate.detail}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <section className="topic-search-panel">
        <div className="matches-head">
          <div>
            <h2>Discover debates</h2>
          </div>
        </div>
        <label className="field search-field">
          <span className="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M10.5 3.5a7 7 0 0 1 5.61 11.19l3.6 3.6-1.42 1.42-3.6-3.6A7 7 0 1 1 10.5 3.5Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
              <path d="M8.25 10.25h4.5v1.5h-4.5v-1.5Zm1.5-3h1.5v6.5h-1.5v-6.5Z" />
            </svg>
          </span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AI, schools, climate, sports, history..." />
          {hasSearch ? (
            <div className="search-suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.kind}-${suggestion.topic.id}`}
                  className="suggestion-row"
                  type="button"
                  onClick={() => onTopic(
                    topics.find((topic) => topic.title === suggestion.topic.title) || suggestion.topic,
                    suggestion.kind === "room" ? `Open room: ${suggestion.room.visibility} ${suggestion.room.format}. ${suggestion.room.pace}. ${suggestion.room.evidence}. Choose a side to continue.` : "Choose a side to start a debate on this topic.",
                    suggestion.kind === "room" ? suggestion.room : null,
                  )}
                >
                  <CategoryIcon category={suggestion.topic.category} />
                  <span className="suggestion-text">
                    <span className="suggestion-title"><span>{getSuggestionActionLabel(suggestion)}</span><strong>{suggestion.topic.title}</strong></span>
                    <span className="suggestion-meta">{getSuggestionMeta(suggestion)}</span>
                  </span>
                </button>
              ))}
              <button className="suggestion-row create-suggestion-row" type="button" onClick={() => onCreate(query)}>
                <span className="category-icon create-topic-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
                  </svg>
                </span>
                <span className="suggestion-text">
                  <span className="suggestion-title"><span>Create</span><strong>{query.trim()}</strong></span>
                  <span className="suggestion-meta">{suggestions.length ? "No good room? Set rules and publish one." : "No strong match yet. Set rules and publish a room."}</span>
                </span>
              </button>
            </div>
          ) : null}
        </label>
      </section>
      <section className="open-seats-panel">
        <div className="matches-head"><div><p className="eyebrow">Open rooms</p><h2>Recommended open rooms</h2></div><span className="source-badge">{matchSource}</span></div>
        <div className="open-seat-grid">
          {recommendedRooms.length ? recommendedRooms.slice(0, 4).map((room) => (
            <button key={room.id || room.topic} className="open-seat-card" type="button" onClick={() => onTopic(topics.find((topic) => topic.title === room.topic) || { id: room.topicId || room.topic, title: room.topic, category: room.category, tags: [] }, `Open room: ${room.visibility} ${room.format}. ${room.pace}. ${room.evidence}. Choose a side to continue.`, room)}>
              <CategoryIcon category={room.category} />
              <span>Needs {room.need} - {room.format}</span>
              <strong>{room.topic}</strong>
              <small>{room.host ? `${room.host} - ` : ""}{room.visibility} - {room.pace} - {room.evidence}</small>
            </button>
          )) : <p className="profile-summary">No 1v1 rooms are waiting right now. Search a topic to create one.</p>}
        </div>
      </section>
      <section className="featured-panel">
        <div className="matches-head"><div><p className="eyebrow">Featured public debates</p><h2>Read the room</h2></div></div>
        <div className="featured-grid">
          {featuredDebates.map((debate) => (
            <article key={debate.title} className="featured-card" data-category={debate.category}>
              <CategoryIcon category={debate.category} />
              <span>{debate.label}</span>
              <h3>{debate.title}</h3>
              <p>{debate.text}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

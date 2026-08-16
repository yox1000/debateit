function getVisibilityIcon(value = "") {
  if (value === "Friends") {
    return "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3.5 19a4.5 4.5 0 0 1 9 0v1h-9v-1Zm8 1v-1a6.4 6.4 0 0 0-1.3-3.9A4.5 4.5 0 0 1 20.5 19v1h-9Z";
  }

  if (value === "Private") {
    return "M7 10V8a5 5 0 0 1 10 0v2h2v11H5V10h2Zm2 0h6V8a3 3 0 0 0-6 0v2Zm2 4v3h2v-3h-2Z";
  }

  return "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm6.7 8h-3.2a14 14 0 0 0-1.2-5 7.1 7.1 0 0 1 4.4 5ZM12 5.1A11.8 11.8 0 0 1 13.5 11h-3A11.8 11.8 0 0 1 12 5.1ZM5.3 13h3.2a14 14 0 0 0 1.2 5 7.1 7.1 0 0 1-4.4-5Zm3.2-2H5.3a7.1 7.1 0 0 1 4.4-5 14 14 0 0 0-1.2 5Zm2 2h3A11.8 11.8 0 0 1 12 18.9 11.8 11.8 0 0 1 10.5 13Zm3.8 5a14 14 0 0 0 1.2-5h3.2a7.1 7.1 0 0 1-4.4 5Z";
}

function getPaceIcon(value = "") {
  if (value === "Rapid fire") {
    return "M13 2 4 14h7l-1 8 10-13h-7l1-7Z";
  }

  if (value === "Slow evidence review") {
    return "M7 2h10v5a5 5 0 0 1-2.1 4A5 5 0 0 1 17 15v7H7v-7a5 5 0 0 1 2.1-4A5 5 0 0 1 7 7V2Zm2 2v3a3 3 0 0 0 6 0V4H9Zm3 8a3 3 0 0 0-3 3v5h6v-5a3 3 0 0 0-3-3Z";
  }

  return "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm1 4h-2v6l5 3 .9-1.7-3.9-2.3V7Z";
}

function getEvidenceIcon(value = "") {
  if (value === "Source required") {
    return "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5L9 11l2 2 4.5-4.5L17 10l-6 6Z";
  }

  if (value === "Casual") {
    return "M4 5h16v11H8l-4 4V5Zm4 4v2h8V9H8Zm0 4v2h5v-2H8Z";
  }

  return "M6 3h9l4 4v14H6V3Zm8 1.8V8h3.2L14 4.8ZM8 12l2 2 4.5-4.5L16 11l-6 6-3.5-3.5L8 12Z";
}

function getRuleIcon(type, value) {
  if (type === "visibility") return getVisibilityIcon(value);
  if (type === "pace") return getPaceIcon(value);
  if (type === "evidence") return getEvidenceIcon(value);
  if (type === "format") return "M5 5h14v4H5V5Zm0 6h6v8H5v-8Zm8 0h6v8h-6v-8Z";
  return "M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM3.5 19a4.5 4.5 0 0 1 9 0v1h-9v-1Zm8 1v-1a6.4 6.4 0 0 0-1.3-3.9A4.5 4.5 0 0 1 20.5 19v1h-9Z";
}

export function RoomRuleIcon({ type, value }) {
  if (type === "visibility" && value === "Public") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 12h17M12 3.5c2.1 2.4 3.2 5.2 3.2 8.5S14.1 18.1 12 20.5C9.9 18.1 8.8 15.3 8.8 12S9.9 5.9 12 3.5Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={getRuleIcon(type, value)} />
    </svg>
  );
}

export default function RoomRuleIcons({ config = {}, includeFormat = true }) {
  const rules = [
    ["visibility", config.visibility || "Public"],
    includeFormat ? ["format", config.format || "1v1"] : null,
    ["pace", config.pace || "Timed rounds"],
    ["evidence", config.evidence || "Evidence encouraged"],
  ].filter(Boolean);

  return (
    <span className="room-rule-icons" aria-label="Room rules">
      {rules.map(([type, value]) => (
        <span key={`${type}-${value}`} className="room-rule-icon" title={value} aria-label={value}>
          <RoomRuleIcon type={type} value={value} />
        </span>
      ))}
    </span>
  );
}

import { RoomRuleIcon } from "./RoomRuleIcons.jsx";

export default function RoomRuleChips({ config = {}, compact = false }) {
  const sideSize = config.sideSize || "1";
  const rules = [
    ["visibility", config.visibility || "Public"],
    ["format", config.format || "1v1"],
    ["side", `${sideSize} per side`],
    ["pace", config.pace || "Timed rounds"],
    ["evidence", config.evidence || "Evidence encouraged"],
  ];

  return (
    <div className={`room-rule-chips ${compact ? "compact" : ""}`} aria-label="Room rules">
      {rules.map(([type, label]) => (
        <span key={`${type}-${label}`}>
          <RoomRuleIcon type={type} value={label} />
          {label}
        </span>
      ))}
    </div>
  );
}

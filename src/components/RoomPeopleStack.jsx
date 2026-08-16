function getInitials(name = "") {
  const parts = String(name || "D").trim().split(/\s+/).filter(Boolean);

  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "D";
}

function getRoomPeople(room = {}) {
  const rawPeople = Array.isArray(room.participants)
    ? room.participants
    : Array.isArray(room.users)
      ? room.users
      : [];
  const people = rawPeople.map((person) => ({
    id: person.userId || person.id || person.name,
    name: person.name || "Debater",
  }));

  if (room.host && !people.some((person) => person.name === room.host)) {
    people.unshift({
      id: room.hostUserId || room.host,
      name: room.host,
    });
  }

  return people.length ? people : [{ id: "host", name: "Host" }];
}

export default function RoomPeopleStack({ room }) {
  const people = getRoomPeople(room);
  const visible = people.slice(0, 3);
  const hiddenCount = Math.max(0, people.length - visible.length);

  return (
    <span className="room-people-stack" aria-label={`${people.length} room participant${people.length === 1 ? "" : "s"}`}>
      {visible.map((person) => (
        <span key={person.id || person.name} className="room-person-dot" title={person.name}>
          {getInitials(person.name)}
        </span>
      ))}
      {hiddenCount ? <span className="room-person-dot more">+{hiddenCount}</span> : null}
    </span>
  );
}

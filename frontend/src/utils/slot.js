// utils/slot.js
export function parseSlot(slot) {
  if (!slot) return null;

  const parts = slot.split("-");
  if (parts.length !== 4) return null;

  const [, , day, index] = parts;

  const dayMap = {
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
  };

  const timeMap = {
    "1": "10:00 AM",
    "2": "5:00 PM",
  };

  return {
    raw: slot,
    day: dayMap[day] || day,
    time: timeMap[index] || "Unknown",
  };
}

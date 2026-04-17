export interface Checkin {
  id: string;
  poiName: string;
  address: string;
  timestamp: number;
  lat: number;
  lng: number;
}

export function getCheckins(): Checkin[] {
  try {
    return JSON.parse(localStorage.getItem("checkins") || "[]");
  } catch {
    return [];
  }
}

export function addCheckin(data: Omit<Checkin, "id">): Checkin {
  const item: Checkin = { ...data, id: Date.now().toString() };
  const list = getCheckins();
  const updated = [item, ...list].slice(0, 100);
  localStorage.setItem("checkins", JSON.stringify(updated));
  return item;
}

export function hasCheckedIn(poiId: string, withinMs = 24 * 60 * 60 * 1000): boolean {
  const list = getCheckins();
  const cutoff = Date.now() - withinMs;
  return list.some((c) => c.id === poiId && c.timestamp > cutoff);
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Utilitas pemformatan tanggal dan waktu dalam bahasa Indonesia
 * untuk kebutuhan penjadwalan dan integrasi kalender.
 */

export function formatIndoDateRange(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const dateStr = s.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
    const sTime = s.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const eTime = e.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    return `${dateStr}, ${sTime} - ${eTime} WIB`;
  } catch {
    return `${startIso} s/d ${endIso}`;
  }
}

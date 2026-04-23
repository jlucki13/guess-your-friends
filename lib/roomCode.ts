const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateRoomCode(): string {
  return Array.from({ length: 6 }, () =>
    CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  ).join("");
}

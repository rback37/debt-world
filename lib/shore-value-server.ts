import { getD1 } from "@/db";

export type ShoreProgress = {
  shoreValue: number;
  starlight: {
    available: number;
    lifetimeEarned: number;
    lifetimeSent: number;
    lifetimeReceived: number;
  };
  recent: Array<{
    eventType: string;
    points: number;
    createdAt: string;
  }>;
};

export async function getShoreProgress(vaultId: string): Promise<ShoreProgress> {
  const db = getD1();
  const [score, wallet, recent] = await Promise.all([
    db.prepare(
      "SELECT COALESCE(SUM(points), 0) AS total FROM shore_value_ledger WHERE vault_id = ?1",
    ).bind(vaultId).first<{ total: number }>(),
    db.prepare(
      `SELECT available, lifetime_earned, lifetime_sent, lifetime_received
       FROM starlight_wallets WHERE vault_id = ?1 LIMIT 1`,
    ).bind(vaultId).first<{
      available: number;
      lifetime_earned: number;
      lifetime_sent: number;
      lifetime_received: number;
    }>(),
    db.prepare(
      `SELECT event_type, points, created_at
       FROM shore_value_ledger WHERE vault_id = ?1
       ORDER BY created_at DESC LIMIT 8`,
    ).bind(vaultId).all<{ event_type: string; points: number; created_at: string }>(),
  ]);
  return {
    shoreValue: Number(score?.total ?? 0),
    starlight: {
      available: Number(wallet?.available ?? 0),
      lifetimeEarned: Number(wallet?.lifetime_earned ?? 0),
      lifetimeSent: Number(wallet?.lifetime_sent ?? 0),
      lifetimeReceived: Number(wallet?.lifetime_received ?? 0),
    },
    recent: recent.results.map((event) => ({
      eventType: event.event_type,
      points: event.points,
      createdAt: event.created_at,
    })),
  };
}

import { getD1 } from "@/db";
import { cleanModerationNote, requireCommunityAdmin } from "@/lib/community-safety";
import { HttpError, assertSameOrigin, cleanText, noStoreJson, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

type ModerationStoryRow = {
  id: string;
  anonymous_name: string;
  country_code: string;
  debt_kind: string;
  amount_band: string;
  currency: string;
  repayment_approach: string;
  story_text: string;
  status: string;
  created_at: string;
  open_report_count: number;
  encouragement_count: number;
};

const transitions = {
  approve: "published",
  reject: "rejected",
  hide: "hidden",
  restore: "published",
} as const;

function moderationStory(row: ModerationStoryRow) {
  return {
    id: row.id,
    anonymousName: row.anonymous_name,
    countryCode: row.country_code,
    debtKind: row.debt_kind,
    amountBand: row.amount_band,
    currency: row.currency,
    repaymentApproach: row.repayment_approach,
    storyText: row.story_text,
    status: row.status,
    createdAt: row.created_at,
    openReportCount: Number(row.open_report_count ?? 0),
    encouragementCount: Number(row.encouragement_count ?? 0),
  };
}

async function moderationCounts() {
  const db = getD1();
  const [statusRows, reportRow] = await Promise.all([
    db.prepare("SELECT status, COUNT(*) AS count FROM public_stories GROUP BY status").all<{ status: string; count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM story_reports WHERE status = 'open'").first<{ count: number }>(),
  ]);
  const statuses = Object.fromEntries(statusRows.results.map((row) => [row.status, Number(row.count)]));
  return {
    pending: statuses.pending ?? 0,
    review: statuses.review ?? 0,
    published: statuses.published ?? 0,
    hidden: statuses.hidden ?? 0,
    rejected: statuses.rejected ?? 0,
    openReports: Number(reportRow?.count ?? 0),
  };
}

export async function GET(request: Request) {
  try {
    await requireCommunityAdmin(request);
    const counts = await moderationCounts();
    if (new URL(request.url).searchParams.get("summary") === "1") {
      return noStoreJson({ authorized: true, counts });
    }
    const db = getD1();
    const [storiesResult, reportsResult, actionsResult] = await Promise.all([
      db.prepare(
        `SELECT s.*,
          (SELECT COUNT(*) FROM story_reports r WHERE r.story_id = s.id AND r.status = 'open') AS open_report_count,
          (SELECT COUNT(*) FROM story_encouragements e WHERE e.story_id = s.id) AS encouragement_count
         FROM public_stories s
         WHERE s.status != 'published'
           OR EXISTS (SELECT 1 FROM story_reports r WHERE r.story_id = s.id AND r.status = 'open')
         ORDER BY CASE s.status WHEN 'review' THEN 0 WHEN 'pending' THEN 1 WHEN 'hidden' THEN 2 WHEN 'rejected' THEN 3 ELSE 4 END,
           s.updated_at DESC
         LIMIT 100`,
      ).all<ModerationStoryRow>(),
      db.prepare(
        `SELECT r.id, r.story_id, r.reason, r.details, r.created_at,
          s.anonymous_name, s.status AS story_status
         FROM story_reports r
         JOIN public_stories s ON s.id = r.story_id
         WHERE r.status = 'open'
         ORDER BY r.created_at ASC
         LIMIT 100`,
      ).all<{ id: string; story_id: string; reason: string; details: string; created_at: string; anonymous_name: string; story_status: string }>(),
      db.prepare(
        `SELECT a.id, a.story_id, a.action, a.from_status, a.to_status, a.note, a.created_at,
          s.anonymous_name
         FROM community_moderation_actions a
         JOIN public_stories s ON s.id = a.story_id
         ORDER BY a.created_at DESC
         LIMIT 30`,
      ).all<{ id: string; story_id: string; action: string; from_status: string; to_status: string; note: string; created_at: string; anonymous_name: string }>(),
    ]);
    return noStoreJson({
      authorized: true,
      counts,
      stories: storiesResult.results.map(moderationStory),
      reports: reportsResult.results.map((row) => ({
        id: row.id,
        storyId: row.story_id,
        reason: row.reason,
        details: row.details,
        createdAt: row.created_at,
        anonymousName: row.anonymous_name,
        storyStatus: row.story_status,
      })),
      actions: actionsResult.results.map((row) => ({
        id: row.id,
        storyId: row.story_id,
        anonymousName: row.anonymous_name,
        action: row.action,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        note: row.note,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireCommunityAdmin(request);
    const payload = await request.json() as { storyId?: string; action?: keyof typeof transitions; note?: string };
    const storyId = cleanText(payload.storyId, 80);
    const action = payload.action;
    if (!storyId || !action || !(action in transitions)) throw new HttpError(400, "A valid moderation action is required.");
    const db = getD1();
    const story = await db.prepare(
      "SELECT id, status FROM public_stories WHERE id = ?1 LIMIT 1",
    ).bind(storyId).first<{ id: string; status: string }>();
    if (!story) throw new HttpError(404, "Story not found.");
    const nextStatus = transitions[action];
    if (story.status === nextStatus) throw new HttpError(409, "The story is already in that state.");
    const note = cleanModerationNote(payload.note);
    if ((action === "reject" || action === "hide") && note.length < 4) {
      throw new HttpError(400, "Add a short moderation reason before rejecting or hiding a story.");
    }
    await db.batch([
      db.prepare(
        "UPDATE public_stories SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
      ).bind(nextStatus, story.id),
      db.prepare(
        "UPDATE story_reports SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE story_id = ?1 AND status = 'open'",
      ).bind(story.id),
      db.prepare(
        `INSERT INTO community_moderation_actions
          (id, story_id, actor_digest, action, from_status, to_status, note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(crypto.randomUUID(), story.id, admin.actorDigest, action, story.status, nextStatus, note),
    ]);
    return noStoreJson({ storyId: story.id, status: nextStatus, counts: await moderationCounts() });
  } catch (error) {
    return routeError(error);
  }
}

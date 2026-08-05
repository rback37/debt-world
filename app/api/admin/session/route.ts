import { ownerAdminSession, registerOwnerAdmin } from "@/lib/community-safety";
import { HttpError, assertSameOrigin, noStoreJson, routeError } from "@/lib/vault-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return noStoreJson(await ownerAdminSession(request));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const payload = await request.json() as { action?: string };
    if (payload.action !== "register") throw new HttpError(400, "A valid owner action is required.");
    return noStoreJson(await registerOwnerAdmin(request), { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}

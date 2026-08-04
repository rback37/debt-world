import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import OwnerAdminDashboard from "@/app/OwnerAdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  return <OwnerAdminDashboard signedInAs={user.email} signOutPath={chatGPTSignOutPath("/admin")}/>;
}

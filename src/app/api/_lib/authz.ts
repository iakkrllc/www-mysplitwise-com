import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type Admin = ReturnType<typeof getSupabaseAdmin>;

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function isFriendOf(
  admin: Admin,
  callerId: string,
  otherId: string,
): Promise<boolean> {
  if (callerId === otherId) return true;
  const [userA, userB] = pairKey(callerId, otherId);
  const { data } = await admin
    .from("friendships")
    .select("id")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle();
  return !!data;
}

export async function isGroupMember(
  admin: Admin,
  groupId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export class AuthzError extends Error {}

/**
 * Every id in `userIds` must be the caller, a friend of the caller, or (if
 * `groupId` is given) a fellow member of that group. Throws AuthzError
 * otherwise — callers should catch this and return a 403.
 */
export async function assertShareParticipants(
  admin: Admin,
  callerId: string,
  userIds: string[],
  groupId: string | null,
): Promise<void> {
  const unique = Array.from(new Set(userIds));
  for (const id of unique) {
    if (id === callerId) continue;
    if (groupId && (await isGroupMember(admin, groupId, id))) continue;
    if (await isFriendOf(admin, callerId, id)) continue;
    throw new AuthzError(`You're not connected to one of the people in this expense`);
  }
}

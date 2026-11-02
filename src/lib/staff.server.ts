import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { toAuthPassword } from "@/lib/auth-password";

export const EMAIL_DOMAIN = "lazzat.local";

/** Super admin — o'zgarmas hisob */
export const ROOT_ADMIN_USERNAME = "lazizbek";
export const ROOT_ADMIN_PASSWORD = "12345";

export function usernameToEmail(username: string) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${normalized}@${EMAIL_DOMAIN}`;
}

export type StaffRole = "super_admin" | "manager" | "cashier" | "kitchen" | "waiter";

export async function createStaffAccount(params: {
  username: string;
  password: string;
  fullName?: string | undefined;
  role: StaffRole;
}) {
  const username = params.username.trim();
  const email = usernameToEmail(username);

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: toAuthPassword(params.password),
      email_confirm: true,
      user_metadata: { username, full_name: params.fullName ?? null },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      username,
      full_name: params.fullName || username,
    });
    if (profileError) throw new Error(profileError.message);
  }

  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: params.role }, { onConflict: "user_id,role" });
  if (roleError) throw new Error(roleError.message);

  const { error: credError } = await supabaseAdmin
    .from("staff_credentials")
    .upsert(
      { user_id: userId, username, password: params.password, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (credError) throw new Error(credError.message);

  return { userId, email };
}

export async function updateStaffAccount(params: {
  userId: string;
  username?: string | undefined;
  password?: string | undefined;
  fullName?: string | undefined;
  role?: StaffRole | undefined;
}) {
  const { userId } = params;
  const patch: { email?: string; password?: string } = {};
  const username = params.username?.trim();

  if (username) patch.email = usernameToEmail(username);
  if (params.password) patch.password = toAuthPassword(params.password);

  if (Object.keys(patch).length > 0) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, patch);
    if (error) throw new Error(error.message);
  }

  if (username || params.fullName !== undefined) {
    const profilePatch: { username?: string; full_name?: string } = {};
    if (username) profilePatch.username = username;
    if (params.fullName !== undefined) profilePatch.full_name = params.fullName;
    const { error } = await supabaseAdmin.from("profiles").update(profilePatch).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  if (username || params.password) {
    const credPatch: { username?: string; password?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (username) credPatch.username = username;
    if (params.password) credPatch.password = params.password;
    const { data: existing } = await supabaseAdmin
      .from("staff_credentials")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("staff_credentials")
        .update(credPatch)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else if (username && params.password) {
      const { error } = await supabaseAdmin
        .from("staff_credentials")
        .insert({ user_id: userId, username, password: params.password });
      if (error) throw new Error(error.message);
    }
  }

  return { ok: true };
}

export async function ensureRootAdmin() {
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", ROOT_ADMIN_USERNAME)
    .maybeSingle();

  if (existing) {
    // Rol va parol doim joyida bo'lsin
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: existing.id, role: "super_admin" }, { onConflict: "user_id,role" });
    await supabaseAdmin.from("staff_credentials").upsert(
      {
        user_id: existing.id,
        username: ROOT_ADMIN_USERNAME,
        password: ROOT_ADMIN_PASSWORD,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return { ready: true };
  }

  await createStaffAccount({
    username: ROOT_ADMIN_USERNAME,
    password: ROOT_ADMIN_PASSWORD,
    fullName: "Lazizbek",
    role: "super_admin",
  });
  return { ready: true };
}

export async function listStaff() {
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
  const { data: creds } = await supabaseAdmin
    .from("staff_credentials")
    .select("user_id, username, password");
  const { data: faces } = await supabaseAdmin.from("face_credentials").select("user_id");

  return (profiles ?? []).map((p) => ({
    ...p,
    roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as StaffRole),
    password: (creds ?? []).find((c) => c.user_id === p.id)?.password ?? null,
    faceCount: (faces ?? []).filter((f) => f.user_id === p.id).length,
    isRoot: p.username === ROOT_ADMIN_USERNAME,
  }));
}

export async function deleteStaffAccount(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.username === ROOT_ADMIN_USERNAME) {
    throw new Error("Super admin hisobini o'chirib bo'lmaydi");
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function registerFace(params: {
  userId: string;
  descriptor: number[];
  label?: string | undefined;
}) {
  const { error } = await supabaseAdmin.from("face_credentials").insert({
    id: crypto.randomUUID(),
    user_id: params.userId,
    label: params.label ?? null,
    descriptor: params.descriptor,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function removeFaces(userId: string) {
  const { error } = await supabaseAdmin.from("face_credentials").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

function distance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Yuz vektoriga eng mos xodimni topib, unga sessiya ochib beradi */
export async function signInWithFaceDescriptor(descriptor: number[]) {
  const { data: faces } = await supabaseAdmin
    .from("face_credentials")
    .select("user_id, descriptor");

  let bestUser: string | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const face of faces ?? []) {
    const stored = face.descriptor as number[] | null;
    if (!stored || stored.length !== descriptor.length) continue;
    const d = distance(descriptor, stored);
    if (d < best) {
      best = d;
      bestUser = face.user_id;
    }
  }

  if (!bestUser || best > 0.5) throw new Error("Yuz tanilmadi");

  const { data: cred } = await supabaseAdmin
    .from("staff_credentials")
    .select("username, password")
    .eq("user_id", bestUser)
    .maybeSingle();
  if (!cred) throw new Error("Xodim hisobi topilmadi");

  const client = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await client.auth.signInWithPassword({
    email: usernameToEmail(cred.username),
    password: toAuthPassword(cred.password),
  });
  if (error || !data.session) throw new Error("Kirishda xatolik");

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}


/** Login bo'yicha kirish — parol tekshirilmaydi */
export async function signInByUsername(username: string) {
  const name = username.trim();
  if (!name) throw new Error("Login kiriting");

  let { data: cred } = await supabaseAdmin
    .from("staff_credentials")
    .select("username, password")
    .ilike("username", name)
    .maybeSingle();

  if (!cred) {
    await ensureRootAdmin();
    const res = await supabaseAdmin
      .from("staff_credentials")
      .select("username, password")
      .ilike("username", name)
      .maybeSingle();
    cred = res.data;
  }
  if (!cred) throw new Error("Xodim topilmadi");

  const client = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await client.auth.signInWithPassword({
    email: usernameToEmail(cred.username),
    password: toAuthPassword(cred.password),
  });
  if (error || !data.session) throw new Error("Kirishda xatolik");

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.enum(["super_admin", "manager", "cashier", "kitchen", "waiter"]);

export const bootstrapDemoAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { ensureRootAdmin } = await import("./staff.server");
  return ensureRootAdmin();
});

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string }) =>
    z.object({ username: z.string().min(1).max(60) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { usernameToEmail } = await import("./staff.server");
    return { email: usernameToEmail(data.username) };
  });

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data: allowed } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (!allowed) throw new Error("Ruxsat yo'q");
}

export const listStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { listStaff } = await import("./staff.server");
    return listStaff();
  });

export const createStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        username: z.string().min(3).max(40),
        password: z.string().min(5).max(72),
        fullName: z.string().max(80).optional(),
        role: roleSchema,
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { createStaffAccount } = await import("./staff.server");
    const result = await createStaffAccount(data);
    return { ok: true, userId: result.userId };
  });

export const updateStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        username: z.string().min(3).max(40).optional(),
        password: z.string().min(5).max(72).optional(),
        fullName: z.string().max(80).optional(),
        role: roleSchema.optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { updateStaffAccount, ROOT_ADMIN_USERNAME } = await import("./staff.server");
    if (data.username && data.username.trim() === ROOT_ADMIN_USERNAME && data.userId !== context.userId) {
      throw new Error("Bu login band");
    }
    return updateStaffAccount(data);
  });

export const deleteStaffFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("O'zingizni o'chira olmaysiz");
    const { deleteStaffAccount } = await import("./staff.server");
    return deleteStaffAccount(data.userId);
  });

const descriptorSchema = z.array(z.number()).min(64).max(256);

export const registerFaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        descriptor: descriptorSchema,
        label: z.string().max(80).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { registerFace } = await import("./staff.server");
    return registerFace(data);
  });

export const removeFacesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { removeFaces } = await import("./staff.server");
    return removeFaces(data.userId);
  });

export const faceLoginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ descriptor: descriptorSchema }).parse(data))
  .handler(async ({ data }) => {
    const { signInWithFaceDescriptor } = await import("./staff.server");
    return signInWithFaceDescriptor(data.descriptor);
  });


export const usernameLoginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ username: z.string().min(1).max(60) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { signInByUsername } = await import("./staff.server");
    return signInByUsername(data.username);
  });

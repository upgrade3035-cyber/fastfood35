import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save, ScanFace, Trash2 } from "lucide-react";
import {
  listStaffFn,
  createStaffFn,
  deleteStaffFn,
  updateStaffFn,
  registerFaceFn,
  removeFacesFn,
} from "@/lib/staff.functions";
import { cameraSupported } from "@/lib/face-recognition";
import { FaceCapture } from "@/components/face-capture";
import { ROLE_LABELS, type StaffRole } from "@/lib/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  component: StaffPage,
});


const ROLES: StaffRole[] = ["manager", "cashier", "kitchen", "waiter", "super_admin"];

const ROLE_ACCESS: Record<StaffRole, string> = {
  super_admin: "Barcha bo‘limlar",
  manager: "Deyarli barcha bo‘limlar",
  cashier: "Boshqaruv, Buyurtmalar, Mahsulotlar",
  kitchen: "Oshxona, Mahsulotlar, Qo‘lda buyurtma",
  waiter: "Qo‘lda buyurtma, Mahsulotlar",
};

type StaffRow = Awaited<ReturnType<typeof listStaffFn>>[number];

function StaffPage() {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => listStaffFn() });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [withFace, setWithFace] = useState(false);
  const [enrollFor, setEnrollFor] = useState<{ userId: string; label: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const create = useMutation({
    mutationFn: async () => {
      if (username.trim().length < 3) throw new Error("Login kamida 3 belgi bo‘lishi kerak");
      if (!password) throw new Error("Parol kiriting");
      const res = await createStaffFn({
        data: { username: username.trim(), password, fullName: fullName.trim(), role },
      });
      return res;
    },
    onSuccess: (res) => {
      toast.success("Xodim qo‘shildi");
      if (withFace && res.userId) {
        setEnrollFor({ userId: res.userId, label: fullName.trim() || username.trim() });
      }
      setUsername("");
      setPassword("");
      setFullName("");
      setWithFace(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const remove = useMutation({
    mutationFn: (userId: string) => deleteStaffFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("O‘chirildi");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="h-fit rounded-3xl glass p-5">
        <h2 className="text-sm font-extrabold text-foreground">Yangi xodim</h2>
        <div className="mt-3 space-y-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Login"
            aria-label="Login"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="To‘liq ism"
            aria-label="To‘liq ism"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
            aria-label="Parol"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            aria-label="Rol"
            className="w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="rounded-2xl bg-secondary/60 px-4 py-2 text-[11px] text-muted-foreground">
            Ko‘rinadigan bo‘limlar: {ROLE_ACCESS[role]}
          </p>
          <label className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={withFace}
              onChange={(e) => setWithFace(e.target.checked)}
              disabled={!cameraSupported()}
            />
            <ScanFace className="h-4 w-4 text-primary" />
            Qo‘shgandan so‘ng kamera orqali yuzni saqlash
          </label>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground press disabled:opacity-60"
          >
            Qo‘shish
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {(staff.data ?? []).map((s) => (
          <StaffCard key={s.id} row={s} onChanged={invalidate} onRemove={() => remove.mutate(s.id)} />
        ))}
      </section>

      <FaceCapture
        open={!!enrollFor}
        mode="enroll"
        title="Yangi xodim yuzini saqlash"
        onClose={() => setEnrollFor(null)}
        onCaptured={async (descriptor) => {
          if (!enrollFor) return;
          await registerFaceFn({
            data: { userId: enrollFor.userId, descriptor, label: enrollFor.label },
          });
          toast.success("Yuz saqlandi");
          setEnrollFor(null);
          invalidate();
        }}
      />
    </div>
  );
}


function StaffCard({
  row,
  onChanged,
  onRemove,
}: {
  row: StaffRow;
  onChanged: () => void;
  onRemove: () => void;
}) {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState(row.username ?? "");
  const [password, setPassword] = useState(row.password ?? "");
  const [fullName, setFullName] = useState(row.full_name ?? "");
  const [role, setRole] = useState<StaffRole>(row.roles[0] ?? "waiter");

  const save = useMutation({
    mutationFn: () =>
      updateStaffFn({
        data: {
          userId: row.id,
          username: username.trim(),
          ...(password ? { password } : {}),
          fullName: fullName.trim(),
          ...(row.isRoot ? {} : { role }),
        },
      }),
    onSuccess: () => {
      toast.success("Saqlandi");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [faceOpen, setFaceOpen] = useState(false);


  const clearFace = useMutation({
    mutationFn: () => removeFacesFn({ data: { userId: row.id } }),
    onSuccess: () => {
      toast.success("Face ID o‘chirildi");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-3xl glass p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-foreground">
            {row.full_name ?? row.username}
            {row.isRoot ? (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                Super admin
              </span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.roles.map((r) => ROLE_LABELS[r]).join(", ") || "rolsiz"} ·{" "}
            {ROLE_ACCESS[row.roles[0] ?? "waiter"]}
          </p>
        </div>
        {row.isRoot ? null : (
          <button
            aria-label="O‘chirish"
            onClick={onRemove}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-destructive press"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-label="Login"
          placeholder="Login"
          className="w-full rounded-2xl bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Parol"
            placeholder="Parol"
            className="w-full rounded-2xl bg-secondary px-4 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            aria-label="Parolni ko‘rsatish"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-label="To‘liq ism"
          placeholder="To‘liq ism"
          className="w-full rounded-2xl bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          aria-label="Rol"
          disabled={row.isRoot}
          className="w-full rounded-2xl bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 rounded-2xl gradient-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground press disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Saqlash
        </button>
        <button
          onClick={() => setFaceOpen(true)}
          disabled={!cameraSupported()}
          className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-xs font-bold text-foreground press disabled:opacity-60"
        >
          <ScanFace className="h-4 w-4 text-primary" />
          Kamera orqali yuz qo‘shish
        </button>
        {row.faceCount > 0 ? (
          <button
            onClick={() => clearFace.mutate()}
            className="rounded-2xl bg-secondary px-4 py-2.5 text-xs font-bold text-destructive press"
          >
            Yuzni o‘chirish ({row.faceCount})
          </button>
        ) : null}
      </div>

      <FaceCapture
        open={faceOpen}
        mode="enroll"
        title={`${row.full_name ?? row.username} yuzini saqlash`}
        onClose={() => setFaceOpen(false)}
        onCaptured={async (descriptor) => {
          await registerFaceFn({
            data: { userId: row.id, descriptor, label: username || row.username },
          });
          toast.success("Yuz saqlandi");
          setFaceOpen(false);
          onChanged();
        }}
      />
    </div>

  );
}

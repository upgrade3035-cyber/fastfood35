export type GuestProfile = {
  name: string;
  phone: string;
  address: string;
};

const KEY = "lazzat_profile_v1";
export const EMPTY_PROFILE: GuestProfile = { name: "", phone: "", address: "" };

export function readProfile(): GuestProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...(JSON.parse(raw) as Partial<GuestProfile>) };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

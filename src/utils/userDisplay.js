export const USER_SYNC_EVENT = "chaincert:user-updated";

const firstNonEmpty = (...values) => values.find((value) => typeof value === "string" && value.trim());

export const getDisplayName = (user = {}, fallback = "User") => {
  const role = String(user?.role || "").toLowerCase();
  const preferred = role === "issuer"
    ? firstNonEmpty(user.orgName, user.organizationName, user.contactName, user.fullName, user.name, user.username, user.email)
    : firstNonEmpty(user.fullName, user.name, user.username, user.displayName, user.contactName, user.orgName, user.email);

  return preferred || fallback;
};

export const getRoleLabel = (role = "") => {
  const normalized = String(role || "").toLowerCase();
  if (!normalized) return "User";
  if (normalized === "student" || normalized === "user") return "Student";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const buildAvatarUrl = (src, version) => {
  if (!src || typeof src !== "string") return "";
  if (!version || src.startsWith("data:") || src.startsWith("blob:")) return src;
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${encodeURIComponent(version)}`;
};

export const syncStoredUser = (updates = {}) => {
  const current = JSON.parse(localStorage.getItem("user") || "{}");
  const nextUser = { ...current, ...updates };
  localStorage.setItem("user", JSON.stringify(nextUser));
  window.dispatchEvent(new CustomEvent(USER_SYNC_EVENT, { detail: nextUser }));
  return nextUser;
};

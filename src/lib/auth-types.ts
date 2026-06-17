export const USER_ROLES = ["MASTER", "CEO", "DIRETOR", "GERENTE", "CONSULTOR"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UnitSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
};

export type AuthSession = {
  user: AuthUser;
  units: Array<UnitSummary>;
  activeUnit: UnitSummary | null;
  canRegisterUsers: boolean;
  canCreateUnits: boolean;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
  unitId: string;
  unitName: string;
  createdAt: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  MASTER: "Master",
  CEO: "CEO",
  DIRETOR: "Diretor",
  GERENTE: "Gerente",
  CONSULTOR: "Consultor",
};

export function canRegisterUsers(role: UserRole) {
  return ["MASTER", "CEO", "DIRETOR", "GERENTE"].includes(role);
}

export function canDeleteUsers(role: UserRole) {
  return role === "MASTER" || role === "CEO" || role === "DIRETOR";
}

export function canCreateUnits(role: UserRole) {
  return role === "MASTER";
}

export function canViewGrowth(role: UserRole) {
  return role !== "CONSULTOR";
}

export function canViewNetworkGrowth(role: UserRole) {
  return role === "MASTER" || role === "CEO";
}

export function canViewManagement(role: UserRole) {
  return role === "MASTER" || role === "CEO" || role === "DIRETOR" || role === "GERENTE";
}

export function canViewStudents(role: UserRole) {
  return role !== "CONSULTOR";
}

export function canTransferLeads(role: UserRole) {
  return role === "MASTER" || role === "CEO" || role === "DIRETOR" || role === "GERENTE";
}

export function canManageBrandPlen(role: UserRole) {
  return role === "MASTER";
}

export function canManageMetaAds(role: UserRole) {
  return role === "MASTER";
}

export function canViewBrandPlenHistory(role: UserRole) {
  return role === "MASTER" || role === "CEO" || role === "DIRETOR" || role === "GERENTE";
}

export function canManageTraining(role: UserRole) {
  return role === "MASTER" || role === "CEO";
}

export function canSubmitSystemFeedback(role: UserRole) {
  return role === "CEO" || role === "DIRETOR" || role === "GERENTE";
}

export function canManageSystemFeedback(role: UserRole) {
  return role === "MASTER";
}

export function canAccessSystemFeedback(role: UserRole) {
  return canSubmitSystemFeedback(role) || canManageSystemFeedback(role);
}

export function getAssignableRoles(role: UserRole): Array<UserRole> {
  if (role === "MASTER") {
    return ["CEO", "DIRETOR", "GERENTE", "CONSULTOR"];
  }

  if (role === "CEO") {
    return ["DIRETOR", "GERENTE", "CONSULTOR"];
  }

  if (role === "DIRETOR") {
    return ["GERENTE", "CONSULTOR"];
  }

  if (role === "GERENTE") {
    return ["CONSULTOR"];
  }

  return [];
}

export function canDeleteManagedUser(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "MASTER") {
    return true;
  }

  if (actorRole === "CEO") {
    return targetRole === "DIRETOR" || targetRole === "GERENTE" || targetRole === "CONSULTOR";
  }

  if (actorRole === "DIRETOR") {
    return targetRole === "GERENTE" || targetRole === "CONSULTOR";
  }

  return false;
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${first}${second}`.toUpperCase();
}

export const USER_ROLES = [
  "MASTER",
  "CEO",
  "CVO",
  "DIRETOR",
  "GERENTE",
  "MARKETING",
  "CONSULTOR",
] as const;

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
  CVO: "CVO",
  DIRETOR: "Diretor",
  GERENTE: "Gerente",
  MARKETING: "Marketing",
  CONSULTOR: "Consultor",
};

export function isExecutiveRole(role: UserRole) {
  return role === "CEO" || role === "CVO";
}

export function canRegisterUsers(role: UserRole) {
  return ["MASTER", "CEO", "CVO", "DIRETOR", "GERENTE", "MARKETING"].includes(role);
}

export function canDeleteUsers(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "MARKETING";
}

export function canEditUsers(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "MARKETING";
}

export function canCreateUnits(role: UserRole) {
  return role === "MASTER" || role === "MARKETING";
}

export function canManageUnits(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "MARKETING";
}

export function canViewGrowth(role: UserRole) {
  return USER_ROLES.includes(role);
}

export function canViewNetworkGrowth(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role);
}

export function canViewManagement(role: UserRole) {
  return (
    role === "MASTER" ||
    isExecutiveRole(role) ||
    role === "DIRETOR" ||
    role === "GERENTE" ||
    role === "MARKETING"
  );
}

export function canViewStudents(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "GERENTE";
}

export function canTransferLeads(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "GERENTE";
}

export function canAccessLeadTransferCenter(role: UserRole) {
  return canTransferLeads(role) || role === "MARKETING";
}

export function canTransferLeadsImmediately(role: UserRole) {
  return role === "MASTER" || role === "MARKETING";
}

export function canViewAttendances(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "GERENTE";
}

export function canManageBrandPlen(role: UserRole) {
  return role === "MASTER" || role === "MARKETING";
}

export function canManageMetaAds(role: UserRole) {
  return role === "MASTER";
}

export function canViewMetaAds(role: UserRole) {
  return role === "MASTER" || role === "MARKETING";
}

export function canOperateCrm(role: UserRole) {
  return role !== "MARKETING";
}

export function canViewAllUnitLeads(role: UserRole) {
  return canTransferLeads(role) || role === "MARKETING";
}

export function canViewBrandPlenHistory(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role) || role === "DIRETOR" || role === "GERENTE";
}

export function canManageTraining(role: UserRole) {
  return role === "MASTER" || isExecutiveRole(role);
}

export function canViewLeadershipTraining(role: UserRole) {
  return role !== "CONSULTOR";
}

export function canSubmitSystemFeedback(role: UserRole) {
  return isExecutiveRole(role) || role === "DIRETOR" || role === "GERENTE" || role === "MARKETING";
}

export function canManageSystemFeedback(role: UserRole) {
  return role === "MASTER";
}

export function canAccessSystemFeedback(role: UserRole) {
  return canSubmitSystemFeedback(role) || canManageSystemFeedback(role);
}

export function getAssignableRoles(role: UserRole): Array<UserRole> {
  if (role === "MASTER") {
    return ["CEO", "CVO", "DIRETOR", "GERENTE", "MARKETING", "CONSULTOR"];
  }

  if (isExecutiveRole(role)) {
    return ["DIRETOR", "GERENTE", "CONSULTOR"];
  }

  if (role === "DIRETOR") {
    return ["GERENTE", "CONSULTOR"];
  }

  if (role === "GERENTE") {
    return ["CONSULTOR"];
  }

  if (role === "MARKETING") {
    return ["DIRETOR", "GERENTE", "MARKETING", "CONSULTOR"];
  }

  return [];
}

export function canDeleteManagedUser(actorRole: UserRole, targetRole: UserRole) {
  if (actorRole === "MASTER") {
    return true;
  }

  if (isExecutiveRole(actorRole)) {
    return targetRole === "DIRETOR" || targetRole === "GERENTE" || targetRole === "CONSULTOR";
  }

  if (actorRole === "DIRETOR") {
    return targetRole === "GERENTE" || targetRole === "CONSULTOR";
  }

  if (actorRole === "MARKETING") {
    return ["DIRETOR", "GERENTE", "MARKETING", "CONSULTOR"].includes(targetRole);
  }

  return false;
}

export function canEditManagedUser(actorRole: UserRole, targetRole: UserRole) {
  return canDeleteManagedUser(actorRole, targetRole);
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${first}${second}`.toUpperCase();
}

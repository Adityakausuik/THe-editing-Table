export const USER_ROLES = Object.freeze({
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  EDITOR: "editor",
  CLIENT: "client",
  USER: "user"
});

export const ROLE_HIERARCHY = Object.freeze({
  [USER_ROLES.SUPERADMIN]: 200,
  [USER_ROLES.ADMIN]: 100,
  [USER_ROLES.EDITOR]: 60,
  [USER_ROLES.CLIENT]: 30,
  [USER_ROLES.USER]: 10
});

export const API_PREFIX = "/api";

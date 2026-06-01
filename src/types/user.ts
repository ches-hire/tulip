export type UserRole = "admin";

export type UserProfile = {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
};

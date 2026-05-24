export type Role = "admin" | "consultant" | "viewer";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

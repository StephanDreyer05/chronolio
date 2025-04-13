// Type definitions for database schema
// These are shared between client and server but defined separately to avoid direct database imports

export interface SelectUser {
  id: number;
  username: string;
  email: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertUser {
  username: string;
  email?: string | null;
  password: string;
  isEmailVerified?: boolean;
} 
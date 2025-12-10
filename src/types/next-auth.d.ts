import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      username: string | null;
      balance: number;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string | null;
    balance: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    balance?: number;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    username?: string | null;
    balance?: number;
  }
}


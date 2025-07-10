// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      uid?: string | null; 
      pubKey?: string | null; 
    };
  }

  interface User extends DefaultUser {
    Pubkey?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    uid?: string | null; 
    pubKey?: string | null; 
  }
}
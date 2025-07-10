import { DefaultSession} from "next-auth";

declare module "next-auth" {

  interface Session {
    user: DefaultSession["user"] & {
      uid: string; 
      pubKey: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends JWT {
    uid: string;
    pubKey: string; 
  }
}
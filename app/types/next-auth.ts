// next-auth.d.ts
import { DefaultSession} from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      uid: string;
    };
  }
}

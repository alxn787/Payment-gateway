// next-auth.d.ts
import { DefaultSession} from "next-auth";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: DefaultSession["user"] & {
      uid: string; // Add uid to the user object in the session
      pubKey: string; // Add pubKey to the user object in the session
      // Add any other custom properties you have on your user model
    };
  }
}

declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, and is a valid `token` for `session` callback.
   */
  interface JWT extends JWT {
    uid: string; // Add uid to the JWT
    pubKey: string; // Add pubKey to the JWT
    // Add any other custom properties you have on your token
  }
}
import NextAuth from "next-auth";
import { authConfig } from "@/app/lib/authConfig";
import { AuthOptions } from "next-auth";

const handler = NextAuth(authConfig as AuthOptions);

export { handler as GET, handler as POST };
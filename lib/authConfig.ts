/* eslint-disable */
import prisma from "@/prisma";
import { Account, Profile, User, Session as NextAuthSession } from "next-auth"; // Import Session from next-auth
import GoogleProvider from "next-auth/providers/google";
import { generateMPCWallet } from "./shamir-secret";
import { JWT } from "next-auth/jwt";
import { AuthOptions } from "next-auth"; 


export const authConfig: AuthOptions = { 
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXT_AUTH_SECRET ?? "s3cret",
  callbacks: {
    async session({ session, token }: { session: NextAuthSession; token: JWT }): Promise<NextAuthSession> {
      if (session.user && token.uid && token.pubKey) {
        session.user.uid = token.uid;
        session.user.pubKey = token.pubKey;
      }
      return session;
    },
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account: Account | null;
      profile?: Profile;
    }) {
      if (account?.providerAccountId) { 
          const user = await prisma.user.findFirst({
            where: {
              subId: account.providerAccountId,
            }
          });
          if (user) {
            token.uid = user.id;
            token.pubKey = user.Pubkey; 
          }
      }
      return token;
    },
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User; 
      account: Account | null;
      profile?: Profile;
    }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) {
          return false;
        }
        const existingUser = await prisma.user.findFirst({
          where: {
            username: email,
          },
        });
        if (existingUser) {
          return true;
        }

        try {
          const mpcWallet = await generateMPCWallet(email);

          const createdUser = await prisma.user
            .create({
              data: {
                username: email,
                name: profile?.name,
                subId: account?.providerAccountId,
                Pubkey: mpcWallet.publicKey,
                ProfilePicture: profile?.image, 
              },
          })
          const createdPartialKey = await prisma.partialKey.create({
            data: {
              userId: createdUser.id,
              key: mpcWallet.encryptedShare1,
            },
          })
          return true;
        } catch (error) {
          console.error("Failed to create MPC wallet:", error);
          return false;
        }
      }
      return false;
    },
  },
};
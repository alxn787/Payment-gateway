import prisma from "@/prisma";
import { Account, Profile, Session, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Keypair } from "@solana/web3.js";
import { JWT } from "next-auth/jwt";
import { generateMPCWallet } from "./shamir-secret";

export interface CustomSession extends Session {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    uid: string;
    publicKey: string;
  };
}
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXT_AUTH_SECRET ?? "s3cret",
  callbacks: {
    async session({ session, token }: any): Promise<CustomSession> {
      const newSession = session as CustomSession;
      if (newSession.user && token.uid && token.publicKey) {
        newSession.user.uid = token.uid;
        newSession.user.publicKey = token.publicKey;
      }
      return newSession;
    },
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account: Account;
      profile: Profile;
    }) {
      const user = await prisma.user.findFirst({
        where: {
          subId: account?.providerAccountId,
        }
      });
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User;
      account: Account;
      profile: Profile;
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
          const mpcWallet = await generateMPCWallet(account.providerAccountId);

          await prisma.user
            .create({
              data: {
                username: email,
                name: profile?.name,
                subId: account?.providerAccountId,
                // @ts-ignore
                profilePicture: profile?.picture,
              },
            })
            .then(async (user) => {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  solWalletId: user.solWallet?.id,
                  inrWalletId: user.inrWallet?.id,
                },
              });
            });
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
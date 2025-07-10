import { authConfig } from "@/lib/authConfig";
import prisma from "@/prisma";
import { Transaction } from "@solana/web3.js";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const { productId } = await req.json();
  console.log(productId);
  const session = await getServerSession(authConfig);
  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
  const pubKey = await prisma.user.findFirst({
    where: {
      username: session.user.email??"",
    },
    select: {
      Pubkey: true,
    },
  });
  console.log(pubKey);
  const price = await prisma.inventory.findUnique({
    where: {
      id: productId,
    },
    select: {
      price: true,
    },
  });



return new Response("Hello World");
  
}
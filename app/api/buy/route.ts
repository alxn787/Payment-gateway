import { authConfig } from "@/lib/authConfig";
import prisma from "@/prisma";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  const { productId , signature, productprice } = await req.json();
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
  await prisma.inventory.update({
    where: {
        id: productId,
    },
    data: {
        stock: {
            decrement: 1,
        }
    },
  })
  const order = await prisma.order.create({
    data: {
        userId: session.user.uid??"",
        amount: productprice,
        Signature: signature,
        paymentStatus: "confirmed",
    },  
  });


return  Response.json({order: order});
  
}
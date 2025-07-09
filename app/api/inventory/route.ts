// app/api/inventory/route.ts
import { PrismaClient } from '../../generated/prisma'; // Adjust path as necessary
import { NextResponse } from 'next/server';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Define the Product type based on your hardcodedInventory structure
// Note: We'll exclude 'id' when creating new records as it's auto-generated.
interface ProductInput {
    id: string;
    name: string;
    price: number;
    stock: number;
    image: string;
}

// Hardcoded inventory data (we'll only use name, price, stock, image for creatio
export async function GET() {
  try {
    const inv = await prisma.inventory.findMany();

    return NextResponse.json({ message: "Inventory populated successfully!", data: inv }, { status: 200 });
  } catch (error) {
    console.error("Error populating inventory:", error);
    return NextResponse.json({ message: "Failed to populate inventory.", error: error }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client after the operation
  }
}

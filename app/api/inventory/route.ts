import { PrismaClient } from '../../generated/prisma'; 
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface ProductInput {
    id: string;
    name: string;
    price: number; // Float
    stock: number;
    image: string;
}

export async function GET() {
  try {
    const inv = await prisma.inventory.findMany();

    return NextResponse.json({ message: "Inventory populated successfully!", data: inv }, { status: 200 });
  } catch (error) {
    console.error("Error populating inventory:", error);
    return NextResponse.json({ message: "Failed to populate inventory.", error: error }, { status: 500 });
  } finally {
    await prisma.$disconnect(); 
  }
}

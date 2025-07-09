// app/api/inventory/route.ts
import { PrismaClient } from '../../generated/prisma'; // Adjust path as necessary
import { NextResponse } from 'next/server';

// Initialize Prisma Client
const prisma = new PrismaClient();

// Define the Product type based on your hardcodedInventory structure
// Note: We'll exclude 'id' when creating new records as it's auto-generated.
interface ProductInput {
  name: string;
  price: number;
  stock: number;
  image: string;
}

// Hardcoded inventory data (we'll only use name, price, stock, image for creation)
export const hardcodedInventory: ProductInput[] = [
  {
    name: "RGB Gaming Chair Pro Max",
    price: 299,
    stock: 15,
    image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=500&h=500&fit=crop"
  },
  {
    name: "Mechanical Gaming Keyboard",
    price: 149,
    stock: 23,
    image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop"
  },
  {
    name: "Wireless Gaming Mouse",
    price: 79,
    stock: 31,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop"
  },
  {
    name: "Gaming Headset with RGB",
    price: 119,
    stock: 18,
    image: "https://images.unsplash.com/photo-1599669454699-248893623440?w=500&h=500&fit=crop"
  },
  {
    name: "4K Gaming Monitor 27\"",
    price: 399,
    stock: 8,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop"
  },
  {
    name: "Gaming Desk with LED",
    price: 249,
    stock: 12,
    image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&h=500&fit=crop"
  },
  {
    name: "Wireless Controller",
    price: 59,
    stock: 27,
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=500&h=500&fit=crop"
  },
  {
    name: "Gaming Mousepad XL",
    price: 29,
    stock: 45,
    image: "https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=500&h=500&fit=crop"
  },
  {
    name: "RGB Gaming Speakers",
    price: 89,
    stock: 19,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop"
  },
  {
    name: "Gaming Webcam HD",
    price: 69,
    stock: 22,
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500&h=500&fit=crop"
  },
  {
    name: "Ergonomic Gaming Chair",
    price: 199,
    stock: 9,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop"
  },
  {
    name: "Compact Gaming Keyboard",
    price: 99,
    stock: 35,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop"
  }]

export async function POST() {
  try {
    const results = [];
    for (const product of hardcodedInventory) {
      // Find a product by its name. If it exists, update it. Otherwise, create it.
      // This is a common pattern when UUIDs are auto-generated and you need
      // a different unique identifier (like 'name') to prevent duplicates on re-runs.
        const upsertedProduct = await prisma.inventory.create({
            data: {
                name: product.name,
                price: product.price,
                stock: product.stock,  
                image: product.image,
            },
        });
      results.push(upsertedProduct);
    }

    return NextResponse.json({ message: "Inventory populated successfully!", data: results }, { status: 200 });
  } catch (error) {
    console.error("Error populating inventory:", error);
    return NextResponse.json({ message: "Failed to populate inventory.", error: error }, { status: 500 });
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client after the operation
  }
}

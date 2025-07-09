// app/api/seed-inventory/route.ts

import prisma from '@/prisma';
import { NextResponse } from 'next/server';


// You can place your hardcodedInventory here or import from a separate file if needed
export const hardcodedInventory = [
  {
    id: "1",
    name: "RGB Gaming Chair Pro Max",
    price: 299,
    stock: 15,
    image: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=500&h=500&fit=crop"
  },
  {
    id: "2",
    name: "Mechanical Gaming Keyboard",
    price: 149,
    stock: 23,
    image: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=500&h=500&fit=crop"
  },
  {
    id: "3",
    name: "Wireless Gaming Mouse",
    price: 79,
    stock: 31,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&h=500&fit=crop"
  },
  {
    id: "4",
    name: "Gaming Headset with RGB",
    price: 119,
    stock: 18,
    image: "https://images.unsplash.com/photo-1599669454699-248893623440?w=500&h=500&fit=crop"
  },
  {
    id: "5",
    name: "4K Gaming Monitor 27\"",
    price: 399,
    stock: 8,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500&h=500&fit=crop"
  },
  {
    id: "6",
    name: "Gaming Desk with LED",
    price: 249,
    stock: 12,
    image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=500&h=500&fit=crop"
  },
  {
    id: "7",
    name: "Wireless Controller",
    price: 59,
    stock: 27,
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=500&h=500&fit=crop"
  },
  {
    id: "8",
    name: "Gaming Mousepad XL",
    price: 29,
    stock: 45,
    image: "https://images.unsplash.com/photo-1616763355548-1b606f439f86?w=500&h=500&fit=crop"
  },
  {
    id: "9",
    name: "RGB Gaming Speakers",
    price: 89,
    stock: 19,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&h=500&fit=crop"
  },
  {
    id: "10",
    name: "Gaming Webcam HD",
    price: 69,
    stock: 22,
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=500&h=500&fit=crop"
  },
  {
    id: "11",
    name: "Ergonomic Gaming Chair",
    price: 199,
    stock: 9,
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=500&fit=crop"
  },
  {
    id: "12",
    name: "Compact Gaming Keyboard",
    price: 99,
    stock: 35,
    image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&h=500&fit=crop"
  }
];

export async function POST() {
  try {
        const scaledInventory = hardcodedInventory.map((item) => ({
        ...item,
        price: Math.min(0.004, Math.max(0.0008, parseFloat((item.price / 100000).toFixed(6)))),
        }));

        for (const product of scaledInventory) {
        await prisma.inventory.create({
          data: {
            name: product.name,
            price: product.price,
            stock: product.stock,
            image: product.image,
          },
        });
        }
        
      return NextResponse.json({ message: 'Inventory seeded successfully' });
    }
   catch (error) {
    console.error('[SEED_INVENTORY_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to seed inventory', details: error },
      { status: 500 }
    );
  }
}

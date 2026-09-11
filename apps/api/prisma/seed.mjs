import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const categories = [
  ['Homes', 'homes'], ['Electronics', 'electronics'], ['Vehicles', 'vehicles'],
  ['Furniture', 'furniture'], ['Services', 'services'], ['Jobs', 'jobs']
];
const locations = [
  ['Coimbatore', 'Tamil Nadu'], ['Chennai', 'Tamil Nadu'], ['Bengaluru', 'Karnataka'],
  ['Mumbai', 'Maharashtra'], ['Delhi', 'Delhi']
];

for (const [name, slug] of categories) await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug } });
for (const [city, state] of locations) {
  const existing = await prisma.location.findFirst({ where: { city, state } });
  if (!existing) await prisma.location.create({ data: { city, state } });
}
await prisma.$disconnect();

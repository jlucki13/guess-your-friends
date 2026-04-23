import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const prompts = [
  "What's the weirdest thing you've ever eaten on a dare?",
  "What's a skill you have that would surprise most people?",
  "If you could only eat one food for a month, what would it be?",
  "What's the most embarrassing thing that's happened to you in public?",
  "What's a movie or show you secretly love but never admit to?",
  "What would your friends say is your most annoying habit?",
  "If you won $10,000 tomorrow, what's the first thing you'd buy?",
  "What's the worst job you've ever had or can imagine?",
  "What's something you believed as a kid that turned out to be completely wrong?",
  "What fictional world would you most want to live in?",
  "What's the most ridiculous thing you've ever argued about?",
  "If you had to pick a theme song that plays whenever you enter a room, what would it be?",
  "What's a totally irrational fear you have?",
  "What's the most out-of-character thing you've ever done?",
  "If you could be an expert at anything overnight, what would you pick?",
  "What's the pettiest thing you've ever done to get back at someone?",
  "What's a hill you'll die on no matter what?",
  "What's the worst advice you've ever been given that you actually followed?",
];

async function main() {
  await prisma.prompt.deleteMany();
  await prisma.prompt.createMany({
    data: prompts.map((text) => ({ text })),
  });
  console.log(`Seeded ${prompts.length} prompts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

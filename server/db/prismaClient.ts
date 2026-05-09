import "dotenv/config";

let prisma: any = null;

if (process.env.DATABASE_URL && process.env.USE_PRISMA === "true") {
  const { PrismaClient } = await import("@prisma/client");
  prisma = new PrismaClient();
  console.log("Prisma client initialized");
} else {
  console.log(
    "Prisma not enabled (set DATABASE_URL and USE_PRISMA=true to enable)",
  );
}

export { prisma };

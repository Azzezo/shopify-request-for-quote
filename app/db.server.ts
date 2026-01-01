import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient;
}

// Add connection timeout for Neon's cold start (free tier sleeps after inactivity)
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || "";
  if (url && !url.includes("connect_timeout")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}connect_timeout=30&pool_timeout=30`;
  }
  return url;
};

const prisma: PrismaClient =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;


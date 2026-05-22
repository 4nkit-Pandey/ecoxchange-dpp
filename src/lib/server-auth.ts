// Re-export auth helper using next-auth v4 getServerSession
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function auth() {
  return getServerSession(authOptions);
}

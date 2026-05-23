import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "ecoxchange-dpp-secret-key-cjinnwjtxlxyhrbkutz-2024",
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" },
        name: { label: "Name", type: "text" },
        college: { label: "College", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const action = credentials.action as string;

        // Sign-up flow
        if (action === "signup") {
          const name = credentials.name as string;
          const college = credentials.college as string;
          if (!name) throw new Error("Name is required");

          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) throw new Error("An account with this email already exists");

          const hashedPassword = await hash(password, 12);
          const user = await prisma.user.create({
            data: { name, email, college: college || undefined },
          });

          await prisma.account.create({
            data: {
              userId: user.id,
              type: "credentials",
              provider: "credentials",
              providerAccountId: user.id,
              access_token: hashedPassword,
            },
          });

          return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin };
        }

        // Sign-in flow
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error("No account found with this email");

        const credAccount = await prisma.account.findFirst({
          where: { userId: user.id, provider: "credentials" },
        });

        if (!credAccount?.access_token) throw new Error("Invalid credentials");

        const isValid = await compare(password, credAccount.access_token);
        if (!isValid) throw new Error("Incorrect password");

        if (user.isSuspended) throw new Error("Your account has been suspended");

        return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);

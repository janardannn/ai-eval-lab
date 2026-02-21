import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

const baseAdapter = PrismaAdapter(prisma);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...baseAdapter,
    createSession: (data) => prisma.authSession.create({ data }),
    getSessionAndUser: async (sessionToken) => {
      const row = await prisma.authSession.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!row) return null;
      const { user, ...session } = row;
      return { session, user };
    },
    updateSession: (data) =>
      prisma.authSession.update({
        where: { sessionToken: data.sessionToken },
        data,
      }),
    deleteSession: (sessionToken) =>
      prisma.authSession.delete({ where: { sessionToken } }),
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

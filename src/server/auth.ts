import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "~/server/db";

const authSecret = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(rawCredentials) {
      const parsedCredentials = credentialsSchema.safeParse(rawCredentials);
      if (!parsedCredentials.success) return null;

      const email = parsedCredentials.data.email.toLowerCase();
      const user = await db.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const isValidPassword = await bcrypt.compare(
        parsedCredentials.data.password,
        user.passwordHash,
      );

      if (!isValidPassword) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const dbUser = await db.user.upsert({
        where: { email: user.email.toLowerCase() },
        update: {
          name: user.name,
          image: user.image,
          googleId: account.providerAccountId,
        },
        create: {
          email: user.email.toLowerCase(),
          name: user.name,
          image: user.image,
          googleId: account.providerAccountId,
        },
      });

      user.id = dbUser.id;
      user.email = dbUser.email;
      user.name = dbUser.name;
      user.image = dbUser.image;

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      if (user?.image) token.picture = user.image;
      return token;
    },
    session({ session, token }) {
      if (!session.user) return session;

      session.user.id = token.sub;
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.image = typeof token.picture === "string" ? token.picture : null;

      return session;
    },
  },
};

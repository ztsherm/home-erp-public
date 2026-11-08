import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db";
import { isValidPin } from "@/features/auth/pin";

const authSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  pin: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const parsed = authSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email?.toLowerCase().trim();
        const pin = parsed.data.pin?.trim();
        const password = parsed.data.password;

        if (pin) {
          if (!isValidPin(pin)) return null;

          // 1. If email is provided along with PIN
          if (email) {
            const user = await prisma.user.findUnique({
              where: { email },
              include: { household: true, people: true },
            });

            if (user && user.status === "ACTIVE" && user.people?.pin === pin) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                householdId: user.householdId,
                householdName: user.household.name,
                peopleId: user.peopleId ?? "",
                role: user.role,
                status: user.status,
              };
            }
          }

          // 2. Direct PIN-only login (PINs are unique across all active people in the household)
          const person = await prisma.people.findFirst({
            where: { pin, active: true, ...(email ? { email } : {}) },
            include: { household: true },
          });

          if (person) {
            let user = await prisma.user.findFirst({
              where: { householdId: person.householdId, peopleId: person.id },
              include: { household: true },
            });

            if (!user) {
              const userEmail = person.email ? person.email.toLowerCase() : `user-${person.id}@homeerp.local`;
              user = await prisma.user.upsert({
                where: { email: userEmail },
                update: {
                  peopleId: person.id,
                  role: "MEMBER",
                  status: "ACTIVE",
                },
                create: {
                  householdId: person.householdId,
                  peopleId: person.id,
                  name: person.name,
                  email: userEmail,
                  passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
                  role: "MEMBER",
                  status: "ACTIVE",
                },
                include: { household: true },
              });
            }

            return {
              id: user.id,
              name: user.name,
              email: user.email,
              householdId: user.householdId,
              householdName: user.household.name,
              peopleId: user.peopleId ?? person.id,
              role: user.role,
              status: user.status,
            };
          }
          return null;
        }

        if (email && password && password.length >= 8) {
          // Password-based login
          const user = await prisma.user.findUnique({
            where: { email },
            include: { household: true },
          });
          if (!user || user.status !== "ACTIVE") return null;
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            householdId: user.householdId,
            householdName: user.household.name,
            peopleId: user.peopleId ?? "",
            role: user.role,
            status: user.status,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.householdId = user.householdId;
        token.householdName = user.householdName;
        token.peopleId = user.peopleId;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.householdId = String(token.householdId ?? "");
        session.user.householdName = String(token.householdName ?? "");
        session.user.peopleId = String(token.peopleId ?? "");
        session.user.role = String(token.role ?? "");
        session.user.status = String(token.status ?? "");
      }
      return session;
    },
  },
});

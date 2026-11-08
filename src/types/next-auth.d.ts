import "next-auth";

declare module "next-auth" {
  interface User {
    householdId: string;
    householdName: string;
    peopleId: string;
    role: string;
    status: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      householdId: string;
      householdName: string;
      peopleId: string;
      role: string;
      status: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    householdId?: string;
    householdName?: string;
    peopleId?: string;
    role?: string;
    status?: string;
  }
}

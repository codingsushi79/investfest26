import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "investfest-session";

export interface User {
  id: string;
  username: string;
  name: string | null;
  balance: number;
}

export interface Session {
  id: string;
  userId: string;
  expires: Date;
}

export async function signIn(user: { id: string }): Promise<Session> {
  // Generate a unique session token
  const sessionToken = crypto.randomUUID();

  // Create session
  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return session;
}

export async function signOut() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionToken) {
    // Delete session from database
    await prisma.session.deleteMany({
      where: { sessionToken },
    });

    // Clear cookie
    cookieStore.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return null;
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      // Session expired or not found
      if (session) {
        await prisma.session.delete({
          where: { sessionToken },
        });
      }
      return null;
    }

    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      balance: session.user.balance,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

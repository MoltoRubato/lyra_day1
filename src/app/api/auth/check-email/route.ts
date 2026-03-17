import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  return NextResponse.json({
    exists: Boolean(user),
    hasPassword: Boolean(user?.passwordHash),
  });
}

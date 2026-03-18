import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "~/server/db";

const requestSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Please provide a valid name, email, and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });

  if (existingUser) {
    return NextResponse.json({ message: "An account already exists for this email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

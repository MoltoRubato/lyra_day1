import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "~/server/auth";
import { db } from "~/server/db";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await db.user.delete({
    where: { id: userId },
  });

  return NextResponse.json({ ok: true });
}

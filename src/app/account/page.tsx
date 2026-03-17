import { getServerSession } from "next-auth";

import { AccountOverviewClient } from "~/app/_components/account/AccountOverviewClient";
import { authOptions } from "~/server/auth";
import { db } from "~/server/db";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "ryan0130@outlook.com";
  const nameFromSession = session?.user?.name?.trim();
  const displayName =
    nameFromSession && nameFromSession.length > 0
      ? nameFromSession
      : (email.split("@")[0] ?? "ryan");

  const dbUser = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
      })
    : null;

  return (
    <AccountOverviewClient
      displayName={displayName}
      email={email}
      hasPassword={Boolean(dbUser?.passwordHash)}
    />
  );
}

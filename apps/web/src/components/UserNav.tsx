import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { UserDropdown } from "./UserDropdown";

export async function UserNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="h-9 px-4 inline-flex items-center justify-center text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 transition-all duration-150 active:scale-[0.98]"
      >
        Sign in
      </Link>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return (
    <UserDropdown
      name={session.user.name || "User"}
      email={session.user.email || ""}
      image={session.user.image}
      isAdmin={user?.isAdmin ?? false}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    />
  );
}

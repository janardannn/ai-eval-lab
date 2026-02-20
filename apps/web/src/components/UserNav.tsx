import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export async function UserNav() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-foreground/60">
        {session.user.name || session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="text-sm text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

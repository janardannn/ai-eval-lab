import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

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

  return (
    <div className="flex items-center gap-4">
      <span className="text-[14px] text-muted-foreground">
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
          className="text-[14px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

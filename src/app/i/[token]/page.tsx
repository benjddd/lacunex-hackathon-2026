import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveInvite } from "@/lib/invites";

export const runtime = "nodejs";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await resolveInvite(token);

  if (!invite) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-50 px-6">
        <div className="max-w-md rounded-xl border border-stone-200 bg-white px-6 py-8 text-center">
          <h1 className="text-lg font-semibold text-stone-900">
            Invite not found
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            The invite link is invalid or has been removed. Ask your host for a
            fresh link.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-xs text-amber-700 underline hover:text-amber-900"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  redirect(`/p/${invite.template_id}?invite=${token}`);
}

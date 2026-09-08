import { NextResponse } from "next/server";

/** Public self-signup is closed. Demo requests go through /api/demo-request;
 *  admins create accounts via POST /api/auth/create-user. */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Les inscriptions sont fermées. Demande un accès démo depuis la page d’accueil.",
    },
    { status: 403 }
  );
}

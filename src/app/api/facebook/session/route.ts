import { NextResponse } from "next/server";
import {
  finishFacebookLogin,
  openFacebookLogin,
} from "@/facebook/local-browser";

// Opens a local Chrome window on the Facebook login page.
export async function POST() {
  if (process.env.HOUSE_SEARCH_ENABLE_FACEBOOK !== "1") {
    return NextResponse.json(
      { error: "Facebook experimental adapter is disabled" },
      { status: 404 },
    );
  }

  try {
    const result = await openFacebookLogin();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to open Facebook login window",
      },
      { status: 500 },
    );
  }
}

// Closes the login window so the persistent profile keeps the session.
export async function DELETE() {
  if (process.env.HOUSE_SEARCH_ENABLE_FACEBOOK !== "1") {
    return NextResponse.json(
      { error: "Facebook experimental adapter is disabled" },
      { status: 404 },
    );
  }

  try {
    const result = await finishFacebookLogin();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to finish Facebook login",
      },
      { status: 500 },
    );
  }
}

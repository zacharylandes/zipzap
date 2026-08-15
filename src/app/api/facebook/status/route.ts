import { NextResponse } from "next/server";
import { checkFacebookStatus } from "@/facebook/local-browser";

export async function GET() {
  if (process.env.HOUSE_SEARCH_ENABLE_FACEBOOK !== "1") {
    return NextResponse.json(
      { connected: false, message: "Facebook experimental adapter is disabled" },
      { status: 404 },
    );
  }

  try {
    const status = await checkFacebookStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to check Facebook status",
      },
      { status: 500 },
    );
  }
}

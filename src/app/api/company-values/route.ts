import { NextRequest, NextResponse } from "next/server";
import { getCompanyValues } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    // Check if user is the operator
    const user = await getCurrentUser();
    if (!user || user.username !== process.env.OP_USERNAME) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const companyValues = await getCompanyValues();
    return NextResponse.json(companyValues);
  } catch (error) {
    console.error("Company values error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

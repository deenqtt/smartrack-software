import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { predictionService } from "@/lib/services/prediction-service";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");

  if (!configId) {
    return NextResponse.json({ message: "Config ID is required" }, { status: 400 });
  }

  try {
    const prediction = await predictionService.getBillPrediction(configId);
    return NextResponse.json(prediction);
  } catch (error: any) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { message: "Failed to fetch prediction", error: error.message },
      { status: 500 }
    );
  }
}

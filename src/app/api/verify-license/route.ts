import { NextResponse } from "next/server";
import { verifyProductLicenseDetailed } from "@/lib/licenses";

type VerifyLicenseBody = {
  licenseKey?: string;
  license_key?: string;
  product?: string;
  product_name?: string;
  machineId?: string;
  machine_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyLicenseBody;
  const licenseKey = body.licenseKey ?? body.license_key;
  const product = body.product ?? body.product_name;
  const machineId = body.machineId ?? body.machine_id;
  const result = await verifyProductLicenseDetailed({
    licenseKey,
    product,
    machineId
  });

  if (result.valid) {
    return NextResponse.json({
      ready: true,
      valid: true,
      message: result.message,
      license: {
        status: result.license.status,
        product: product ?? "",
        licenseKey: result.license.license_key,
        issuedAt: result.license.created_at,
        maxDevices: "max_devices" in result.license ? result.license.max_devices : 1
      }
    });
  }

  return NextResponse.json({
    ready: true,
    valid: false,
    message: result.message,
    received: {
      licenseKey: licenseKey ?? "",
      product: product ?? "",
      machineId: machineId ?? ""
    },
    expectedFields: ["license key", "product", "machineId"]
  });
}

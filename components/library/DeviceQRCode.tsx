"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DeviceQRCodeProps {
  id: string;
  data: object;
  label: string;
  sublabel?: string;
  size?: number;
  showDownload?: boolean;
}

export function DeviceQRCode({
  id,
  data,
  label,
  sublabel,
  size = 280,
  showDownload = true,
}: DeviceQRCodeProps) {
  useEffect(() => {
    const generate = async () => {
      const canvas = document.getElementById(id) as HTMLCanvasElement;
      if (!canvas) return;
      try {
        const QRCode = (await import("qrcode")).default;
        await QRCode.toCanvas(canvas, JSON.stringify(data), {
          width: size,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
      } catch (e) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#666";
          ctx.font = "12px monospace";
          ctx.textAlign = "center";
          ctx.fillText("QR Error", size / 2, size / 2);
        }
      }
    };
    generate();
  }, [id, data, size]);

  const handleDownload = () => {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${label}_qr.png`;
    link.href = canvas.toDataURL();
    link.click();
    toast.success(`QR code for ${label} downloaded`);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        id={id}
        width={size}
        height={size}
        className="border border-border rounded-lg shadow-sm"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
      {showDownload && (
        <Button size="sm" variant="outline" onClick={handleDownload} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Download PNG
        </Button>
      )}
    </div>
  );
}

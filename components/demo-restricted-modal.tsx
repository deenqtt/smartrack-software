"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight } from "lucide-react";

interface DemoRestrictedModalProps {
  open: boolean;
  onClose: () => void;
  featureName?: string;
}

export function DemoRestrictedModal({
  open,
  onClose,
  featureName,
}: DemoRestrictedModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center gap-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-1">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <Badge variant="secondary" className="text-xs font-semibold tracking-widest uppercase px-3">
            Demo Mode
          </Badge>
          <DialogTitle className="text-xl font-bold mt-1">
            {featureName ? `"${featureName}" ` : "Fitur ini "}
            tidak tersedia di Demo
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center leading-relaxed">
            Anda sedang menjelajahi versi demo Smartrack dengan data simulasi.
            Fitur ini tersedia pada instalasi penuh — hubungi kami untuk info lebih lanjut.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-4 mt-2 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Tersedia di versi penuh
          </p>
          {[
            "Konfigurasi perangkat & jaringan",
            "Manajemen user & role",
            "Automation rules engine",
            "OTA update & backup",
            "Dan seluruh fitur lainnya",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-foreground/80">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Kembali
          </Button>
          <Button className="flex-1 gap-2" onClick={onClose}>
            Hubungi Kami
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let active = true;
    let controls: IScannerControls | undefined;

    void reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!active || !result) return;
        onDetected(result.getText());
        setOpen(false);
      })
      .then((nextControls) => {
        controls = nextControls;
      });

    return () => {
      active = false;
      controls?.stop();
    };
  }, [onDetected, open]);

  if (!open) {
    return (
      <Button variant="secondary" type="button" onClick={() => setOpen(true)}>
        <Camera className="h-4 w-4" />
        Scanner
      </Button>
    );
  }

  return (
    <Card className="fixed inset-x-4 top-20 z-50 mx-auto max-w-xl p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium">Aponte a câmera para o código</p>
        <Button variant="ghost" type="button" onClick={() => setOpen(false)} aria-label="Fechar scanner">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <video ref={videoRef} className="aspect-video w-full rounded-md bg-black object-cover" muted />
    </Card>
  );
}

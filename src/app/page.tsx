"use client";

import { ZapIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Placeholder landing page — replace with the real concierge experience.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            HackOHI/O 2026 · AEP
          </Badge>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ZapIcon className="size-5" />
            AI Outage Concierge
          </CardTitle>
          <CardDescription>
            Predict. Explain. Prepare. Communicate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input placeholder="Enter an anonymized premise or circuit ID" />
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => toast.success("Scaffold is working. Start building!")}
          >
            Check my risk
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

import { Card, CardContent } from "@/components/ui/card";

interface KeyDetectorProps {
  musicalKey: string;
}

export function KeyDetector({ musicalKey }: KeyDetectorProps) {
  return (
    <Card className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardContent className="py-6 px-4 text-center">
        <h2 className="text-xl md:text-2xl font-semibold mb-2 text-primary">
          Key
        </h2>
        <div className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          {musicalKey || "--"}
        </div>
      </CardContent>
    </Card>
  );
}

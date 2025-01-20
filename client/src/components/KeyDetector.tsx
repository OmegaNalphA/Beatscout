import { Card, CardContent } from "@/components/ui/card";

interface KeyDetectorProps {
  musicalKey: string;
}

export function KeyDetector({ musicalKey }: KeyDetectorProps) {
  return (
    <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardContent className="p-3 md:p-6 text-center">
        <h2 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-primary">Key</h2>
        <div className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          {musicalKey || '--'}
        </div>
      </CardContent>
    </Card>
  );
}
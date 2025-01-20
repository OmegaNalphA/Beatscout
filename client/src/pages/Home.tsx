import { AudioAnalyzer } from "@/components/AudioAnalyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          BeatScout
        </h1>
        <p className="text-muted-foreground">
          Real-time Music Analysis Tool
        </p>
      </header>

      <main>
        <AudioAnalyzer />
      </main>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          For DJs and music enthusiasts. Use in clubs and venues to analyze live music.
        </p>
      </footer>
    </div>
  );
}

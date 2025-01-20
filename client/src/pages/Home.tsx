import { AudioAnalyzer } from "@/components/AudioAnalyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-6 flex flex-col min-h-screen">
        <header className="text-center mb-6">
          <h1 className="text-4xl font-bold tracking-tighter mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            BeatScout
          </h1>
          <p className="text-muted-foreground">Real-time Music Analysis Tool</p>
        </header>

        <main className="flex-1">
          <AudioAnalyzer />
        </main>

        <footer className="text-center text-sm text-muted-foreground mt-6 pb-6">
          <p>
            For DJs and music enthusiasts. Use in clubs and venues to analyze
            live music.
          </p>
        </footer>
      </div>
    </div>
  );
}

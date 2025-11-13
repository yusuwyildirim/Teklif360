export const Header = () => {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <img 
            src="/Logo/Teklif360-PNG-ICO.png" 
            alt="Teklif360 Logo" 
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-foreground">Teklif360</h1>
            <p className="text-xs text-muted-foreground">İhale Doküman Sistemi</p>
          </div>
        </div>
      </div>
    </header>
  );
};

import React from 'react';

interface SplashScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, onComplete }) => {
  const [logoError, setLogoError] = React.useState(false);
  const [boltError, setBoltError] = React.useState(false);

  React.useEffect(() => {
    if (isVisible) {
      // Auto-hide splash screen after 3 seconds
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const handleLogoError = () => {
    console.log('Logo failed to load, showing fallback');
    setLogoError(true);
  };

  const handleBoltError = () => {
    console.log('Bolt badge failed to load');
    setBoltError(true);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Bolt badge - positioned at top */}
      {!boltError && (
        <img 
          src="/bolt.png"
          alt="Bolt Badge"
          className="absolute top-8 right-8 w-16 h-16 sm:w-20 sm:h-20 object-contain filter drop-shadow-lg animate-pulse"
          onError={handleBoltError}
          onLoad={() => console.log('Bolt badge loaded successfully')}
        />
      )}

      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-40"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-ping opacity-30"></div>
        <div className="absolute bottom-1/3 right-1/5 w-2 h-2 bg-indigo-400 rounded-full animate-pulse opacity-40"></div>
      </div>

      {/* Main content container */}
      <div className="relative flex flex-col items-center space-y-8 px-4">
        
        {/* Logo with bouncing animation */}
        <div className="relative">
          <div className="animate-bounce">
            <div className="relative p-6 bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20">
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Was This Vibe Coded Logo"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain filter drop-shadow-lg"
                  onError={handleLogoError}
                  onLoad={() => console.log('Logo loaded successfully')}
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl sm:text-5xl font-bold">
                  WV
                </div>
              )}
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-3xl blur-xl animate-pulse"></div>
            </div>
          </div>
          
          {/* Floating rings around logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 border border-blue-400/30 rounded-full animate-spin"></div>
            <div className="absolute w-32 h-32 sm:w-40 sm:h-40 border border-purple-400/20 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '4s'}}></div>
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Was This <span className="text-blue-400">Vibe</span> Coded?
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Discover and analyze AI-assisted projects
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center space-y-6">
          {/* Progress bar */}
          <div className="w-64 sm:w-80 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Loading dots */}
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          
          {/* Loading text */}
          <p className="text-slate-400 text-sm animate-pulse font-medium">
            Initializing application...
          </p>
        </div>

        {/* Debug info (remove in production) */}
        <div className="text-xs text-slate-500 mt-4 space-y-1">
          <div>Logo: {logoError ? 'Using fallback' : 'Loaded successfully'}</div>
          <div>Bolt: {boltError ? 'Failed to load' : 'Loaded successfully'}</div>
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
    </div>
  );
};
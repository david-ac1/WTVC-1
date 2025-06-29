import React from 'react';

interface UseSplashScreenOptions {
  minDisplayTime?: number;
  autoHide?: boolean;
}

export const useSplashScreen = (options: UseSplashScreenOptions = {}) => {
  const { minDisplayTime = 2000, autoHide = true } = options;
  const [isVisible, setIsVisible] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
        if (autoHide) {
          setIsVisible(false);
        }
      }, remainingTime);
    };

    // Check if the page is already loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [minDisplayTime, autoHide]);

  const hideSplash = React.useCallback(() => {
    setIsVisible(false);
  }, []);

  const showSplash = React.useCallback(() => {
    setIsVisible(true);
    setIsLoading(true);
  }, []);

  return {
    isVisible,
    isLoading,
    hideSplash,
    showSplash
  };
};
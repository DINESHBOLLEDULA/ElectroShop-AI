import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import Toast from
'react-native-toast-message';

const API_URL =
'http://192.168.29.222:8000/health';

const BackendContext =
createContext({
  isBackendConnected:
    false,
  isChecking:
    true,
});

export const BackendProvider =
({ children }: any) => {
  const [
    isBackendConnected,
    setIsBackendConnected,
  ] = useState(false);

  const [
    isChecking,
    setIsChecking,
  ] = useState(true);

  const previous =
    useRef<
      boolean | null
    >(null);

  useEffect(() => {
    const checkBackend =
  async () => {
    try {
      const controller =
        new AbortController();

      const timeout =
        setTimeout(() => {
          controller.abort();
        }, 2000);

      const response =
        await fetch(
          API_URL,
          {
            signal:
              controller.signal,
          }
        );

      clearTimeout(
        timeout
      );

      const connected =
        response.ok;

      setIsBackendConnected(
        connected
      );

      // first check done
      // first load and already offline

      // first successful check
if (
  previous.current ===
  null
) {
  previous.current =
    connected;

  setIsChecking(
    false
  );

  return;
}

      // LOST
      if (
        previous.current &&
        !connected
      ) {
        Toast.show({
  type: 'error',
  text1:
    'Backend Offline',
  text2:
    'Some features may not work',
  visibilityTime:
    4000,
});
      }

      // RESTORED
      if (
        !previous.current &&
        connected
      ) {
        Toast.show({
          type:
            'success',
          text1:
            'Backend Connected',
            text2:
    'Connection restored',
        });
      }

      previous.current =
        connected;

    } catch {
      setIsBackendConnected(
        false
      );

      // IMPORTANT
      // stop checking state
      setIsChecking(
        false
      );

      // first load
      // app started offline
if (
  previous.current ===
  null
) {
  previous.current =
    false;

  setIsChecking(
    false
  );

  Toast.show({
    type: 'error',
    text1:
      'Backend Offline',
    text2:
      'Some features may not work',
    visibilityTime:
      4000,
  });

  return;
}

      // LOST
      
      Toast.show({
  type: 'error',
  text1:
    'Backend Offline',
  text2:
    'Some features may not work',
  visibilityTime:
    6000,
}); 
      previous.current =
        false;
    }
  };

    checkBackend();

    const interval =
      setInterval(
        checkBackend,
        5000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  return (
    <BackendContext.Provider
      value={{
        isBackendConnected,
        isChecking,
      }}
    >
      {children}
    </BackendContext.Provider>
  );
};

export const useBackend =
() =>
  useContext(
    BackendContext
  );
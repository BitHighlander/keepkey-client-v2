import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import '@src/index.css';
import { PioneerProvider as PP } from '@coinmasters/pioneer-react';
import { ChakraProvider, useColorMode } from '@chakra-ui/react';
import Popup from '@src/Popup';
import { theme } from '@src/styles/theme';

const ForceDarkMode = ({ children }: { children: React.ReactNode }) => {
  const { setColorMode } = useColorMode();

  useEffect(() => {
    setColorMode('dark');
  }, [setColorMode]);

  return <>{children}</>;
};

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Cannot find #app-container');
  }
  //@ts-ignore
  appContainer.style.height = '600px'; // Ensure the container has fixed height
  //@ts-ignore
  appContainer.style.width = '390px'; // Ensure the container has fixed width

  const root = createRoot(appContainer);
  root.render(
    <ChakraProvider theme={theme}>
      <ForceDarkMode>
        <PP>
          <Popup />
        </PP>
      </ForceDarkMode>
    </ChakraProvider>,
  );
}

init();

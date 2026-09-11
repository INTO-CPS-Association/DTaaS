// Inter, the typeface the Material-UI dashboard template sets. Only the four
// weights the type scale uses: importing the family would ship nine files
// where four are read.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/roboto';

import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import AppProvider from 'AppProvider';
import { useURLbasename } from 'util/envUtil';
import routes from 'routes';

const App = () => {
  const router = createBrowserRouter(routes, {
    basename: `/${useURLbasename()}`,
  });

  const root = document.getElementById('root');

  if (root) {
    ReactDOM.createRoot(root).render(
      <StrictMode>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </StrictMode>,
    );
  } else {
    throw Error("Couldn't find root element");
  }
};

App();

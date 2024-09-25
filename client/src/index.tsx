import '@fontsource/roboto';
import * as React from 'react';
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
      <React.StrictMode>
        <AppProvider>
          <RouterProvider router={router} />
        </AppProvider>
      </React.StrictMode>,
    );
  } else {
    throw Error("Couldn't find root element");
  }
};

App();

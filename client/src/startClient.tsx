import { StrictMode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import AppProvider from 'AppProvider';
import { useURLbasename } from 'util/envUtil';
import routes from 'routes';

/** Render the client into `#root`. */
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
    throw new Error("Couldn't find root element");
  }
};

export default App;

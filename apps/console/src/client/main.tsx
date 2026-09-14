import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import './styles.css';
import { createQueryClient } from './query-client';
import { router } from './router';

const root = document.getElementById('root');
if (root === null) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);

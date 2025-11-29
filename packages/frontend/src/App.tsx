import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Home from './pages/Home';
import CreateTask from './pages/CreateTask';
import TaskDetail from './pages/TaskDetail';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import '@mysten/dapp-kit/dist/index.css';

// Configure Sui network
const network = 'testnet';
const queryClient = new QueryClient();
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={network}>
        <WalletProvider autoConnect>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<Callback />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/create"
                element={
                  <ProtectedRoute>
                    <CreateTask />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:taskId"
                element={
                  <ProtectedRoute>
                    <TaskDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;

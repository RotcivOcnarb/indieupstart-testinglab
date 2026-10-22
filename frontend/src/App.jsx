import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { PublishGame } from './pages/PublishGame';
import { SubmitReview } from './pages/SubmitReview';
import { MyGames } from './pages/MyGames';
import { ReviewHistory } from './pages/ReviewHistory';
import { RulesFaq } from './pages/RulesFaq';
import Admin from './pages/Admin';

const ProtectedLayout = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
      <Route path="/publish" element={<ProtectedLayout><PublishGame /></ProtectedLayout>} />
      <Route path="/reviews" element={<ProtectedLayout><SubmitReview /></ProtectedLayout>} />
      <Route path="/review/:threadId" element={<ProtectedLayout><SubmitReview /></ProtectedLayout>} />
      <Route path="/my-games" element={<ProtectedLayout><MyGames /></ProtectedLayout>} />
      <Route path="/history" element={<ProtectedLayout><ReviewHistory /></ProtectedLayout>} />
      <Route path="/rules" element={<ProtectedLayout><RulesFaq /></ProtectedLayout>} />
      <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

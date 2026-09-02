import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';
import { PublishGame } from './pages/PublishGame';
import { SubmitReview } from './pages/SubmitReview';
import { MyGames } from './pages/MyGames';
import { ReviewHistory } from './pages/ReviewHistory';
import { RulesFaq } from './pages/RulesFaq';

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/publish" element={<PublishGame />} />
              <Route path="/reviews" element={<SubmitReview />} />
              <Route path="/review/:threadId" element={<SubmitReview />} />
              <Route path="/my-games" element={<MyGames />} />
              <Route path="/history" element={<ReviewHistory />} />
              <Route path="/rules" element={<RulesFaq />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

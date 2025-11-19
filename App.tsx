import React, { useState, useCallback } from 'react';
import { Participant } from './types';
import RegistrationForm from './components/RegistrationForm';
import SuccessView from './components/SuccessView';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import useLocalStorage from './hooks/useLocalStorage';
import { AppView } from './types';

const Header: React.FC<{ onAdminClick: () => void, currentView: AppView, isConfigured: boolean }> = ({ onAdminClick, currentView, isConfigured }) => (
  <header className="bg-white shadow-md">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center">
          <svg className="h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-3.5 7m7-10H5a2 2 0 00-2 2v8a2 2 0 002 2h2.5" />
          </svg>
          <span className="ml-3 text-2xl font-bold text-gray-800 tracking-tight">GEMS Training Program</span>
          {!isConfigured && <span className="ml-3 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">Local Mode</span>}
        </div>
        <div>
          {currentView !== 'adminDashboard' && (
            <button
              onClick={onAdminClick}
              className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              Admin Login
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('registration');
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useLocalStorage<Participant[]>('gems_participants', []);
  const [googleSheetUrl, setGoogleSheetUrl] = useLocalStorage<string>('gems_google_sheet_url', '');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const isConfigured = googleSheetUrl && googleSheetUrl.startsWith('https://script.google.com');

  const handleRegistrationSuccess = useCallback((participant: Participant) => {
    setParticipants(prev => [...prev, participant]);
    setCurrentParticipant(participant);
    setView('success');
  }, [setParticipants]);

  const handleRegisterAnother = useCallback(() => {
    setCurrentParticipant(null);
    setView('registration');
  }, []);

  const handleAdminLogin = useCallback(() => {
    setIsAdmin(true);
    setView('adminDashboard');
  }, []);

  const handleAdminLogout = useCallback(() => {
    setIsAdmin(false);
    setView('registration');
  }, []);

  const handleAdminClick = useCallback(() => {
    setView('adminLogin');
  }, []);

  const renderView = () => {
    if (isAdmin) {
      return <AdminDashboard
        participants={participants}
        setParticipants={setParticipants}
        onLogout={handleAdminLogout}
        googleSheetUrl={googleSheetUrl}
        setGoogleSheetUrl={setGoogleSheetUrl}
      />;
    }

    switch (view) {
      case 'registration':
        return <RegistrationForm onRegistrationSuccess={handleRegistrationSuccess} googleSheetUrl={googleSheetUrl} />;
      case 'success':
        return currentParticipant && <SuccessView participant={currentParticipant} onRegisterAnother={handleRegisterAnother} />;
      case 'adminLogin':
        return <AdminLogin onLoginSuccess={handleAdminLogin} />;
      case 'adminDashboard':
         return <AdminDashboard
           participants={participants}
           setParticipants={setParticipants}
           onLogout={handleAdminLogout}
           googleSheetUrl={googleSheetUrl}
           setGoogleSheetUrl={setGoogleSheetUrl}
         />;
      default:
        return <RegistrationForm onRegistrationSuccess={handleRegistrationSuccess} googleSheetUrl={googleSheetUrl} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header onAdminClick={handleAdminClick} currentView={view} isConfigured={!!isConfigured} />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
      <footer className="bg-white py-4">
          <div className="text-center text-sm text-gray-500">
              © {new Date().getFullYear()} GWellth. All rights reserved.
          </div>
      </footer>
    </div>
  );
};

export default App;
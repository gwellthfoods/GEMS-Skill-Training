import React, { useState, useCallback } from 'react';
import { Participant } from './types';
import RegistrationForm from './components/RegistrationForm';
import SuccessView from './components/SuccessView';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import useLocalStorage from './hooks/useLocalStorage';
import { AppView } from './types';

const Header: React.FC<{ onAdminClick: () => void, currentView: AppView, isConfigured: boolean }> = ({ onAdminClick, currentView, isConfigured }) => (
  <header className="bg-white shadow-md border-b border-gray-100 relative">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-24">
        {/* Left: Logo and Tagline */}
        <div className="flex flex-col justify-center z-10">
          <a href="https://www.gwellth.com" target="_blank" rel="noopener noreferrer" className="flex items-center group">
            <div className="flex items-center text-[#f9a825]">
              <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <span className="ml-2 text-3xl font-black tracking-tighter group-hover:text-[#f57f17] transition-colors">Gwellth</span>
            </div>
          </a>
          <p className="font-signature text-green-700 text-lg mt-0.5">Fuel your Body, Feed your Soul.</p>
        </div>

        {/* Center: Program Title - Absolutely positioned to stay centered */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full max-w-[300px] md:max-w-none pointer-events-none">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight text-center pointer-events-auto">
            GEMS Training Program
          </h1>
          <p className="text-xs md:text-sm font-medium text-gray-600 text-center pointer-events-auto mt-0.5">
            GWellth Entrepreneurship and Management Skills
          </p>
          {!isConfigured && (
            <span className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-widest pointer-events-auto">
              Local Mode
            </span>
          )}
        </div>

        {/* Right: Admin Login */}
        <div className="flex items-center z-10">
          {currentView !== 'adminDashboard' && (
            <button
              onClick={onAdminClick}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
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
    setParticipants(prev => {
      const index = prev.findIndex(p => p.id === participant.id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = participant;
        return updated;
      }
      return [...prev, participant];
    });
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
        return <RegistrationForm onRegistrationSuccess={handleRegistrationSuccess} googleSheetUrl={googleSheetUrl} participants={participants} />;
      case 'success':
        return currentParticipant && (
          <SuccessView 
            participant={currentParticipant} 
            onRegisterAnother={handleRegisterAnother} 
            onEdit={() => setView('registration')}
          />
        );
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
        return <RegistrationForm onRegistrationSuccess={handleRegistrationSuccess} googleSheetUrl={googleSheetUrl} participants={participants} />;
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
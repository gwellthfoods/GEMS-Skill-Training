
import React, { useState } from 'react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

const validCredentials = [
  'gwellth2021@gmail.com',
  'gwellth.foods@gmail.com',
  '8433014984',
  '9269267664',
];

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (validCredentials.includes(credential.trim())) {
      onLoginSuccess();
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
          <p className="text-sm text-gray-600">Please login to manage participants.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="credential" className="block text-sm font-medium text-gray-700">
              Email or Mobile Number
            </label>
            <div className="mt-1">
              <input
                id="credential"
                name="credential"
                type="text"
                autoComplete="email"
                required
                value={credential}
                onChange={(e) => {
                  setCredential(e.target.value);
                  setError('');
                }}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;

import React, { useState } from 'react';
import { LogIn, User, KeyRound, Clock } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const storedCredentialsRaw = localStorage.getItem('userCredentials');
      if (storedCredentialsRaw) {
        const storedCredentials = JSON.parse(storedCredentialsRaw);
        if (username === storedCredentials.username && password === storedCredentials.password) {
          onLoginSuccess();
        } else {
          setError('Nume de utilizator sau parolă incorectă.');
        }
      } else {
        setError('Eroare: Nu s-au găsit datele de cont. Vă rugăm să reîncărcați aplicația.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
            <div className="inline-block p-4 bg-blue-600 rounded-3xl mb-4">
                <Clock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Contor Ore</h1>
            <p className="text-gray-500 mt-2">Autentificați-vă pentru a continua.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 space-y-2">
                <input
                    type="text"
                    placeholder="Nume utilizator"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-transparent text-gray-900 py-2 border-b border-gray-200 focus:border-blue-500 focus:outline-none"
                    required
                />
                <input
                    type="password"
                    placeholder="Parolă"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-gray-900 py-2 focus:border-blue-500 focus:outline-none"
                    required
                />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl flex items-center justify-center font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'
              }`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <span>Conectare</span>
              )}
            </button>
        </form>
      </div>
    </div>
  );
};
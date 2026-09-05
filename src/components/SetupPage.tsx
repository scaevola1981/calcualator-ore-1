import React, { useState } from 'react';
import { Clock } from 'lucide-react';

interface SetupPageProps {
  onSetupComplete: () => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să conțină cel puțin 6 caractere.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const credentials = { username, password };
        localStorage.setItem('userCredentials', JSON.stringify(credentials));
        onSetupComplete();
      } catch (err) {
        setError('A apărut o eroare la salvarea datelor.');
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
          <h1 className="text-4xl font-bold text-gray-900">Bun venit!</h1>
          <p className="text-gray-500 mt-2">Creați un cont pentru a începe.</p>
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
              placeholder="Parolă (min. 6 caractere)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-gray-900 py-2 border-b border-gray-200 focus:border-blue-500 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Confirmare parolă"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent text-gray-900 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl flex items-center justify-center font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 ${isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-400'
              }`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <span>Creare Cont</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
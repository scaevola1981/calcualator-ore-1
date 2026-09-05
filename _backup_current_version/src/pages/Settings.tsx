import { useWork } from '../context/WorkContext';
import { User, Globe, Moon, Sun, Info, ChevronRight, Calculator } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, t } = useWork();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold tracking-tight text-primary">{t('settings')}</h1>
      
      {/* SECTION: PROFILE */}
      <div>
         <h2 className="text-xs uppercase font-bold text-secondary mb-2 opacity-70">
            Profil
         </h2>
         <div className="ios-card flex flex-col" style={{ gap: '12px', padding: '16px' }}>
           
           {/* Item: Name */}
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
                <User size={16} />
             </div>
             <div className="flex-1">
               <label className="block text-xs font-medium text-secondary mb-1">
                 {t('userName')}
               </label>
               <input 
                  type="text" 
                  value={settings.userName}
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                  placeholder="Numele tău"
                  className="w-full text-base p-2 rounded-[20px] outline-none text-primary placeholder-gray-400"
                  style={{ backgroundColor: 'var(--input-bg)' }}
                />
             </div>
           </div>

           {/* Item: Hourly Rate */}
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0">
                <Calculator size={16} />
             </div>
             <div className="flex-1">
                <label className="block text-xs font-medium text-secondary mb-1">
                   {t('hourlyRate')} ({settings.currency || 'EUR'})
                </label>
                <input 
                  type="number" 
                  value={settings.hourlyRate || ''}
                  onChange={(e) => updateSettings({ hourlyRate: Number(e.target.value) })}
                  className="w-full text-base p-2 rounded-[20px] outline-none text-primary"
                  style={{ backgroundColor: 'var(--input-bg)' }}
                />
             </div>
           </div>

         </div>
      </div>

      {/* SECTION: APPEARANCE */}
      <div>
         <h2 className="text-xs uppercase font-bold text-secondary mb-2 opacity-70">
            Personalizare
         </h2>
         <div className="ios-card flex flex-col" style={{ gap: '0', padding: '0' }}>
             
             {/* Language Row */}
             <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0">
                        <Globe size={16} />
                    </div>
                    <span className="text-sm font-medium text-primary">{t('language')}</span>
                 </div>
                 {/* iOS Segmented Control for Language */}
                 <div className="bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-[20px] flex">
                    <button 
                       onClick={() => updateSettings({ language: 'RO' })}
                       className={`px-3 py-1 text-xs font-bold rounded-[20px] transition-all ${settings.language === 'RO' ? 'text-white' : 'text-secondary'}`}
                       style={settings.language === 'RO' ? { backgroundColor: '#FF00FF' } : {}}
                    >
                      RO
                    </button>
                    <button 
                       onClick={() => updateSettings({ language: 'EL' })}
                       className={`px-3 py-1 text-xs font-bold rounded-[20px] transition-all ${settings.language === 'EL' ? 'text-white' : 'text-secondary'}`}
                       style={settings.language === 'EL' ? { backgroundColor: '#FF00FF' } : {}}
                    >
                      EL
                    </button>
                 </div>
             </div>

             {/* Theme Toggle */}
             <div className="flex items-center justify-between p-4 cursor-pointer" onClick={toggleTheme}>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white flex-shrink-0">
                        {settings.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <span className="text-sm font-medium text-primary">{t('darkMode')}</span>
                 </div>
                 
                 {/* iOS Switch */}
                 <div className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${settings.theme === 'dark' ? 'translate-x-5' : ''}`}></div>
                 </div>
             </div>
         </div>
      </div>

       {/* SECTION: INFO */}
      <div>
         <h2 className="text-xs uppercase font-bold text-secondary mb-2 opacity-70">
            Despre
         </h2>
         <div className="ios-card" style={{ padding: '0' }}>
             <div className="flex items-center justify-between p-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white flex-shrink-0">
                        <Info size={16} />
                    </div>
                    <span className="text-sm font-medium text-primary">{t('appVersion')}</span>
                 </div>
                 <div className="flex items-center text-secondary">
                    <span className="mr-1 text-xs">2.0.0 (Striped)</span>
                    <ChevronRight size={14} />
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
}

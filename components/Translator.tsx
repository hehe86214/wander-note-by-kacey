
import React, { useRef, useState } from 'react';
import { translateImageText, translateText } from '../services/geminiService';
import { TripSettings } from '../types';

interface Props {
  onBack: () => void;
  settings: TripSettings | null;
}

type Mode = 'TEXT' | 'CAMERA';

const Translator: React.FC<Props> = ({ onBack, settings }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('TEXT');
  const [targetLang, setTargetLang] = useState('the local language'); // Default special string
  
  // Text Mode State
  const [inputText, setInputText] = useState('');
  const [translationResult, setTranslationResult] = useState<{translated: string, pronunciation: string} | null>(null);
  
  // Camera Mode State
  const [image, setImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  // Dynamic context for "Local Language"
  const localContext = settings ? settings.destinations.join(', ') : 'the current location';

  // SIMPLIFIED LANGUAGE LIST AS REQUESTED
  const TARGET_LANGUAGES = [
    { label: `偵測當地語言 (Auto Detect Local)`, value: 'the local language' },
    { label: 'English', value: 'English' },
  ];

  // Handlers
  const handleTextTranslate = async () => {
      if (!inputText.trim()) return;
      setLoading(true);
      setTranslationResult(null); // Clear previous
      
      const result = await translateText(inputText, targetLang, localContext);
      setTranslationResult(result);
      setLoading(false);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setTranslationResult(null); // Clear previous
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        
        const cleanBase64 = base64.split(',')[1];
        // Pass context if using auto-detect/local
        const langToPass = targetLang === 'the local language' ? `the local language of ${localContext}` : targetLang;
        const result = await translateImageText(cleanBase64, langToPass);
        setTranslationResult(result);
        setLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
      setImage(null);
      setTranslationResult(null);
  };

  const isError = translationResult?.translated?.includes('Error') || translationResult?.translated?.includes('失敗') || translationResult?.translated?.includes('繁忙');

  return (
    <div className="min-h-screen bg-[#F9F9F7] flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 z-20 bg-white/50 backdrop-blur-sm sticky top-0">
         <button 
           onClick={onBack}
           className="w-10 h-10 bg-white border border-ink-100 rounded-full flex items-center justify-center text-ink-900 hover:bg-ink-50 transition-all shadow-sm"
         >
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6"/></svg>
         </button>
         <span className="text-ink-900 font-serif tracking-widest text-sm uppercase font-bold">AI Translator</span>
         <div className="w-10"></div>
      </div>

      {/* Language Selector Area */}
      <div className="px-6 pb-6 z-10 flex flex-col items-center gap-2">
          
          {/* Input Label (Fixed) */}
          <div className="w-full bg-white border border-ink-100 rounded-lg p-3 text-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400 block mb-1">From</span>
              <span className="font-serif text-ink-900 font-bold">繁體中文 (Traditional Chinese)</span>
          </div>

          <div className="text-ink-300 py-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
          </div>

          {/* Target Selector */}
          <div className="w-full relative mt-1">
              <span className="absolute left-0 -top-5 text-[10px] uppercase tracking-[0.2em] text-ink-400 w-full text-center">To</span>
              <select 
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full appearance-none bg-ink-900 text-white border border-ink-900 py-3 pl-8 pr-12 rounded-lg text-center font-serif text-sm focus:outline-none shadow-md"
              >
                  {TARGET_LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
          </div>
          {targetLang === 'the local language' && settings && (
              <p className="text-[10px] text-ink-400 italic mt-1">
                  Destination: {settings.destinations.join(', ')}
              </p>
          )}
      </div>

      {/* --- TEXT MODE --- */}
      {mode === 'TEXT' && (
          <div className="flex-1 flex flex-col px-6 animate-fade-in pb-24 max-w-md mx-auto w-full">
              
              {/* Input Area */}
              <div className="bg-white border border-ink-100 rounded-2xl p-5 shadow-float flex-1 min-h-[200px] flex flex-col mb-6 relative">
                  <textarea
                    className="w-full h-full resize-none outline-none text-ink-900 text-lg font-serif placeholder-ink-300 bg-transparent"
                    placeholder="輸入中文開始翻譯..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  {inputText && (
                      <div className="flex justify-end pt-2 border-t border-ink-50 mt-2">
                           <button 
                             onClick={() => { setInputText(''); setTranslationResult(null); }}
                             className="text-xs text-ink-400 uppercase tracking-widest hover:text-ink-900"
                           >
                               Clear
                           </button>
                      </div>
                  )}
              </div>

              {/* Action Button */}
              <div className="flex justify-center mb-6">
                  <button 
                    onClick={handleTextTranslate}
                    disabled={loading || !inputText}
                    className="w-16 h-16 bg-accent-matcha rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                      {loading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 7 7 7-7"/><path d="M12 19V5"/></svg>
                      )}
                  </button>
              </div>

              {/* Result Area */}
              <div className={`border rounded-2xl p-6 shadow-inner min-h-[150px] relative flex flex-col justify-center transition-colors ${isError ? 'bg-red-50 border-red-200' : 'bg-[#F0F0F0] border-ink-100'}`}>
                  {translationResult ? (
                      <div className="text-center">
                          <p className={`font-serif text-2xl leading-relaxed font-medium mb-2 ${isError ? 'text-red-500 text-base' : 'text-ink-900'}`}>
                              {translationResult.translated}
                          </p>
                          {translationResult.pronunciation && !isError && (
                            <p className="text-ink-400 font-sans text-xs italic tracking-wide border-t border-ink-200 pt-2 inline-block px-4">
                                {translationResult.pronunciation}
                            </p>
                          )}
                      </div>
                  ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                          <span className="font-serif italic text-sm">Translation will appear here</span>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- CAMERA MODE --- */}
      {mode === 'CAMERA' && (
          <div className="flex-1 flex flex-col relative bg-ink-900">
               {/* Image Preview or Placeholder */}
               {image ? (
                   <div className="absolute inset-0 z-0 bg-black">
                       <img src={image} alt="Original" className="w-full h-full object-contain opacity-80" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                       
                       <button 
                        onClick={clearImage}
                        className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center"
                       >
                           ✕
                       </button>
                   </div>
               ) : (
                   <div className="absolute inset-0 z-0 flex flex-col items-center justify-center">
                        <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-3xl relative flex items-center justify-center">
                            <span className="text-white/30 font-serif">Tap shutter below</span>
                        </div>
                   </div>
               )}

               {/* Translation Result Overlay */}
               {translationResult && (
                   <div className={`absolute bottom-32 left-4 right-4 backdrop-blur-xl p-6 rounded-xl shadow-2xl max-h-[50vh] overflow-y-auto z-10 animate-slide-up border-l-4 ${isError ? 'bg-red-50/95 border-red-500' : 'bg-white/95 border-accent-matcha'}`}>
                        <p className={`font-serif text-xl leading-relaxed font-medium mb-2 ${isError ? 'text-red-600' : 'text-ink-900'}`}>
                            {translationResult.translated}
                        </p>
                        {translationResult.pronunciation && !isError && (
                            <p className="text-ink-400 font-sans text-xs italic tracking-wide">
                                {translationResult.pronunciation}
                            </p>
                        )}
                   </div>
               )}

               {/* Camera Trigger */}
               <div className="absolute bottom-28 left-0 right-0 flex justify-center z-0 pointer-events-none">
                    <div className="pointer-events-auto">
                        {!image && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 hover:bg-white/20 transition-all active:scale-95 backdrop-blur-sm"
                            >
                                <div className="w-14 h-14 bg-white rounded-full shadow-lg"></div>
                            </button>
                        )}
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/*" 
                            capture="environment"
                            onChange={handleCapture}
                            className="hidden" 
                        />
                    </div>
               </div>
               
               {loading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                         <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                         <span className="text-white font-serif tracking-widest text-sm">Translating...</span>
                    </div>
               )}
          </div>
      )}

      {/* Bottom Tab Bar */}
      <div className="h-20 bg-white border-t border-ink-100 flex items-center justify-around px-8 z-20 shadow-up">
          <button 
            onClick={() => setMode('TEXT')}
            className={`flex flex-col items-center gap-1 transition-all ${mode === 'TEXT' ? 'text-ink-900 -translate-y-1' : 'text-ink-300 hover:text-ink-500'}`}
          >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
              <span className="text-[10px] font-bold tracking-widest uppercase">Text</span>
          </button>

          <button 
            onClick={() => setMode('CAMERA')}
            className={`flex flex-col items-center gap-1 transition-all ${mode === 'CAMERA' ? 'text-ink-900 -translate-y-1' : 'text-ink-300 hover:text-ink-500'}`}
          >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span className="text-[10px] font-bold tracking-widest uppercase">Camera</span>
          </button>
      </div>

    </div>
  );
};

export default Translator;

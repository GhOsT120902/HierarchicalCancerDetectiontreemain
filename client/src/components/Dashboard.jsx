import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import HeroSection from './HeroSection';
import UploadWorkflow from './UploadWorkflow';
import DiagnosticResults from './DiagnosticResults';
import ModelAccuracy from './ModelAccuracy';

export default function Dashboard({ onLogout, theme, toggleTheme }) {
  const [modelStatus, setModelStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const userEmail = localStorage.getItem('medai_user_email') || 'doctor@hospital.org';

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data.model_status);
      } else {
        setModelStatus({ error: 'Could not reach the local inference server.' });
      }
    } catch (err) {
      setModelStatus({ error: 'Could not reach the local inference server.' });
    }
  };

  const handlePredict = async (payload) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
        if (data.result.model_status) {
          setModelStatus(data.result.model_status);
        }
      } else {
        setError(data.error || 'The analysis failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not reach the analysis server. Please check the connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        onLogout={onLogout}
        theme={theme}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header userEmail={userEmail} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {activeTab === 'Model Accuracy' ? (
              <ModelAccuracy />
            ) : (
              <>
                <HeroSection modelStatus={modelStatus} />

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <UploadWorkflow
                    modelStatus={modelStatus}
                    onPredict={handlePredict}
                    isProcessing={isProcessing}
                    result={result}
                  />
                  <DiagnosticResults result={result} />
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

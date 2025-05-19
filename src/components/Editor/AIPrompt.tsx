import { useState } from 'react';
import { X } from 'lucide-react';

interface AIPromptProps {
  onClose: () => void;
  onGenerateTemplate: (template: string) => void;
}

export const AIPrompt = ({ onClose, onGenerateTemplate }: AIPromptProps) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError('');
    setDebugInfo(null);

    try {
      console.log('Submitting prompt to API:', prompt.substring(0, 50) + '...');
      
      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const responseText = await response.text();
      console.log('API response status:', response.status);
      console.log('API response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response:', e);
        throw new Error(`Invalid response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to generate template';
        setDebugInfo(JSON.stringify(data, null, 2));
        throw new Error(errorMsg);
      }

      if (!data.template) {
        setDebugInfo(JSON.stringify(data, null, 2));
        throw new Error('No template received from API');
      }

      onGenerateTemplate(data.template);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error in AI template generation:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#F5E5B0] rounded-lg shadow-xl w-full max-w-md p-6 border border-[#D0B56F]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-black">Generate Document Template</h2>
          <button 
            onClick={onClose}
            className="text-gray-700 hover:text-black"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block mb-2 text-sm text-gray-700">
            Describe the document you want to create:
          </label>
          <textarea
            className="w-full p-3 bg-[#F8F2D8] border border-[#D0B56F] rounded-md text-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#A97A53]"
            rows={5}
            placeholder="e.g., A project proposal for a mobile app with sections for overview, goals, timeline, and budget"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />

          {error && (
            <div className="text-red-600 mb-4 text-sm">
              <div>Error: {error}</div>
              {debugInfo && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Technical details</summary>
                  <pre className="mt-2 p-2 bg-[#F8F2D8] rounded text-xs overflow-auto whitespace-pre-wrap border border-[#D0B56F]">
                    {debugInfo}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-black mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-[#A97A53] text-white rounded hover:bg-[#8D6544] disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Generate Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 
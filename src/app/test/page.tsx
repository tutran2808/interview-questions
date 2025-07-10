'use client';

import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Create test data
      const testResumeContent = `
John Doe
Software Engineer
Experience: 5 years in JavaScript, React, Node.js
Education: BS Computer Science
Skills: JavaScript, React, Node.js, MongoDB, AWS
Previous roles: Frontend Developer, Full Stack Developer
      `;

      const formData = new FormData();
      formData.append('jobDescription', `
Software Engineer Position
We are looking for a skilled Software Engineer to join our team.
Requirements:
- 3+ years of experience in JavaScript and React
- Experience with Node.js and databases
- Strong problem-solving skills
- Experience with cloud platforms (AWS preferred)
- Good communication skills
      `);
      
      const resumeBlob = new Blob([testResumeContent], { type: 'text/plain' });
      const resumeFile = new File([resumeBlob], 'test-resume.txt', { type: 'text/plain' });
      
      formData.append('resume', resumeFile);
      formData.append('hiringStage', 'Technical Interview');

      console.log('Testing API endpoint...');
      
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        setResult({ error: data.error || 'API Error' });
        return;
      }

      setResult(data);
      console.log('API Response:', data);
      
    } catch (error) {
      console.error('Test failed:', error);
      setResult({ error: 'Test failed: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">API Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <p className="text-gray-600 mb-4">
            This page tests the API endpoint with sample data. Make sure you've added your Gemini API key to .env.local
          </p>
          
          <button
            onClick={testAPI}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test API'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Result:</h2>
            
            {result.error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {result.error}
              </div>
            ) : (
              <div>
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  ✅ API call successful!
                </div>
                
                {result.questions && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Generated Questions:</h3>
                    {Object.entries(result.questions).map(([category, questions]: [string, any]) => (
                      <div key={category} className="mb-6">
                        <h4 className="font-medium text-indigo-600 mb-2 border-b pb-1">
                          {category}
                        </h4>
                        <ul className="space-y-2">
                          {questions.map((question: string, index: number) => (
                            <li key={index} className="flex items-start">
                              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium mr-2 px-2 py-1 rounded-full flex-shrink-0 mt-0.5">
                                {index + 1}
                              </span>
                              <span className="text-gray-700">{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                    Show raw response
                  </summary>
                  <pre className="bg-gray-100 p-4 rounded mt-2 text-sm overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
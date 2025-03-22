import React, { useRef, useState, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import './App.css';
import logo from './assets/logo2.png';

function App() {
  const canvasRef = useRef(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [overlayImage, setOverlayImage] = useState(null);
  const [brushColor, setBrushColor] = useState("#0000FF"); // Changed to blue default
  const [brushRadius, setBrushRadius] = useState(3);
  const colorSwatches = ["#FF0000", "#00FF00", "#0000FF", "#FF9900", "#9900FF"];
  const [canvasSize, setCanvasSize] = useState({
    width: Math.min(window.innerWidth * 0.9, 1200),
    height: Math.min(window.innerHeight * 0.7, 800)
  });
  const [editableText, setEditableText] = useState('');
  const [visionText, setVisionText] = useState(''); // Add this state for Llama Vision results
  const [activeTab, setActiveTab] = useState('draw'); // Add this for tab control
  const [latexOutput, setLatexOutput] = useState(''); // Add this for LaTeX output
  const [uploadedImage, setUploadedImage] = useState(null);
  const [solutionSteps, setSolutionSteps] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({
        width: Math.min(window.innerWidth * 0.9, 2000),
        height: Math.min(window.innerHeight * 0.7, 800)
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClear = () => {
    canvasRef.current?.clearCanvas();
    setAnswer('');
    setOverlayImage(null);
    setVisionText('');
    setEditableText('');
  };

  const addTextToCanvas = (base64Image, text) => {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      ctx.font = '48px sans-serif';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const x = canvas.width / 2;
      const y = 20;
      
      ctx.fillText(text, x, y);
      
      const newBase64 = canvas.toDataURL('image/png');
      setOverlayImage(newBase64);
    };
  };

  const handleCalculate = async () => {
    if (canvasRef.current) {
      setLoading(true);
      try {
        const imageData = await canvasRef.current.exportImage('png');
        await processVision(imageData);
      } catch (error) {
        console.error('Failed to process canvas:', error);
      }
      setLoading(false);
    }
  };

  const processVision = async (imageData) => {
    try {
      console.log('Sending image data length:', imageData?.length);

      const response = await fetch('${baseURL}/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageBase64: imageData.split(',')[1]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server error: ${errorData.details || response.statusText}`);
      }

      const data = await response.json();
      console.log('Vision API Response:', data);

      if (data.text) {
        setVisionText(data.text);
        setEditableText(data.text);
      }
    } catch (error) {
      console.error('Vision API Error:', error);
      // Optionally show user-friendly error
      // alert('Failed to process image. Please try again.');
    }
  };

  const handleSubmitEquation = async () => {
    setLoading(true);
    try {
      const fullDataUrl = canvasRef.current.getDataURL('png');
      const response = await fetch('${baseURL}/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageBase64: fullDataUrl.split(',')[1],
          ocrText: editableText
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.description) {
        setAnswer(data.description);
        addTextToCanvas(fullDataUrl, data.description);
      }
    } catch (error) {
      console.error('API error:', error);
      alert('An error occurred while processing. Please try again.');
    }
    setLoading(false);
  };

  const handleCanvasChange = () => {
    clearTimeout(window.visionTimeout);
    window.visionTimeout = setTimeout(async () => {
      if (canvasRef.current) {
        const imageData = await canvasRef.current.exportImage('png');
        processVision(imageData);
      }
    }, 1000);
  };

  const handleLatexConversion = async () => {
    setLoading(true);
    try {
      const response = await fetch('${baseURL}/latex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expression: editableText
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLatexOutput(data.latex);
    } catch (error) {
      console.error('LaTeX conversion error:', error);
      alert('Failed to convert to LaTeX. Please try again.');
    }
    setLoading(false);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
        // Process the uploaded image
        processVision(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add this helper function to convert LaTeX to readable text
  const convertLatexToText = (latex) => {
    return latex
      .replace(/\\frac{([^}]*)}{([^}]*)}/g, '$1/$2')
      .replace(/\\cdot/g, '×')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\sqrt{([^}]*)}/g, '√($1)')
      .replace(/\^{([^}]*)}/g, '^$1')
      .replace(/\\left|\\right/g, '')
      .replace(/\\[a-zA-Z]+/g, '') // Remove other LaTeX commands
      .replace(/[{}]/g, '')        // Remove curly braces
      .replace(/\s+/g, ' ')       // Clean up whitespace
      .trim();
  };

  const handleGetSolution = async () => {
    setLoading(true);
    try {
      const response = await fetch('${baseURL}/solve-steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageBase64: uploadedImage?.split(',')[1]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // No need for LaTeX conversion since the server now sends clean text
      setSolutionSteps(data.steps);
    } catch (error) {
      console.error('Solution steps error:', error);
      alert('Failed to generate solution steps. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 font-['Roboto'] overflow-auto">
      <div className="p-8">
        {/* Header with Title and Controls */}
        <div className="flex justify-between items-start mb-8">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <img 
              src={logo} 
              alt="MEGAT Logo" 
              className="h-40 w-auto object-contain" // Reduced from h-16
            />
            <div className="text-left">
              <h1 className="text-2xl font-semibold text-blue-700">MEGAT AI Math Notes</h1>
              <p className="text-gray-600 text-base">Draw your mathematical expression and let AI solve it</p> 
            </div>
          </div>

          {/* Controls Panel - Right side - Only show in draw mode */}
          {activeTab === 'draw' && (
            <div className="flex flex-col gap-4">
              {/* Drawing Controls */}
              <div className="flex items-center gap-4 bg-white bg-opacity-95 p-3 rounded-lg shadow-md">
                {/* Color Picker */}
                <div className="flex gap-2">
                  {colorSwatches.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        brushColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select ${color} color`}
                    />
                  ))}
                </div>

                {/* Brush Size Picker */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Brush Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushRadius}
                    onChange={(e) => setBrushRadius(parseInt(e.target.value))}
                    className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">{brushRadius}px</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 bg-red-500 text-gray-700 font-semibold rounded-lg shadow-lg hover:bg-red-600 transform hover:scale-105 transition-all duration-200"
                >
                  Clear Canvas
                </button>
                <button
                  onClick={handleCalculate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-gray-700 font-semibold rounded-lg shadow-lg hover:bg-blue-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating...
                    </span>
                  ) : (
                    'Calculate'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('draw')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'draw' 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Draw Expression
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'upload' 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Upload Image
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'draw' ? (
          <div>
            {/* Expression and Result Row */}
            <div className="flex gap-4 mb-8">
              {/* Answer Display - Left side */}
              {answer ? (
                <div className="flex-1 bg-white bg-opacity-95 rounded-lg shadow-lg p-6 transform transition-all duration-300 hover:scale-105">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Result: <span className="text-blue-600">{answer}</span>
                  </h2>
                </div>
              ) : (
                <div className="flex-1 bg-white bg-opacity-95 rounded-lg shadow-lg p-6 opacity-50">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Result...
                  </h2>
                </div>
              )}

              {/* Edit Panel - Right side */}
              <div className="flex-1 bg-white bg-opacity-95 rounded-lg shadow-lg p-4">
                <div className="flex gap-4 items-center">
                  <input
                    type="text"
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you can edit it before sending"
                  />
                  <button
                    onClick={handleSubmitEquation}
                    disabled={loading || !editableText}
                    className="px-4 py-2 bg-green-500 text-gray-700 font-semibold rounded-lg shadow-lg hover:bg-green-600 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Solve
                  </button>
                </div>
                {visionText && (
                  <p className="text-sm text-gray-500 mt-2">
                    Detected expression: {visionText}
                  </p>
                )}
              </div>
            </div>

            {/* Canvas Drawing Area */}
            <div className="w-full h-full mx-auto bg-white bg-opacity-95 rounded-xl shadow-2xl p-4 mb-8 overflow-hidden">
              <div className="w-full h-full" style={{ aspectRatio: '16/9' }}>
                <ReactSketchCanvas
                  ref={canvasRef}
                  strokeWidth={brushRadius}
                  strokeColor={brushColor}
                  canvasColor="white"
                  className="w-full h-full"
                  onChange={handleCanvasChange}
                  exportWithBackgroundImage={true}
                  withTimestamp={false}
                  allowOnlyPointerType="all"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white bg-opacity-95 rounded-xl shadow-2xl p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Step by Step Solution
              </h3>
              <p className="text-gray-600">
                Upload a screenshot of your mathematical expression to get the solution.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {/* Image Upload Section */}
              <div className="flex gap-4 items-center">
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="px-6 py-3 bg-blue-500 text-gray-700 font-semibold rounded-lg shadow-lg hover:bg-blue-600 transition-all"
                >
                  Upload Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {uploadedImage && (
                  <span className="text-green-600">✓ Image uploaded</span>
                )}
              </div>

              {/* Preview and Solution Section */}
              {uploadedImage && (
                <div className="flex gap-6">
                  <div className="w-1/3">
                    <img 
                      src={uploadedImage} 
                      alt="Uploaded expression"
                      className="w-full h-auto rounded-lg shadow-md mb-4"
                    />
                    <button
                      onClick={handleGetSolution}
                      disabled={loading}
                      className="w-full px-6 py-2 bg-gradient-to-r from-emerald-400 to-cyan-400 text-white font-medium rounded-lg shadow-lg hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Generating Solution...' : 'Get Solution'}
                    </button>
                  </div>
                  
                  {/* Solution Display */}
                  <div className="w-2/3">
                    {solutionSteps.length > 0 && (
                      <div className="bg-gray-50 bg-opacity-90 rounded-lg border border-gray-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Solution:</h4>
                        <div className="text-gray-600 leading-relaxed text-left whitespace-pre-wrap">
                          {solutionSteps[0].split(/(?<!\d)(?=\d+\.)/).map((step, index) => {
                            const trimmedStep = step.trim();
                            if (!trimmedStep) return null;
                            
                            return (
                              <div key={index} className="mb-4">
                                {trimmedStep}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

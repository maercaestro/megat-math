import React, { useRef, useState, useEffect } from 'react';
import CanvasDraw from 'react-canvas-draw';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [overlayImage, setOverlayImage] = useState(null);
  const [brushColor, setBrushColor] = useState("#0000FF"); // Changed to blue default
  const [brushRadius, setBrushRadius] = useState(3);
  const colorSwatches = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FF9900", "#9900FF"];
  const [canvasSize, setCanvasSize] = useState({
    width: Math.min(window.innerWidth * 0.9, 1200),
    height: Math.min(window.innerHeight * 0.7, 800)
  });
  const [editableText, setEditableText] = useState('');
  const [visionText, setVisionText] = useState(''); // Add this state for Llama Vision results

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
    canvasRef.current.clear();
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
    setLoading(true);
    try {
      const fullDataUrl = canvasRef.current.getDataURL('png');
      const response = await fetch('/calculate', {
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

  const processVision = async (imageData) => {
    try {
      console.log('Sending image data length:', imageData?.length);

      const response = await fetch('/vision', {
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
      const response = await fetch('/calculate', {
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
    console.log('Canvas changed'); // Debug log
    clearTimeout(window.visionTimeout);
    window.visionTimeout = setTimeout(() => {
      console.log('Processing vision after timeout'); // Debug log
      const imageData = canvasRef.current.getDataURL('png');
      processVision(imageData);
    }, 1000); // Increased delay for LLM processing
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* Header with Title and Controls */}
      <div className="flex justify-between items-start mb-8">
        {/* Logo and Title */}
        <div className="text-left">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">MEGAT AI Math Notes</h1>
          <p className="text-gray-600">Draw your mathematical expression and let AI solve it</p>
        </div>

        {/* Controls Panel - Moved to top right */}
        <div className="flex flex-col gap-4">
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
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

          {/* Drawing Controls */}
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* Color Swatches */}
            <div className="flex gap-2 mb-3">
              {colorSwatches.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    brushColor === color ? 'border-gray-600' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                />
              ))}
            </div>

            {/* Color Picker */}
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-gray-700">Custom:</label>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-6 h-6 cursor-pointer"
              />
            </div>

            {/* Brush Size Slider */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushRadius}
                onChange={(e) => setBrushRadius(parseInt(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-700 w-8">{brushRadius}px</span>
            </div>
          </div>

          {/* Edit Panel - Moved to top */}
          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex gap-4 items-center">
              <input
                type="text"
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Expression will appear here as you draw..."
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
      </div>

      {/* Canvas Drawing Area */}
      <div className="w-full h-full mx-auto bg-white rounded-xl shadow-2xl p-4 mb-8 overflow-hidden">
        <div className="w-full h-full" style={{ aspectRatio: '16/9' }}>
          <CanvasDraw
            ref={canvasRef}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            brushColor={brushColor}
            brushRadius={brushRadius}
            lazyRadius={1}
            className="w-full h-full"
            hideGrid={true}
            onChange={handleCanvasChange}
            immediateLoading={true}
          />
        </div>
      </div>

      {/* Display Calculated Answer */}
      {answer && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 transform transition-all duration-300 hover:scale-105">
          <h2 className="text-3xl font-semibold text-gray-800">
            Result: <span className="text-blue-600">{answer}</span>
          </h2>
        </div>
      )}

      {/* Display Image with Answer Overlay */}
      {overlayImage && (
        <div className="mt-6 bg-white p-4 rounded-xl shadow-lg">
          <img 
            src={overlayImage} 
            alt="Canvas with answer overlay" 
            className="w-full rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

export default App;

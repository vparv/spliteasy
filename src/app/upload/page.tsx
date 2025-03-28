'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import Image from 'next/image';

export default function Upload() {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "environment";
      fileInputRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-950 dark:to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto px-8 py-12 flex flex-col items-center justify-center text-center space-y-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl">
        {/* Page Title */}
        <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
          Upload Receipt
        </h1>
        
        {/* Upload Area */}
        <div className="w-full space-y-6">
          {preview ? (
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden">
              <Image
                src={preview}
                alt="Receipt preview"
                fill
                className="object-cover"
              />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleGalleryClick}
                className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center justify-center space-x-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Add Photo</span>
              </button>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>

        {/* Navigation */}
        <div className="flex space-x-4">
          <Link 
            href="/"
            className="px-6 py-2.5 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-xl transition-all duration-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            Back
          </Link>
          <button 
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!preview}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
} 
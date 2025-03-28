import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 dark:from-gray-950 dark:to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto px-8 py-12 flex flex-col items-center justify-center text-center space-y-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl">
        {/* App name */}
        <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 animate-fade-in font-sans">
          Splitsy
        </h1>
        
        {/* Tagline */}
        <p className="text-xl font-medium tracking-wide text-gray-700 dark:text-gray-200">
          Split the bill at the table
        </p>
        
        {/* Action button */}
        <Link 
          href="/split"
          className="px-10 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-300 font-semibold tracking-wide shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 active:scale-95"
        >
          Start
        </Link>
      </div>
    </div>
  );
}

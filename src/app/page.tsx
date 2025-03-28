import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Split<span className="text-purple-600">Easy</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
          Effortlessly split restaurant bills with friends and family.
          No more awkward calculations!
        </p>

        <Link 
          href="/split"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-purple-600 rounded-full hover:bg-purple-700 transition-colors duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Start Splitting
          <svg 
            className="w-5 h-5 ml-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Quick & Easy</h3>
            <p className="text-gray-600 dark:text-gray-300">Split bills in seconds with our intuitive interface</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Fair Splitting</h3>
            <p className="text-gray-600 dark:text-gray-300">Automatically calculate each person's share</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Share Instantly</h3>
            <p className="text-gray-600 dark:text-gray-300">Send payment details to everyone with one click</p>
          </div>
        </div>
      </main>
    </div>
  );
}

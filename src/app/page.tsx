import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col items-center justify-center">
      <div className="w-full max-w-screen-xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center justify-center">

        
        {/* Main heading and subheading - similar to the reference */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-gray-900 dark:text-white mb-6">
            Find and split <br />
            your restaurant bill
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto font-light">
            Effortlessly split restaurant bills with friends and family.
            No more awkward calculations!
          </p>
        </div>
        
        {/* Action buttons - similar to the reference */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <Link 
            href="/split"
            className="px-8 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-full transition-colors duration-200 text-sm font-medium"
          >
            Start Splitting
          </Link>
          
          <Link 
            href="/about"
            className="px-8 py-3 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full transition-colors duration-200 text-sm font-medium"
          >
            Learn More
          </Link>
          
          <Link 
            href="/help"
            className="px-8 py-3 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full transition-colors duration-200 text-sm font-medium"
          >
            Help
          </Link>
        </div>
      </div>
    </div>
  );
}

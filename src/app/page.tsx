import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/background-app.png"
          alt="Restaurant background"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50"></div>
      </div>
      
      <div className="relative z-30 w-full max-w-screen-xl mx-auto px-6 py-12 md:py-24 flex flex-col items-center justify-center">
        {/* Main heading and subheading */}
        <div className="text-center mb-12 backdrop-blur-sm bg-white/30 dark:bg-black/30 p-8 rounded-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-amber-950 dark:text-amber-50 mb-6">
            Split your <br />
            restaurant bill <br />
            at the table
          </h1>
      
        </div>
        
        {/* Action button */}
        <div className="mb-16">
          <Link 
            href="/split"
            className="px-8 py-3 bg-amber-800 hover:bg-amber-700 text-white rounded-full transition-colors duration-200 text-sm font-medium shadow-lg"
          >
            Start
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * RESPONSIVE DESIGN IMPLEMENTATION EXAMPLES
 * 
 * This file contains example implementations showing how to refactor
 * existing pages to use the new responsive components for mobile/desktop
 * dynamic serving.
 */

// ============================================================================
// Example 1: Course Card with Responsive Image
// ============================================================================
/*
import { ResponsiveImage, LazyImage } from '../components';

function CourseCard({ course }: { course: CourseType }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <ResponsiveImage
        // Mobile: Lower quality, smaller size (~150KB)
        mobileSrc={`${course.imageBase}-mobile.jpg`}
        // Tablet: Medium quality (~300KB)
        tabletSrc={`${course.imageBase}-tablet.jpg`}
        // Desktop: High quality (~600KB)
        desktopSrc={`${course.imageBase}-desktop.jpg`}
        alt={course.title}
        className="w-full h-40 md:h-48 lg:h-56"
        loading="lazy"
        blur
      />
      <div className="p-3 md:p-4 lg:p-5">
        <h3 className="text-sm md:text-base font-bold line-clamp-2 text-gray-900">
          {course.title}
        </h3>
        <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-1">
          {course.level} • {course.duration}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs md:text-sm text-gray-500">
            {course.progress}% Complete
          </div>
          <div className="h-1.5 md:h-2 w-16 md:w-20 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
*/

// ============================================================================
// Example 2: Game Grid with LazyImage
// ============================================================================
/*
import { LazyImage, ResponsiveGrid } from '../components';

function GameGrid({ games }: { games: GameType[] }) {
  return (
    <div className="py-6 md:py-12">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">Featured Games</h2>
      
      <ResponsiveGrid
        mobileColsCount={1}
        tabletColsCount={2}
        desktopColsCount={3}
        lgDesktopColsCount={4}
        gap="gap-4 md:gap-6"
      >
        {games.map(game => (
          <div key={game.id} className="rounded-lg overflow-hidden shadow-md">
            <LazyImage
              src={game.thumbnail}
              alt={game.title}
              className="w-full h-40 md:h-48"
              placeholder={game.placeholderThumbnail}
              blur
            />
            <div className="p-3 md:p-4">
              <h3 className="font-bold text-sm md:text-base">{game.title}</h3>
              <div className="flex items-center mt-2 text-xs md:text-sm text-gray-600">
                <span>⭐ {game.rating}</span>
                <span className="ml-auto">{game.category}</span>
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
}
*/

// ============================================================================
// Example 3: Hero Section with ResponsiveImage
// ============================================================================
/*
import { ResponsiveImage, ShowOn, HideOn } from '../components';
import { useResponsive } from '../hooks/useResponsive';

function HeroSection() {
  const { isMobile } = useResponsive();
  
  return (
    <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] overflow-hidden rounded-xl">
      <ResponsiveImage
        mobileSrc="https://cdn.example.com/hero-mobile-small.jpg"     // Optimized for mobile
        desktopSrc="https://cdn.example.com/hero-desktop-large.jpg"   // High-res for desktop
        lgDesktopSrc="https://cdn.example.com/hero-4k.jpg"            // 4K for large displays
        alt="Hero banner"
        className="w-full h-full"
        objectFit="cover"
        loading="eager"  // Load immediately for hero section
      />
      
      {/* Content overlay - responsive sizing */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 md:mb-4">
            Unlock Your Potential
          </h1>
          
          <ShowOn on="mobile">
            <p className="text-sm text-gray-100 mb-4">
              Learn at your own pace with our adaptive courses designed for neurodiverse learners.
            </p>
          </ShowOn>
          
          <HideOn on="mobile">
            <p className="text-lg text-gray-100 mb-6">
              Discover personalized learning paths designed specifically for neurodiverse minds.
              Progressive, adaptive, and accessible education awaits.
            </p>
          </HideOn>
          
          <button className="px-6 md:px-8 py-2 md:py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-sm md:text-base">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
*/

// ============================================================================
// Example 4: Responsive Navigation with TouchAware
// ============================================================================
/*
import { TouchAware, Container } from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { useState } from 'react';

function NavigationCarousel({ items }: { items: any[] }) {
  const { isMobile } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };
  
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };
  
  return (
    <TouchAware
      onSwipeLeft={goToNext}
      onSwipeRight={goToPrev}
      minDistance={50}
      allowHorizontalSwipe={true}
      className="w-full overflow-hidden"
    >
      <div className="flex transition-transform duration-300" style={{
        transform: `translateX(-${(currentIndex * 100) / (isMobile ? 1 : 3)}%)`
      }}>
        {items.map((item, idx) => (
          <div key={idx} className={`${isMobile ? 'w-full' : 'w-1/3'} flex-shrink-0 px-2`}>
            {/* Item content */}
          </div>
        ))}
      </div>
    </TouchAware>
  );
}
*/

// ============================================================================
// Example 5: Responsive Data Table
// ============================================================================
/*
import { useResponsive, ShowOn, HideOn } from '../components';

function LeaderboardTable({ data }: { data: any[] }) {
  const { isMobile } = useResponsive();
  
  return (
    <div className="w-full overflow-x-auto">
      {isMobile ? (
        // Mobile: Card layout instead of table
        <div className="space-y-3">
          {data.map((row, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">{row.rank}</span>
                <span className="text-sm text-gray-600">{row.points} pts</span>
              </div>
              <h3 className="font-semibold text-gray-900">{row.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{row.category}</p>
            </div>
          ))}
        </div>
      ) : (
        // Desktop: Traditional table
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Points</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{row.rank}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.points}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
*/

// ============================================================================
// Example 6: Bottom Sheet Modal (Mobile Only)
// ============================================================================
/*
import { BottomSheet, ShowOn } from '../components';
import { useState } from 'react';

function FilterModal() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded">
        Open Filters
      </button>
      
      <ShowOn on="mobile">
        <BottomSheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Filter Options"
          height="half"
        >
          {/* Filter options */}
        </BottomSheet>
      </ShowOn>
    </>
  );
}
*/

// ============================================================================
// Export for documentation
// ============================================================================
export const RESPONSIVE_EXAMPLES = {
  CourseCard: 'Example 1',
  GameGrid: 'Example 2',
  HeroSection: 'Example 3',
  NavigationCarousel: 'Example 4',
  LeaderboardTable: 'Example 5',
  FilterModal: 'Example 6',
};

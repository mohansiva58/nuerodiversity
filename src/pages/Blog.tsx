import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Brain, Settings } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  alt: string;
  date: string;
}

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: 'Designing Web Interfaces for Neurodiverse Users',
      excerpt: 'Learn how to create accessible web designs that cater to neurodiverse needs.',
      content:
        'Neurodiverse individuals, including those with autism, ADHD, and dyslexia, benefit from web designs that prioritize clarity and simplicity. Use sans-serif fonts like Arial, avoid auto-playing media, and ensure high contrast. Customizable settings for font size and color schemes can empower users to tailor their experience.',
      category: 'Web Design',
      image: 'https://images.unsplash.com/photo-1516321318423-ffd7737e88a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      alt: 'Person using a laptop with a clean interface',
      date: 'March 10, 2025',
    },
    {
      id: 2,
      title: 'UX Principles for Inclusive Digital Experiences',
      excerpt: 'Explore UX strategies that enhance usability for all cognitive profiles.',
      content:
        'Inclusive UX design considers sensory sensitivities and cognitive processing differences. Minimize visual clutter, provide clear navigation, and offer text-to-speech options. Consistency in layout and predictable interactions reduce cognitive load, benefiting neurodiverse users and beyond.',
      category: 'UX Design',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      alt: 'Designer sketching a user interface',
      date: 'March 12, 2025',
    },
    {
      id: 3,
      title: 'Educational Tools for Neurodiverse Learners',
      excerpt: 'Discover tools and techniques to support neurodiverse students.',
      content:
        'Educational platforms can support neurodiverse learners with visual aids, structured content, and adjustable pacing. Tools like interactive diagrams and audio narration help students with dyslexia or ADHD. Personalization is key—allow users to control their learning environment.',
      category: 'Education',
      image: 'https://images.unsplash.com/photo-1524178232363-64cc13b84123?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80',
      alt: 'Child using a tablet for learning',
      date: 'March 14, 2025',
    },
  ];

  const categories = ['All', 'Web Design', 'UX Design', 'Education'];

  const filteredPosts = blogPosts.filter(
    (post) =>
      (selectedCategory === 'All' || post.category === selectedCategory) &&
      (post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header Section */}
      <header className="py-12 px-6 bg-white border-b border-gray-200">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-extrabold flex items-center gap-3 justify-center md:justify-start text-indigo-600">
              <Brain className="h-10 w-10 animate-pulse" />
              Neurodiversity Insights
            </h1>
            <p className="mt-2 text-lg md:text-xl max-w-lg text-gray-600">
              Exploring design, UX, and education through a neurodiverse lens.
            </p>
          </div>
        </div>
      </header>

      {/* Search and Filter Section */}
      <section className="container mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-1/3 px-5 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 placeholder-gray-400"
          />
          <div className="flex gap-3 flex-wrap justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-indigo-500 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Section */}
      <section className="container mx-auto px-6 py-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-xl shadow-md overflow-hidden transform hover:scale-105 transition-all duration-300 border border-gray-100"
            >
              <img
                src={post.image}
                alt={post.alt}
                className="w-full h-56 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{post.date}</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mt-3 text-gray-900 hover:text-indigo-600 transition-colors duration-200">
                  {post.title}
                </h2>
                <p className="text-gray-600 mt-2">{post.excerpt}</p>
                <details className="mt-4 text-gray-700">
                  <summary className="text-indigo-600 cursor-pointer flex items-center gap-2 font-medium">
                    <BookOpen className="h-5 w-5" />
                    Read More
                  </summary>
                  <p className="mt-3 leading-relaxed">{post.content}</p>
                </details>
              </div>
            </article>
          ))
        ) : (
          <p className="text-center col-span-full text-gray-500 text-lg">
            No posts found matching your criteria.
          </p>
        )}
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-6 py-14 text-center bg-white border border-gray-100 rounded-xl shadow-md mx-4">
        <h3 className="text-3xl font-bold mb-4 text-gray-900">Want to Learn More?</h3>
        <p className="text-lg mb-6 max-w-xl mx-auto text-gray-600">
          Customize your reading experience with our advanced settings.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center px-8 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-md"
        >
          <Settings className="h-5 w-5 mr-2" />
          Customize Settings
        </Link>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

// Updated Footer Component
const Footer = () => (
  <footer className="bg-white text-gray-900 py-8 border-t border-gray-200">
    <div className="container mx-auto px-6 text-center">
      <p className="text-sm text-gray-600">© 2025 NeuroHub. All rights reserved.</p>
      <div className="mt-4 flex justify-center gap-6">
        <Link to="/about" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
          About
        </Link>
        <Link to="/contact" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
          Contact
        </Link>
        <Link to="/privacy" className="text-gray-600 hover:text-indigo-600 transition-colors duration-200">
          Privacy Policy
        </Link>
      </div>
    </div>
  </footer>
);

export default Blog;
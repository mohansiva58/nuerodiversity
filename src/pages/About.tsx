import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Users, BookOpen, MessageSquare, Settings } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header Section */}
      <header className="py-12 px-6 bg-white border-b border-gray-200">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold flex items-center gap-3 justify-center text-indigo-600">
            <Brain className="h-10 w-10 animate-pulse" />
            About NeuroHub
          </h1>
          <p className="mt-2 text-lg md:text-xl max-w-2xl mx-auto text-gray-600">
            Empowering neurodiverse individuals through learning, communication, and self-discovery.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 space-y-20">
        {/* Section 1: Our Mission */}
        <section className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2 order-2 md:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              At NeuroHub, we’re dedicated to creating an inclusive digital space where neurodiverse individuals—whether they have autism, ADHD, dyslexia, or other conditions—can thrive. Our mission is to provide tools and resources that improve daily life, foster personal growth, and celebrate the unique strengths of every mind.
            </p>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
              alt="Group of diverse people collaborating"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>
        </section>

        {/* Section 2: Learning Support */}
        <section className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <img
              src="https://images.unsplash.com/photo-1516321318423-ffd7737e88a7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
              alt="Person using a laptop for learning"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              Learning Support
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We offer tailored educational resources to support neurodiverse learners. From interactive tutorials to customizable learning environments, our tools help individuals with different cognitive styles master new skills at their own pace.
            </p>
          </div>
        </section>

        {/* Section 3: Communication Tools */}
        <section className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2 order-2 md:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-indigo-600" />
              Communication Tools
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Effective communication is key to connection. Our platform provides features like text-to-speech, visual aids, and community forums to help neurodiverse users express themselves and engage with others confidently.
            </p>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
              alt="People communicating online"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>
        </section>

        {/* Section 4: Assessment & Analysis */}
        <section className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2">
            <img
              src="https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
              alt="Person analyzing data on a tablet"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="h-8 w-8 text-indigo-600" />
              Assessment & Analysis
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Understanding your neurodiversity is the first step to empowerment. Our assessment tools analyze cognitive patterns to provide personalized insights, helping users identify their strengths and areas for growth.
            </p>
          </div>
        </section>

        {/* Section 5: Community */}
        <section className="flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/2 order-2 md:order-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-8 w-8 text-indigo-600" />
              Our Community
            </h2>
            <p className="text-gray-700 leading-relaxed">
              NeuroHub is more than a platform—it’s a community. Join others who share your journey, exchange ideas, and find support in a space designed to celebrate neurodiversity in all its forms.
            </p>
          </div>
          <div className="md:w-1/2 order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80"
              alt="Group of people supporting each other"
              className="w-full h-64 md:h-80 object-cover rounded-xl shadow-md"
            />
          </div>
        </section>
      </main>

      {/* Call to Action */}
      <section className="container mx-auto px-6 py-14 text-center bg-white border border-gray-100 rounded-xl shadow-md mx-4">
        <h3 className="text-3xl font-bold mb-4 text-gray-900">Join Us Today</h3>
        <p className="text-lg mb-6 max-w-xl mx-auto text-gray-600">
          Discover how NeuroHub can support your unique journey. Customize your experience and connect with our community.
        </p>
        <Link
          to="/settings"
          className="inline-flex items-center px-8 py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-md"
        >
          <Settings className="h-5 w-5 mr-2" />
          Get Started
        </Link>
      </section>

      {/* Footer */}
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
    </div>
  );
};

export default About;
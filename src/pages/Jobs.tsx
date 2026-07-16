
import React from 'react';
import { motion } from 'framer-motion';
import { Building, Search, Filter } from 'lucide-react';

const Jobs = () => {
  const jobs = [
    {
      title: "Software Developer",
      company: "TechCo",
      location: "Remote",
      type: "Full-time",
      description: "Looking for a neurodivergent-friendly workplace? Join our inclusive development team."
    },
    {
      title: "Data Analyst",
      company: "DataCorp",
      location: "Hybrid",
      type: "Full-time",
      description: "We value different perspectives and thinking styles in our analytics team."
    },
    {
      title: "UX Designer",
      company: "DesignHub",
      location: "Remote",
      type: "Contract",
      description: "Create accessible designs in an environment that celebrates neurodiversity."
    }
  ];

  return (
    <div className="space-y-8">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold text-indigo-600 mb-4">Career Opportunities</h1>
        <p className="text-xl text-gray-600">Find neurodiversity-friendly job opportunities</p>
      </section>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Filter className="h-5 w-5" />
            Filters
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {jobs.map((job, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                <div className="flex items-center gap-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{job.company}</span>
                  <span>•</span>
                  <span>{job.location}</span>
                  <span>•</span>
                  <span>{job.type}</span>
                </div>
              </div>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                Apply Now
              </button>
            </div>
            <p className="text-gray-600">{job.description}</p>
          </motion.div>
        ))}
      </div>

      <section className="bg-indigo-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Career Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Resume Builder</h3>
            <p className="text-gray-600">Create a professional resume highlighting your unique strengths</p>
            <button className="mt-4 text-indigo-600 font-semibold">Get Started →</button>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Interview Prep</h3>
            <p className="text-gray-600">Practice interviews with AI-powered feedback</p>
            <button className="mt-4 text-indigo-600 font-semibold">Practice Now →</button>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="font-semibold mb-2">Career Coaching</h3>
            <p className="text-gray-600">Get personalized guidance from experienced mentors</p>
            <button className="mt-4 text-indigo-600 font-semibold">Book Session →</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Jobs;
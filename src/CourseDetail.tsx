// CourseDetail.js
import React from 'react';
import { useParams } from 'react-router-dom';

const CourseDetail = () => {
  const { courseId } = useParams();

  // For demonstration, we'll use a static list of courses.
  // In a real application, you might fetch course details from an API.
  const allCourses = [
    { id: '1', title: "Understanding ADHD", level: "Beginner", duration: "2 hours", type: "Cognitive", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=1200" },
    { id: '2', title: "Dyslexia Strategies", level: "Intermediate", duration: "3 hours", type: "Reading", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1200" },
    // Add other courses with unique IDs
  ];

  const course = allCourses.find(course => course.id === courseId);

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
      <img src={course.image} alt={course.title} className="w-full h-64 object-cover rounded-lg mb-4" />
      <p><strong>Level:</strong> {course.level}</p>
      <p><strong>Duration:</strong> {course.duration}</p>
      <p><strong>Type:</strong> {course.type}</p>
      {/* Add more course details as needed */}
    </div>
  );
};

export default CourseDetail;

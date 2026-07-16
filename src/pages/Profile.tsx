import { motion } from 'framer-motion';
import { User, Mail, Calendar, Award, BookOpen, Activity } from 'lucide-react';

const Profile = () => {
  const achievements = [
    {
      title: "Learning Streak",
      description: "Completed 7 days of continuous learning",
      date: "2024-03-15"
    },
    {
      title: "Quiz Master",
      description: "Scored 100% in cognitive training",
      date: "2024-03-10"
    },
    {
      title: "Community Helper",
      description: "Helped 10 community members",
      date: "2024-03-05"
    }
  ];

  const activities = [
    {
      type: "Course",
      title: "Understanding ADHD",
      progress: 75,
      date: "2024-03-15"
    },
    {
      type: "Quiz",
      title: "Memory Training",
      progress: 100,
      date: "2024-03-14"
    },
    {
      type: "Reading",
      title: "Dyslexia Strategies",
      progress: 50,
      date: "2024-03-13"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">John Doe</h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-1" />
                john.doe@example.com
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Joined March 2024
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2 text-gray-600" />
            Achievements
          </h2>
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <h3 className="font-medium text-gray-800">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
                <p className="text-xs text-gray-500 mt-1">{achievement.date}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-gray-600" />
            Recent Activity
          </h2>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-gray-800">{activity.title}</h3>
                    <p className="text-sm text-gray-600">{activity.type}</p>
                  </div>
                  <span className="text-sm text-gray-500">{activity.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-full bg-gray-600 rounded-full"
                    style={{ width: `${activity.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <BookOpen className="h-5 w-5 mr-2 text-gray-600" />
          Learning Path
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Current Focus</h3>
              <p className="text-sm text-gray-600">ADHD Management Techniques</p>
            </div>
            <button className="btn-soft">Continue Learning</button>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full">
            <div className="h-full bg-gray-600 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
import React from "react";

const articles = [
  {
    title: "Understanding Neurodiversity",
    description:
      "An overview of neurodiversity and how it embraces different cognitive styles.",
    img: "https://source.unsplash.com/500x300/?brain,neuroscience",
    link: "#",
  },
  {
    title: "Autism and Supportive Strategies",
    description:
      "How to create an inclusive environment for individuals with autism.",
    img: "https://source.unsplash.com/500x300/?autism,support",
    link: "#",
  },
  {
    title: "ADHD: Myths and Facts",
    description:
      "Debunking common myths and providing factual insights about ADHD.",
    img: "https://source.unsplash.com/500x300/?focus,adhd",
    link: "#",
  },
  {
    title: "Dyslexia: Early Detection & Intervention",
    description:
      "The importance of early diagnosis and effective learning techniques for dyslexia.",
    img: "https://source.unsplash.com/500x300/?reading,learning",
    link: "#",
  },
  {
    title: "Can Neurodivergence be Cured?",
    description:
      "Exploring the scientific perspective on whether neurodivergent conditions can or should be 'cured.'",
    img: "https://source.unsplash.com/500x300/?research,science",
    link: "#",
  },
];

const Articles: React.FC = () => {
  return (
    <div className="min-h-screen p-6 bg-white text-gray-900">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold">Neurodiversity Articles</h1>
      </div>

      {/* Articles List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((article, index) => (
          <div key={index} className="bg-gray-100 p-5 rounded-lg shadow-lg">
            <img
              src={article.img}
              alt={article.title}
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
            <h2 className="text-2xl font-semibold">{article.title}</h2>
            <p className="text-lg mt-2">{article.description}</p>
            <a
              href={article.link}
              className="block mt-4 text-blue-500 hover:underline"
            >
              Read More →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Articles;

/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpeechText } from '../components/speach';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { Clock, Calendar, CheckCircle, PlayCircle, Search, X, BookOpen, Video, Lightbulb, ExternalLink  } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface Course {
  title: string;
  description: string;
  status: "Completed" | "Upcoming" | "Watching";
  duration: string;
  progress?: string;
  category: string;
  docs: CourseDoc[];
}

interface CourseDoc {
  type: "Article" | "Video" | "Tip";
  title: string;
  description: string;
  link?: string;
  youtubeId?: string;
}

interface Event {
  type: "Webinar" | "Lesson" | "Task";
  title: string;
  description: string;
  date: string;
  time?: string;
}

interface Resource {
  title: string;
  type: "Article" | "Video" | "Tip";
  link?: string;
  youtubeId?: string;
  description: string;
}

type CacheSource = 'init' | 'local' | 'redis' | 'firebase' | 'default';

const learningLoadInFlight = new Map<string, Promise<void>>();
const LEARNING_LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LEARNING_LAST_CACHE_KEY = 'learning_cache_current';

const learningPlan: Course[] = [
  {
    title: "ADHD Fundamentals",
    description: "Explore the basics of ADHD and strategies for managing attention and focus.",
    status: "Completed",
    duration: "00:45",
    category: "Cognitive",
    docs: [
      { type: "Article", title: "What is ADHD?", description: "A comprehensive guide to understanding ADHD symptoms and diagnosis.", link: "https://pubmed.ncbi.nlm.nih.gov/37974470/" },
      { type: "Video", title: "ADHD Explained", description: "Clear overview of ADHD for students and educators.", youtubeId: "hFL6qRIJZ_Y" },
      { type: "Tip", title: "Focus Technique", description: "Use the Pomodoro method: 25 min work, 5 min break — ideal for ADHD brains." },
    ],
  },
  {
    title: "Time Management for ADHD",
    description: "Learn practical techniques to organize tasks and manage time effectively with ADHD.",
    status: "Watching",
    duration: "00:40",
    progress: "00:20",
    category: "Cognitive",
    docs: [
      { type: "Article", title: "ADHD Time Management Tips", description: "Practical strategies to stay on track and beat time blindness.", link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5852175/?utm_source=perplexity" },
      { type: "Video", title: "ADHD & Time Blindness", description: "Why people with ADHD struggle with time and what to do about it.", youtubeId: "aOqxI81D7Zo" },
      { type: "Tip", title: "Visual Timers", description: "Use analog clocks or visual timer apps so time feels concrete, not abstract." },
    ],
  },
  {
    title: "ADHD and Emotional Regulation",
    description: "Understand emotional challenges with ADHD and develop coping skills.",
    status: "Upcoming",
    duration: "00:35",
    category: "Mental Health",
    docs: [
      { type: "Article", title: "Emotional Dysregulation in ADHD", description: "How ADHD affects emotional control and what helps.", link: "https://www.additudemag.com/emotional-dysregulation-adhd/" },
      { type: "Video", title: "ADHD Emotions Explained", description: "Short video on managing emotional intensity with ADHD.", youtubeId: "6mtGXqX3Dlk" },
      { type: "Tip", title: "Name It to Tame It", description: "Label your emotion out loud to activate the prefrontal cortex and reduce reactivity." },
    ],
  },
  {
    title: "Dyslexia Reading Strategies",
    description: "Master techniques to improve reading fluency and comprehension.",
    status: "Completed",
    duration: "00:50",
    category: "Reading",
    docs: [
      { type: "Article", title: "Dyslexia Reading Tools", description: "Evidence-based strategies to support reading with dyslexia.", link: "https://www.understood.org/articles/dyslexia-strategies" },
      { type: "Video", title: "How Dyslexia Works", description: "Animated explanation of dyslexia and how to support readers.", youtubeId: "dCnxl2Mf4XL6qcDH" },
      { type: "Tip", title: "Use Colored Overlays", description: "Tinted reading overlays can reduce visual stress and improve tracking for many dyslexic readers." },
    ],
  },
  {
    title: "Autism and Social Communication",
    description: "Build skills for effective social interaction and understanding cues.",
    status: "Upcoming",
    duration: "00:30",
    category: "Social",
    docs: [
      { type: "Article", title: "Autism Social Communication", description: "Research-backed strategies for social skill development.", link: "https://www.autism.org.uk/advice-and-guidance/topics/communication" },
      { type: "Video", title: "Social Skills & Autism", description: "Practical advice for navigating social situations with autism.", youtubeId: "A1AUdaH-EPM" },
      { type: "Tip", title: "Scripts & Rehearsal", description: "Practice common social scripts in advance — it reduces cognitive load in live situations." },
    ],
  },
  {
    title: "Motor Skills Development",
    description: "Enhance coordination and fine motor skills through targeted exercises.",
    status: "Watching",
    duration: "00:25",
    progress: "00:15",
    category: "Motor Skills",
    docs: [
      { type: "Article", title: "Dyspraxia & Motor Skills", description: "Understanding motor coordination difficulties and how to support them.", link: "https://www.dyspraxiafoundation.org.uk/about-dyspraxia/" },
      { type: "Video", title: "Fine Motor Exercises", description: "Simple daily exercises to build fine motor control.", youtubeId: "UW8kDHRs-_8" },
      { type: "Tip", title: "OT Activities at Home", description: "Playdough, threading beads, and cutting with scissors are excellent fine motor builders." },
    ],
  },
  {
    title: "Understanding Dyscalculia",
    description: "Learn about math-related challenges and strategies to overcome them.",
    status: "Upcoming",
    duration: "00:40",
    category: "Mathematics",
    docs: [
      { type: "Article", title: "What is Dyscalculia?", description: "Signs, causes and support strategies for dyscalculia.", link: "https://www.understood.org/articles/what-is-dyscalculia" },
      { type: "Video", title: "Dyscalculia Explained", description: "Clear guide to understanding math learning differences.", youtubeId: "p53wTyxUUys" },
      { type: "Tip", title: "Use Manipulatives", description: "Physical objects like counters and number lines make abstract math concepts tangible." },
    ],
  },
  {
    title: "OCD Coping Mechanisms",
    description: "Develop tools to manage obsessive-compulsive behaviors effectively.",
    status: "Completed",
    duration: "00:35",
    category: "Psychological",
    docs: [
      { type: "Article", title: "OCD Coping Strategies", description: "Evidence-based techniques for managing OCD symptoms.", link: "https://iocdf.org/about-ocd/treatment/" },
      { type: "Video", title: "OCD & ERP Therapy", description: "How exposure and response prevention works for OCD.", youtubeId: "aX7jnVXXG5o" },
      { type: "Tip", title: "Delay the Compulsion", description: "Try delaying a compulsion by 5 minutes — gradually extending the delay reduces its power." },
    ],
  },
  {
    title: "Bipolar Disorder Basics",
    description: "Gain insights into bipolar disorder and mood management techniques.",
    status: "Upcoming",
    duration: "00:45",
    category: "Mental Health",
    docs: [
      { type: "Article", title: "Bipolar Disorder Overview", description: "Symptoms, types and management of bipolar disorder.", link: "https://www.nami.org/About-Mental-Illness/Mental-Health-Conditions/Bipolar-Disorder" },
      { type: "Video", title: "Bipolar Disorder Explained", description: "Animated video covering mood episodes and treatment.", youtubeId: "RrWBhVlD1H8" },
      { type: "Tip", title: "Mood Tracking", description: "A daily mood journal helps identify triggers and patterns before episodes escalate." },
    ],
  },
  {
    title: "Sensory Processing Skills",
    description: "Explore sensory sensitivities and ways to adapt daily routines.",
    status: "Watching",
    duration: "00:30",
    progress: "00:10",
    category: "Perception",
    docs: [
      { type: "Article", title: "Sensory Processing Disorder", description: "What SPD is and how to create sensory-friendly environments.", link: "https://www.spdstar.org/basic/understanding-sensory-processing-disorder" },
      { type: "Video", title: "Sensory Sensitivities & Autism", description: "How sensory processing affects daily life and learning.", youtubeId: "1AoNiGCvGzc" },
      { type: "Tip", title: "Sensory Diet", description: "A scheduled set of sensory activities throughout the day helps regulate the nervous system." },
    ],
  },
  {
    title: "Down Syndrome Learning Strategies",
    description: "Discover tailored approaches to support learning with Down Syndrome.",
    status: "Upcoming",
    duration: "00:50",
    category: "Genetic",
    docs: [
      { type: "Article", title: "Teaching Students with Down Syndrome", description: "Effective strategies for educators and families.", link: "https://www.ndss.org/resources/learning-development/" },
      { type: "Video", title: "Down Syndrome Learning", description: "Classroom inclusion strategies and learning tips.", youtubeId: "W-0XDQN1OTk" },
      { type: "Tip", title: "Visual Schedules", description: "Pictorial daily routines provide structure and reduce anxiety for learners with Down Syndrome." },
    ],
  },
  {
    title: "Anatomy and Physiology",
    description: "Understand the structure and function of the human body.",
    status: "Completed",
    duration: "00:30",
    category: "Reading",
    docs: [
      { type: "Article", title: "Anatomy Basics", description: "Introduction to body systems, organs, and their functions.", link: "https://www.khanacademy.org/science/health-and-medicine/human-anatomy-and-physiology" },
      { type: "Video", title: "Human Body Systems", description: "Khan Academy overview of all major body systems.", youtubeId: "Ae4MadKPJhg" },
      { type: "Tip", title: "Mnemonics Work", description: "Memory aids like acronyms drastically improve recall of anatomical terms." },
    ],
  },
  {
    title: "Pharmacology Basics",
    description: "Learn basic medical language for effective communication.",
    status: "Watching",
    duration: "00:30",
    progress: "00:30",
    category: "Social",
    docs: [
      { type: "Article", title: "Pharmacology Fundamentals", description: "Drug classes, mechanisms, and pharmacokinetics explained.", link: "https://www.khanacademy.org/science/health-and-medicine/pharmacology" },
      { type: "Video", title: "Pharmacology Made Easy", description: "Clear introduction to how drugs work in the body.", youtubeId: "OY-BNzSL8ik" },
      { type: "Tip", title: "Group by Drug Class", description: "Learn drugs in families — once you know one SSRI, the pattern applies to all." },
    ],
  },
  {
    title: "Medical Ethics and Professionalism",
    description: "Understand ethical principles and professionalism in healthcare.",
    status: "Upcoming",
    duration: "00:30",
    category: "Neurological",
    docs: [
      { type: "Article", title: "Principles of Medical Ethics", description: "The four pillars: autonomy, beneficence, non-maleficence, justice.", link: "https://www.bma.org.uk/advice-and-support/ethics/ethics-a-to-z/medical-ethics-today" },
      { type: "Video", title: "Medical Ethics Overview", description: "Core ethical concepts every healthcare professional should know.", youtubeId: "7tv0TzNIH5Q" },
      { type: "Tip", title: "Use the 4-Box Model", description: "Apply medical indications, patient preferences, quality of life, and contextual features to any ethical case." },
    ],
  },
  {
    title: "Disease Pathophysiology",
    description: "Study the cellular and molecular basis of common diseases.",
    status: "Upcoming",
    duration: "00:30",
    category: "Motor Skills",
    docs: [
      { type: "Article", title: "Pathophysiology Basics", description: "How disease disrupts normal physiology at the cellular level.", link: "https://www.ncbi.nlm.nih.gov/books/NBK279409/" },
      { type: "Video", title: "Disease Mechanisms", description: "Osmosis video series on how common diseases develop.", youtubeId: "KJD0E8FLDKY" },
      { type: "Tip", title: "Mechanism First", description: "Always learn the WHY behind a disease before memorising its signs — it sticks far better." },
    ],
  },
];

const events: Event[] = [
  { type: "Webinar", title: "Understanding medical research, critical appraisal skills, and applying evidence-based guidelines in practice", description: "", date: "Tu, 25.03", time: "12:30" },
  { type: "Lesson", title: "Overview of healthcare delivery systems, health policy, and their impact on patient care.", description: "", date: "We, 26.03" },
  { type: "Task", title: "Examination of major global health issues, including infectious diseases, non-communicable diseases, and healthcare disparities.", description: "", date: "Th, 27.03" },
  { type: "Task", title: "Importance of teamwork and communication among healthcare professionals for optimal patient outcomes.", description: "", date: "Fr, 28.03" },
];

const categoryContent: Record<string, { description: string; resources: Resource[] }> = {
  "All": {
    description: "Explore a wide range of neurodiversity topics covering cognitive, social, motor skills, and more.",
    resources: [
      { title: "What is Neurodiversity?", type: "Article", link: "https://www.neurodiversityhub.org/what-is-neurodiversity", description: "An overview of neurodiversity and its importance in education and society." },
      { title: "Neurodiversity Explained", type: "Video", youtubeId: "jKB2ulrHh0s", description: "A concise video breaking down the concept of neurodiversity." },
      { title: "Inclusive Learning Tip", type: "Tip", description: "Adapt lessons to individual strengths for better engagement and understanding." },
    ],
  },
  "Cognitive": {
    description: "Learn about cognitive conditions like ADHD that affect attention, focus, and executive functioning.",
    resources: [
      { title: "ADHD Coping Strategies", type: "Article", link: "https://www.additudemag.com/adhd-coping-skills/", description: "Practical tips for managing ADHD symptoms in daily life." },
      { title: "ADHD Basics", type: "Video", youtubeId: "hFL6qRIJZ_Y", description: "Understand the fundamentals of ADHD and its impact on learning." },
      { title: "Focus Techniques", type: "Tip", description: "Use timers and breaks to maintain concentration during tasks." },
    ],
  },
  "Mental Health": {
    description: "Resources covering emotional regulation, mood disorders, and mental wellness strategies.",
    resources: [
      { title: "Mental Health in Learning", type: "Article", link: "https://www.mentalhealth.org.uk/explore-mental-health/a-z-topics/children-and-young-people", description: "How mental health affects learning and development." },
      { title: "Emotional Regulation Techniques", type: "Video", youtubeId: "6mtGXqX3Dlk", description: "Practical video on managing emotions effectively." },
      { title: "Mindfulness Tip", type: "Tip", description: "Even 5 minutes of mindful breathing daily can significantly reduce anxiety." },
    ],
  },
  "Reading": {
    description: "Strategies for improving reading skills, comprehension, and fluency.",
    resources: [
      { title: "Reading Strategies for Dyslexia", type: "Article", link: "https://www.understood.org/articles/dyslexia-strategies", description: "Evidence-based approaches to improve reading." },
      { title: "How Dyslexia Works", type: "Video", youtubeId: "zafiGBrFkRM", description: "Animated explanation of reading difficulties." },
      { title: "Read Aloud Tip", type: "Tip", description: "Reading aloud activates more brain regions and significantly boosts comprehension." },
    ],
  },
  "Social": {
    description: "Building social communication skills and navigating interpersonal interactions.",
    resources: [
      { title: "Social Skills for Autism", type: "Article", link: "https://www.autism.org.uk/advice-and-guidance/topics/communication", description: "Research-backed social communication strategies." },
      { title: "Social Skills Training", type: "Video", youtubeId: "A1AUdaH-EPM", description: "Practical approaches to social skill development." },
      { title: "Role-play Tip", type: "Tip", description: "Role-playing social scenarios builds confidence before real-world interactions." },
    ],
  },
  "Motor Skills": {
    description: "Developing fine and gross motor coordination through targeted practice.",
    resources: [
      { title: "Motor Skills Development", type: "Article", link: "https://www.dyspraxiafoundation.org.uk/about-dyspraxia/", description: "Understanding and supporting motor coordination difficulties." },
      { title: "Fine Motor Exercises", type: "Video", youtubeId: "UW8kDHRs-_8", description: "Daily exercises to build motor control." },
      { title: "Practice Tip", type: "Tip", description: "Short daily practice sessions are more effective than infrequent long ones." },
    ],
  },
  "Mathematics": {
    description: "Overcoming math learning challenges with concrete strategies and tools.",
    resources: [
      { title: "Dyscalculia Support", type: "Article", link: "https://www.understood.org/articles/what-is-dyscalculia", description: "Signs and support for math learning differences." },
      { title: "Dyscalculia Explained", type: "Video", youtubeId: "p53wTyxUUys", description: "Understanding math learning challenges." },
      { title: "Concrete to Abstract", type: "Tip", description: "Always start with physical objects before moving to abstract number symbols." },
    ],
  },
  "Psychological": {
    description: "Managing psychological conditions and building healthy coping strategies.",
    resources: [
      { title: "OCD Treatment Overview", type: "Article", link: "https://iocdf.org/about-ocd/treatment/", description: "Evidence-based treatment approaches for OCD." },
      { title: "OCD & ERP Therapy", type: "Video", youtubeId: "aX7jnVXXG5o", description: "How exposure therapy works for OCD." },
      { title: "Habit Reversal Tip", type: "Tip", description: "Replacing compulsions with competing responses is a core skill in behaviour therapy." },
    ],
  },
  "Perception": {
    description: "Understanding sensory processing and creating supportive sensory environments.",
    resources: [
      { title: "Sensory Processing Disorder", type: "Article", link: "https://www.spdstar.org/basic/understanding-sensory-processing-disorder", description: "What SPD is and how to manage it." },
      { title: "Sensory Sensitivities", type: "Video", youtubeId: "1AoNiGCvGzc", description: "How sensory processing affects daily life." },
      { title: "Environment Tip", type: "Tip", description: "Small changes like dimmer lights and noise-cancelling headphones can transform a learning space." },
    ],
  },
  "Genetic": {
    description: "Tailored learning strategies for genetic conditions affecting development.",
    resources: [
      { title: "Down Syndrome Learning", type: "Article", link: "https://www.ndss.org/resources/learning-development/", description: "Educational strategies for Down Syndrome." },
      { title: "Inclusive Education", type: "Video", youtubeId: "W-0XDQN1OTk", description: "Classroom strategies for inclusive learning." },
      { title: "Strength-Based Tip", type: "Tip", description: "Focus on what learners can do — strength-based approaches build confidence and ability." },
    ],
  },
  "Neurological": {
    description: "Understanding neurological conditions and their impact on learning and behaviour.",
    resources: [
      { title: "Medical Ethics in Practice", type: "Article", link: "https://www.bma.org.uk/advice-and-support/ethics/ethics-a-to-z/medical-ethics-today", description: "Ethical principles in healthcare education." },
      { title: "Ethics Overview", type: "Video", youtubeId: "7tv0TzNIH5Q", description: "Core ethical concepts for healthcare professionals." },
      { title: "Case-Based Learning Tip", type: "Tip", description: "Applying ethics to real cases deepens understanding far more than theory alone." },
    ],
  },
};

const Learning: React.FC = () => {
  const { user } = useAuth();
  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001').replace(/\/$/, '');
  const db = getFirestore();
  const location = useLocation();
  const [completion, setCompletion] = useState<{ [key: string]: number }>({});
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cacheSource, setCacheSource] = useState<CacheSource>('init');

  const parseLearningCache = useCallback((raw: string | null) => {
    try {
      if (!raw) return null;
      const parsed = JSON.parse(raw) as any;
      if (!parsed) return null;
      const normalized = parsed.data
        ? { enrolled: parsed.data.enrolled || [], completion: parsed.data.completion || {}, predictedCategory: parsed.data.predictedCategory || 'All' }
        : { enrolled: parsed.enrolled || [], completion: parsed.completion || {}, predictedCategory: parsed.predictedCategory || 'All' };
      if (parsed.savedAt && Date.now() - parsed.savedAt > LEARNING_LOCAL_CACHE_TTL_MS) return null;
      return normalized;
    } catch { return null; }
  }, []);

  const readLearningCache = useCallback((userId: string) => {
    return parseLearningCache(localStorage.getItem(`learning_cache_${userId}`));
  }, [parseLearningCache]);

  const readLastLearningCache = useCallback(() => {
    return parseLearningCache(localStorage.getItem(LEARNING_LAST_CACHE_KEY));
  }, [parseLearningCache]);

  const writeLearningCache = useCallback((userId: string, data: { enrolled: string[]; completion: { [key: string]: number }; predictedCategory: string }) => {
    try {
      const payload = JSON.stringify({ savedAt: Date.now(), data });
      localStorage.setItem(`learning_cache_${userId}`, payload);
      localStorage.setItem(LEARNING_LAST_CACHE_KEY, payload);
    } catch { }
  }, []);

  useEffect(() => {
    if (cacheSource !== 'init') return;
    const cached = readLastLearningCache();
    if (!cached) return;
    setEnrolledCourses(new Set(cached.enrolled || []));
    setCompletion(cached.completion || {});
    setSelectedCategory(cached.predictedCategory || 'All');
    setCacheSource('local');
    setIsLoading(false);
  }, [cacheSource, readLastLearningCache]);

  const fetchWithTimeout = useCallback(async (url: string, options: RequestInit = {}, timeoutMs = 1500) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const localCache = readLearningCache(user.uid);
          if (localCache) {
            setEnrolledCourses(new Set(localCache.enrolled || []));
            setCompletion(localCache.completion || {});
            const predictedCategoryFromState = (location.state as { predictedCategory?: string })?.predictedCategory;
            setSelectedCategory(predictedCategoryFromState || localCache.predictedCategory || "All");
            setCacheSource('local');
            setIsLoading(false);
            return;
          }

          try {
            const cacheResponse = await fetchWithTimeout(`${backendBaseUrl}/api/user-data/${user.uid}`);
            if (cacheResponse.ok) {
              const cacheResult = await cacheResponse.json();
              if (cacheResult.data) {
                const { enrolled, completion, predictedCategory } = cacheResult.data;
                setEnrolledCourses(new Set(enrolled || []));
                setCompletion(completion || {});
                const predictedCategoryFromState = (location.state as { predictedCategory?: string })?.predictedCategory;
                const finalPredictedCategory = predictedCategoryFromState || predictedCategory || "All";
                setSelectedCategory(finalPredictedCategory);
                writeLearningCache(user.uid, { enrolled: enrolled || [], completion: completion || {}, predictedCategory: finalPredictedCategory });
                setCacheSource('redis');
                setIsLoading(false);
                return;
              }
            }
          } catch { }

          setIsLoading(false);
          setCacheSource('firebase');

          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          let enrolledFromFirebase: string[] = [];
          let completionFromFirebase: { [key: string]: number } = {};
          let predictedCategoryFromFirebase = "All";

          if (userDoc.exists()) {
            const data = userDoc.data();
            enrolledFromFirebase = data.enrolled || [];
            completionFromFirebase = data.completion || {};
            predictedCategoryFromFirebase = data.predictedCategory || "All";
          }

          setEnrolledCourses(new Set(enrolledFromFirebase));
          setCompletion(completionFromFirebase);
          const predictedCategoryFromState = (location.state as { predictedCategory?: string })?.predictedCategory;
          const finalPredictedCategory = predictedCategoryFromState || predictedCategoryFromFirebase;
          setSelectedCategory(finalPredictedCategory);
          writeLearningCache(user.uid, { enrolled: enrolledFromFirebase, completion: completionFromFirebase, predictedCategory: finalPredictedCategory });

          fetch(`${backendBaseUrl}/api/user-data/${user.uid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enrolled: enrolledFromFirebase, completion: completionFromFirebase, predictedCategory: finalPredictedCategory })
          }).catch(() => null);

          if (finalPredictedCategory !== "All") {
            const recommendedCourse = learningPlan.find(course => course.category === finalPredictedCategory);
            if (recommendedCourse && !enrolledFromFirebase.includes(recommendedCourse.title)) {
              const newEnrolled = new Set([...enrolledFromFirebase, recommendedCourse.title]);
              setEnrolledCourses(newEnrolled);
              const newCompletion = { ...completionFromFirebase, [recommendedCourse.title]: 0 };
              setCompletion(newCompletion);
              await setDoc(userDocRef, { enrolled: Array.from(newEnrolled), completion: newCompletion }, { merge: true });
              writeLearningCache(user.uid, { enrolled: Array.from(newEnrolled), completion: newCompletion, predictedCategory: finalPredictedCategory });
              fetch(`${backendBaseUrl}/api/user-data/${user.uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enrolled: Array.from(newEnrolled), completion: newCompletion, predictedCategory: finalPredictedCategory })
              }).catch(() => null);
            }
          }
        } catch (error) {
          const code = (error as { code?: string })?.code || '';
          const message = (error as { message?: string })?.message || '';
          const isOffline = code.includes('unavailable') || code.includes('offline') || message.toLowerCase().includes('offline');
          if (!isOffline) console.error("Error fetching user data:", error);
          setSelectedCategory("All");
          setCacheSource('default');
        } finally {
          setIsLoading(false);
        }
      } else {
        setCacheSource('default');
        setIsLoading(false);
      }
    };

    if (!user) { setIsLoading(false); return; }
    const existingLoad = learningLoadInFlight.get(user.uid);
    if (existingLoad) return;
    const loadPromise = fetchUserData().finally(() => { learningLoadInFlight.delete(user.uid); });
    learningLoadInFlight.set(user.uid, loadPromise);
  }, [user, db, location.state, backendBaseUrl, fetchWithTimeout, readLearningCache, writeLearningCache]);

  const updateUserData = async (newEnrolled: Set<string>, newCompletion: { [key: string]: number }) => {
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { enrolled: Array.from(newEnrolled), completion: newCompletion }, { merge: true });
        writeLearningCache(user.uid, { enrolled: Array.from(newEnrolled), completion: newCompletion, predictedCategory: selectedCategory });
        fetch(`${backendBaseUrl}/api/user-data/${user.uid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrolled: Array.from(newEnrolled), completion: newCompletion, predictedCategory: selectedCategory })
        }).catch(() => null);
      } catch (error) {
        console.error("Error updating user data:", error);
      }
    }
  };

  const handleEnroll = async (courseTitle: string) => {
    const newEnrolled = new Set(enrolledCourses);
    const newCompletion = { ...completion };
    if (newEnrolled.has(courseTitle)) {
      newEnrolled.delete(courseTitle);
      delete newCompletion[courseTitle];
    } else {
      newEnrolled.add(courseTitle);
      newCompletion[courseTitle] = 0;
    }
    setEnrolledCourses(newEnrolled);
    setCompletion(newCompletion);
    await updateUserData(newEnrolled, newCompletion);
  };

  const openPopup = (youtubeId: string) => {
    setVideoUrl(`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setVideoUrl(null);
  };

  const filteredCourses = learningPlan.filter(course =>
    (selectedCategory === "All" || course.category === selectedCategory) &&
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const docTypeIcon = (type: "Article" | "Video" | "Tip") => {
    if (type === "Article") return <BookOpen className="h-4 w-4" />;
    if (type === "Video") return <Video className="h-4 w-4" />;
    return <Lightbulb className="h-4 w-4" />;
  };

  const docTypeBg = (type: "Article" | "Video" | "Tip") => {
    if (type === "Article") return "bg-green-50 border-green-100";
    if (type === "Video") return "bg-blue-50 border-blue-100";
    return "bg-yellow-50 border-yellow-100";
  };

  const docTypeColor = (type: "Article" | "Video" | "Tip") => {
    if (type === "Article") return "text-green-700";
    if (type === "Video") return "text-blue-700";
    return "text-yellow-700";
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.02, boxShadow: "0 10px 20px rgba(0,0,0,0.1)", transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const relatedContentVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto", transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, height: 0, transition: { duration: 0.3, ease: "easeIn" } },
  };

  const popupVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: "easeIn" } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.3, ease: "easeInOut" } },
    tap: { scale: 0.95, transition: { duration: 0.2 } },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const searchBarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1, transition: { duration: 1, ease: "easeInOut", delay: 0.5 } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SpeechText>Loading...</SpeechText>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        <div className="mb-4 flex justify-end">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            cacheSource === 'local' ? 'bg-green-100 text-green-700 border-green-300'
            : cacheSource === 'redis' ? 'bg-blue-100 text-blue-700 border-blue-300'
            : cacheSource === 'firebase' ? 'bg-amber-100 text-amber-700 border-amber-300'
            : 'bg-gray-100 text-gray-700 border-gray-300'
          }`}>
            source: {cacheSource}
          </span>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT: Courses ── */}
          <div className="lg:col-span-2">
            <motion.div variants={searchBarVariants} initial="hidden" animate="visible" className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </motion.div>

            <motion.div className="flex justify-between items-center mb-6" variants={cardVariants}>
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                <SpeechText>My Learning Plan</SpeechText>
                <Clock className="h-5 w-5 ml-2 text-gray-500" />
              </h2>
              <div className="flex space-x-4">
                <motion.div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg" whileHover={{ scale: 1.05 }}>
                  <span className="font-bold">{filteredCourses.length}</span> Total
                </motion.div>
                <motion.div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg" whileHover={{ scale: 1.05 }}>
                  <span className="font-bold">{filteredCourses.filter(c => c.status === "Completed").length}</span> Completed
                </motion.div>
                <motion.div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg" whileHover={{ scale: 1.05 }}>
                  <span className="font-bold">{filteredCourses.filter(c => c.status === "Upcoming").length}</span> Upcoming
                </motion.div>
              </div>
            </motion.div>

            <div className="relative">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course, index) => (
                  <div key={index} className="relative mb-6">
                    {index < filteredCourses.length - 1 && (
                      <motion.svg className="absolute left-6 top-16 h-24 w-0" initial="hidden" animate="visible">
                        <motion.line x1="0" y1="0" x2="0" y2="96" stroke="#d1d5db" strokeWidth="2" strokeDasharray="4 4" variants={lineVariants} />
                      </motion.svg>
                    )}

                    <motion.div
                      variants={cardVariants}
                      whileHover="hover"
                      className={`bg-white rounded-xl shadow-md p-6 flex items-center space-x-4 ${course.status === "Watching" ? "bg-purple-50" : ""}`}
                    >
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                        {course.status === "Completed" ? (
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        ) : course.status === "Watching" ? (
                          <PlayCircle className="h-8 w-8 text-purple-500" />
                        ) : (
                          <Calendar className="h-8 w-8 text-gray-400" />
                        )}
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800">
                          <SpeechText>{course.title}</SpeechText>
                        </h3>
                        <p className="text-gray-600 text-sm">
                          <SpeechText>{course.description}</SpeechText>
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-gray-500 text-sm"><SpeechText>{course.status}</SpeechText></span>
                          {course.status === "Watching" && course.progress && (
                            <span className="text-gray-500 text-sm"><SpeechText>· {course.progress} watched</SpeechText></span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        onClick={() => handleEnroll(course.title)}
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${enrolledCourses.has(course.title) ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                      >
                        <SpeechText>{enrolledCourses.has(course.title) ? "Unenroll" : "Enroll Now"}</SpeechText>
                      </motion.button>
                    </motion.div>

                    {/* ── Expanded docs panel after enroll ── */}
                    <AnimatePresence>
                      {enrolledCourses.has(course.title) && (
                        <motion.div
                          variants={relatedContentVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="mt-3 ml-16 overflow-hidden"
                        >
                          <h4 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <SpeechText>Related Resources for {course.title}</SpeechText>
                          </h4>
                          <div className="space-y-3">
                            {course.docs.map((doc, docIndex) => (
                              <motion.div
                                key={docIndex}
                                variants={cardVariants}
                                whileHover="hover"
                                className={`rounded-xl border p-4 ${docTypeBg(doc.type)}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`${docTypeColor(doc.type)}`}>{docTypeIcon(doc.type)}</span>
                                  <span className={`text-xs font-semibold uppercase tracking-wide ${docTypeColor(doc.type)}`}>
                                    <SpeechText>{doc.type}</SpeechText>
                                  </span>
                                </div>
                                <h5 className="text-sm font-semibold text-gray-800 mb-1">
                                  <SpeechText>{doc.title}</SpeechText>
                                </h5>
                                <p className="text-gray-600 text-xs mb-2">
                                  <SpeechText>{doc.description}</SpeechText>
                                </p>

                                {doc.type === "Video" && doc.youtubeId && (
                                  <motion.button
                                    onClick={() => openPopup(doc.youtubeId!)}
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium"
                                  >
                                    <Video className="h-3 w-3" />
                                    <SpeechText>Watch on YouTube</SpeechText>
                                  </motion.button>
                                )}

                                {doc.type === "Article" && doc.link && (
                                  <motion.a
                                    href={doc.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variants={buttonVariants}
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <SpeechText>Read Article</SpeechText>
                                  </motion.a>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-gray-600 py-12">
                  <SpeechText>No courses found matching your search or category.</SpeechText>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Events + Resources ── */}
          <div className="lg:col-span-1">
            <motion.div variants={containerVariants} initial="hidden" animate="visible">
              <motion.h2 variants={cardVariants} className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                <SpeechText>My Events</SpeechText>
                <span className="ml-2 text-xl">🎉</span>
              </motion.h2>
              <div className="space-y-4">
                <AnimatePresence>
                  {events.map((event, index) => (
                    <motion.div
                      key={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: 20 }}
                      whileHover="hover"
                      className={`rounded-xl shadow-md p-4 ${event.type === "Webinar" ? "bg-blue-50" : event.type === "Lesson" ? "bg-purple-50" : "bg-yellow-50"}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700"><SpeechText>{event.type}</SpeechText></span>
                        <span className="text-sm text-gray-600"><SpeechText>{event.date}</SpeechText></span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-800">
                        <SpeechText>{event.title}</SpeechText>
                      </h3>
                      {event.time && (
                        <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" className="mt-2 px-4 py-1 bg-gray-200 text-gray-800 rounded-lg text-sm">
                          <SpeechText>Start at {event.time}</SpeechText>
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <motion.h2 variants={cardVariants} className="text-2xl font-semibold text-gray-800 mt-8 mb-6 flex items-center">
                <SpeechText>Resources</SpeechText>
                <span className="ml-2 text-xl">📚</span>
              </motion.h2>
              <div className="space-y-4">
                <AnimatePresence>
                  {categoryContent[selectedCategory]?.resources.map((resource, index) => (
                    <motion.div
                      key={index}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, x: 20 }}
                      whileHover="hover"
                      className={`rounded-xl shadow-md p-4 ${resource.type === "Article" ? "bg-green-50" : resource.type === "Video" ? "bg-blue-50" : "bg-yellow-50"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={docTypeColor(resource.type)}>{docTypeIcon(resource.type)}</span>
                        <span className="text-sm font-semibold text-gray-700"><SpeechText>{resource.type}</SpeechText></span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-800">
                        <SpeechText>{resource.title}</SpeechText>
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        <SpeechText>{resource.description}</SpeechText>
                      </p>
                      {resource.type === "Video" && resource.youtubeId && (
                        <motion.button
                          onClick={() => openPopup(resource.youtubeId!)}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="mt-2 inline-flex items-center gap-1 px-4 py-1 bg-red-600 text-white rounded-lg text-sm"
                        >
                          <Video className="h-3 w-3" />
                          <SpeechText>Watch Video</SpeechText>
                        </motion.button>
                      )}
                      {resource.type === "Article" && resource.link && (
                        <motion.a
                          href={resource.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                          className="mt-2 inline-flex items-center gap-1 px-4 py-1 bg-green-600 text-white rounded-lg text-sm"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <SpeechText>Learn More</SpeechText>
                        </motion.a>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── YouTube Popup ── */}
        <AnimatePresence>
          {isPopupOpen && (
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={closePopup}
            >
              <motion.div
                variants={popupVariants}
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative pt-[56.25%]">
                  {videoUrl && (
                    <iframe
                      src={videoUrl}
                      className="absolute top-0 left-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Video Player"
                    />
                  )}
                </div>
                <motion.button
                  onClick={closePopup}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2 shadow-lg z-10"
                  aria-label="Close video"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Learning;
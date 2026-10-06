export const profile = {
  name: "Racell Sincioco",
  role: "Aspiring Cloud Engineer",
  photo: "",
  about: [
    "This site is my main project. It runs on Firebase Hosting, Cloud Run and Firestore, is provisioned with Terraform, and deploys from GitHub Actions without long-lived keys. Each engineering decision is written up in the repository.",
  ],
  email: "racell.sincioco@gmail.com",
  linkedin: "https://www.linkedin.com/in/racell-gabriel-sincioco/",
  github: "https://github.com/chocuuuu",
  resume: "/resume.pdf",
  visitorApi:
    "https://visitor-api-240644792863.us-central1.run.app/api/visitor-count",
};

export type Certification = {
  name: string;
  issuer: string;
  code?: string;
  image?: string;
  url?: string;
};

export const certifications: Certification[] = [
  {
    name: "ServiceNow Certified System Administrator",
    issuer: "ServiceNow",
    image: "/public/certs/csa.png",
    url: "https://www.credly.com/earner/earned/badge/3ccf51ff-e142-419b-869e-c793e9c0bfdd",
  },
  {
    name: "2025 SAS Curiosity Cup Winner",
    issuer: "SAS",  
    image: "/public/certs/sas.png",
    url: "https://www.credly.com/earner/earned/badge/e7479fd7-5b6c-48d7-8cd1-e83aaa9cbf25",
  },
  {
    name: "Implement Load Balancing on Compute Engine Skill Badge",
    issuer: "Google",
    image: "/public/certs/load.png",
    url: "https://www.credly.com/earner/earned/badge/b9625901-3679-4f5f-9334-a4c118f913b2",
  },
  {
    name: "Set Up an App Dev Environment on Google Cloud Skill Badge",
    issuer: "Google",
    image: "/public/certs/appdev.png",
    url: "https://www.credly.com/earner/earned/badge/ba2a510b-4836-4fad-b05e-fc60437c0c8c"
  },
  {
    name: "Cloud Computing Fundamentals",
    issuer: "IBM SkillsBuild",
    image: "/public/certs/cloud.png",
    url: "https://www.credly.com/earner/earned/badge/bf1d3129-aaa3-4c41-819c-f469360c212d"
  },
];

export const inProgress: {
  name: string;
  issuer: string;
  code?: string;
  image?: string;
  url?: string;
}[] = [
  {
    name: "Getting Started with Google Cloud",
    issuer: "Google Cloud",
  },
  {
    name: "Google Cloud Computing Foundations Certificate",
    issuer: "Google Cloud",
  },
];

export type Project = {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  details: {
    label: string;
    text: string;
  }[];
  links: {
    label: string;
    href: string;
  }[];
};

export const projects: Project[] = [
  {
    slug: "serverless-cloud-portfolio",
    title: "Serverless Cloud Portfolio",
    summary:
      "A serverless portfolio website that runs on Firebase Hosting, Cloud Run and Firestore, is provisioned with Terraform, and deploys from GitHub Actions without long-lived keys.",
    stack: [
      "Astro",
      "TypeScript",
      "TailwindCSS",
      "Cloud Run",
      "Firestore",
      "Firebase Hosting",
      "Terraform",
      "GitHub Actions",
      "BigQuery",
    ],
    details: [
      {
        label: "Delivery",
        text: "GitHub Actions authenticates with Workload Identity Federation, so no static service account keys exist anywhere. Gitleaks blocks commits that contain secrets.",
      },
      {
        label: "Analytics",
        text: "No tracking scripts or cookies. Firebase Hosting access logs are routed to BigQuery and queried with standard SQL.",
      },
      {
        label: "Decisions",
        text: "Each major choice is recorded as an Architecture Decision Record in the repository.",
      },
    ],
    links: [
      {
        label: "Github Repository",
        href: "https://github.com/chocuuuu/cloud-portfolio",
      },
    ],
  },
];

export type Experience = {
  role: string;
  company: string;
  period: string;
  bullets: string[];
  url?: string;
};

export const experience: Experience[] = [
  {
    role: "ServiceNow Developer Intern",
    company: "Cognizant",
    period: "January 2026 - May 2026",
    bullets: [
      "Completed an intensive 400+ hour upskilling track, earning badges in Flow Designer, Scripting Fundamentals, CMDB Health Simulators, and Access Control (ACL) Basics.",
      "Successfully passed the ServiceNow Certified System Administrator (CSA) examination.",
      "Administered ITSM modules to streamline service delivery operations, resolving configuration bottlenecks and improving platform usability.",
    ],
  },
  {
    role: "Lead Front-End/Full-Stack Developer",
    company: "Fresco by Meobel",
    period: "October 2024 - May 2025",
    bullets: [
      "Led the development and implementation of a comprehensive Payroll and Attendance System for a restaurant in Marikina City with over 30 employees, serving as the Lead Front End Developer.",
      "Developed and implemented responsive user interfaces using ReactJS and Tailwind CSS.",
      "Primarily responsible for integrating frontend with backend functionalities, utilizing Docker for containerization, Postman for API testing, and PostgreSQL for database management, deployed on Digital Ocean.",
    ],
    url: "https://github.com/chocuuuu/FrescoByMeobel",
  },
];

export const skills: { group: string; items: string[] }[] = [
  {
    group: "ServiceNow",
    items: ["CSA", "ITSM", "CMDB Health", "Flow Designer"],
  },
  {
    group: "Languages & Web",
    items: [
      "Java",
      "Javascript",
      "TypeScript",
      "Python",
      "ReactJS",
      "Node.js",
      "Django REST Framework",
      "Tailwind CSS",
    ],
  },
  {
    group: "Databases & Infrastructure",
    items: ["PostgreSQL", "Docker", "GitHub Actions", "RESTful APIs"],
  },
  {
    group: "AI & Data",
    items: ["OpenAI", "OpenCV", "Power BI", "Tableau"],
  },
];

export const navItems = [
    {
        id: 'about',
        label: 'About'
    }, 
    ...certifications.length || inProgress.length ? [{ id: 'certifications', label: 'Certifications' }] : [],
    {
        id: 'projects',
        label: 'Projects'
    },
    ...experience.length ? [{ id: 'experience', label: 'Experience' }] : [],
    { 
        id: 'skills',
        label: 'Skills'
    },
    {
        id: 'contact',
        label: 'Contact'
    }
]
import React from "react";
import { logUsageEvent } from "../utils/usageTracking";

interface Resource {
  title: string;
  description: string;
  href: string;
}

const resources: Resource[] = [
  {
    title: "Goal Setting",
    description:
      "Learn about learning, performance, and outcome goals, and how to create goals that are meaningful and attainable.",
    href: "/resources/goal-setting.pdf",
  },
  {
    title: "Action Planning + Problem Solving",
    description:
      "Turn a physical activity goal into a clear what, when, where, and how plan, then prepare for barriers using alternative and if/then plans.",
    href: "/resources/action-planning-problem-solving.pdf",
  },
  {
    title: "Self-Monitoring",
    description:
      "Explore ways to monitor physical activity or preparation for activity, including what to track, how to track it, when, and how often.",
    href: "/resources/self-monitoring.pdf",
  },
  {
    title: "Talking to Yourself About Physical Activity",
    description:
      "Learn about positive self-talk, self-praise, and positive re-framing to support physical activity.",
    href: "/resources/talking-to-yourself-about-physical-activity.pdf",
  },
];

interface ResourcesProps {
  userId: string;
}

const Resources: React.FC<ResourcesProps> = ({
  userId,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-sky-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-sky-200 rounded-3xl p-6 mb-6 shadow-sm">
          <h1 className="text-2xl font-bold text-sky-950">
            Behaviour Change Resources
          </h1>

          <p className="text-sky-700 mt-2">
            Explore guides that can support your physical activity goals and
            behaviour change journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {resources.map((resource) => (
            <div
              key={resource.title}
              className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm flex flex-col"
            >
              <h2 className="text-xl font-semibold text-sky-950">
                {resource.title}
              </h2>

              <p className="text-sky-700 mt-3 leading-relaxed flex-1">
                {resource.description}
              </p>

              <a
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  logUsageEvent(
                    userId,
                    "resource_opened",
                    {
                      resource: resource.title,
                      source: "resources_page",
                    }
                  )
                }
                className="mt-5 inline-flex justify-center items-center bg-sky-500 text-white font-semibold px-4 py-3 rounded-xl hover:bg-sky-600 transition-colors"
              >
                View Resource
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Resources;
import AboutHero from '@/components/about/AboutHero';
import StoryTimeline from '@/components/about/StoryTimeline';
import VisionMission from '@/components/about/VisionMission';
import TechnologyFlow from '@/components/about/TechnologyFlow';
import FounderProfile from '@/components/about/FounderProfile';
import RecognitionQuotes from '@/components/about/RecognitionQuotes';
import ApplicationsGrid from '@/components/about/ApplicationsGrid';
import ClosingCta from '@/components/about/ClosingCta';

/**
 * Premium "About IEG" company profile page: hero, story & journey, vision/mission, technology,
 * leadership, recognition, applications and a closing call to action. All copy lives in
 * src/data/about.ts — verified against the IEG Technical Presentation and the company website.
 */
export default function AboutPage() {
  return (
    <div className="space-y-8 md:space-y-10">
      <AboutHero />
      <StoryTimeline />
      <VisionMission />
      <TechnologyFlow />
      <FounderProfile />
      <RecognitionQuotes />
      <ApplicationsGrid />
      <ClosingCta />
    </div>
  );
}

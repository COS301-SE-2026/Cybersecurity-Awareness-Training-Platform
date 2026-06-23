import LandingNavbar from '../components/layout/LandingNavbar';
import HeroSection from '../components/landing-page/HeroSection';
import AboutSection from '../components/landing-page/AboutSection';
import TeamSection from '../components/landing-page/TeamSection';

function LandingPage() {
  return (
    <main>
      {/* NAVBAR */}
      <LandingNavbar />
      <div className="pt-32">
        {/* HERO SECTION */}
        <HeroSection />

        {/* ABOUT & FAQ SECTION */}
        <AboutSection />

        {/* TEAM SECTION */}
        <TeamSection />
      </div>
    </main>
  );
}

export default LandingPage;

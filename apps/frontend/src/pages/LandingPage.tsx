import LandingNavbar from '../components/layout/LandingNavbar';
import HeroSection from '../components/landing-page/HeroSection';
import AboutSection from '../components/landing-page/AboutSection';
import FeatureSection from '../components/landing-page/FeatureSection';
import TeamSection from '../components/landing-page/TeamSection';

function LandingPage() {
  return (
    <main>
      {/* NAVBAR */}
      <LandingNavbar />
      <div className="pt-44 sm:pt-36">
        {/* HERO SECTION */}
        <section id="home" className="landing-anchor-section">
          <HeroSection />
        </section>

        {/* ABOUT & FAQ SECTION */}
        <section id="about" className="landing-anchor-section">
          <AboutSection />
        </section>

        {/* FEATURES SECTION  */}
        <section id="features" className="landing-anchor-section">
          <FeatureSection />
        </section>

        {/* TEAM SECTION */}
        <section id="team" className="landing-anchor-section">
          <TeamSection />
        </section>
      </div>
    </main>
  );
}

export default LandingPage;

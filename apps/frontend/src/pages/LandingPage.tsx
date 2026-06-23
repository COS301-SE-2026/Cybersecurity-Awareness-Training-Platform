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
      <div className="pt-32">
        {/* HERO SECTION */}
        <section id="home">
          <HeroSection />
        </section>

        {/* ABOUT & FAQ SECTION */}
        <section id="about">
          <AboutSection />
        </section>

        {/* FEATURES SECTION  */}
        <section id="features">
          <FeatureSection />
        </section>

        {/* TEAM SECTION */}
        <section id="team">
          <TeamSection />
        </section>
      </div>
    </main>
  );
}

export default LandingPage;

import LandingNavbar from '../components/layout/LandingNavbar';
import HeroSection from '../components/landing-page/HeroSection';
import AboutSection from '../components/landing-page/AboutSection';
import FeatureSection from '../components/landing-page/FeatureSection';
import FeatureDetailsSection from '../components/landing-page/FeatureDetailsSection';

function LandingPage() {
  return (
    <main>
      <LandingNavbar />
      <div className="pt-44 sm:pt-36">
        <section id="home" className="landing-anchor-section">
          <HeroSection />
        </section>

        <section id="about" className="landing-anchor-section">
          <AboutSection />
        </section>

        <section id="features" className="landing-anchor-section">
          <FeatureSection />
          <FeatureDetailsSection />
        </section>
      </div>
    </main>
  );
}

export default LandingPage;

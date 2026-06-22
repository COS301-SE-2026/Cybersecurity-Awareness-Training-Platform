import LandingNavbar from '../components/layout/LandingNavbar';
import HeroSection from '../components/landing-page/HeroSection';

function LandingPage() {
  return (
    <main>
      {/* NAVBAR */}
      <LandingNavbar />
      <div className="pt-32">
        {/* HERO SECTION */}
        <HeroSection />
      </div>
    </main>
  );
}

export default LandingPage;

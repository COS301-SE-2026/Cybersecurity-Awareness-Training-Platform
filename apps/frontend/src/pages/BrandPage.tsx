import BrandNavbar from './Brand/BrandNavbar';
import BrandHeroSection from './Brand/BrandHeroSection';
import BrandSection from './Brand/BrandSection';
import ColourPalette from './Brand/ColourPalette';

function BrandPage() {
  return (
    <main>
      {/* NAVBAR */}
      <BrandNavbar />
      <div className="pt-32">
        <section id="home">
          <BrandHeroSection />
        </section>

        <section id="brand">
          <BrandSection />
        </section>

        <section id="colours">
          <ColourPalette />
        </section>
      </div>
    </main>
  );
}

export default BrandPage;

import BrandNavbar from './brand/BrandNavbar';
import BrandHeroSection from './brand/BrandHeroSection';
import BrandSection from './brand/BrandSection';
import ColourPalette from './brand/ColourPalette';
import Typography from './brand/Typography';
import Logo from './brand/Logo';
import Iconography from './brand/Iconography';

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

        <section id="typography">
          <Typography />
        </section>

        <section id="logo">
          <Logo />
        </section>

        <section id="iconography">
          <Iconography />
        </section>
      </div>
    </main>
  );
}

export default BrandPage;

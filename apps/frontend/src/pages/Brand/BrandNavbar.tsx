import GetStartedModal from '../../components/landing-page/GetStartedModal';
import { useState } from 'react';

function BrandNavbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <header className="fixed w-full z-20 top-0 start-0">
      <nav className="bg-white-purple">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
          <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/Phish Logo Light.png" className="h-14" alt="Insightful Phish Logo" />
            <span className="flex items-center gap-2 mt-2">
              <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-medium whitespace-nowrap tracking-wide">
                Insightful
              </span>
              <span className="font-overpass self-center text-[1.94rem] text-pink text-heading font-black whitespace-nowrap tracking-wide">
                Phish.
              </span>
            </span>
          </a>

          <div className="flex items-center space-x-6 rtl:space-x-reverse mt-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer font-jost tracking-wider text-xl text-white font-regular bg-main-purple leading-5 px-4 py-2.5 focus:outline-none"
            >
              Get Started
            </button>
            <a href="/login" className="font-jost text-xl font-medium tracking-wider text-pink">
              Login
            </a>
          </div>
        </div>
      </nav>
      <nav className="bg-faint-purple">
        <div className="max-w-screen-xl px-4 py-3 mx-auto">
          <div className="flex items-center">
            <ul className="flex flex-row font-medium font-jost mt-0 space-x-8 rtl:space-x-reverse text-[1.4rem] tracking-wider">
              <li>
                <a href="#home" className="text-heading text-purple" aria-current="page">
                  Brand
                </a>
              </li>
              <li>
                <a href="#colours" className="text-heading text-purple">
                  Colours
                </a>
              </li>
              <li>
                <a href="#typography" className="text-heading text-purple">
                  Typography
                </a>
              </li>
              <li>
                <a href="#logo" className="text-heading text-purple">
                  Logo
                </a>
              </li>
              <li>
                <a href="#iconography" className="text-heading text-purple">
                  Iconography
                </a>
              </li>
              <li>
                <a href="#accessibility" className="text-heading text-purple">
                  Accessibility
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Render Modal */}
      <GetStartedModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  );
}

export default BrandNavbar;

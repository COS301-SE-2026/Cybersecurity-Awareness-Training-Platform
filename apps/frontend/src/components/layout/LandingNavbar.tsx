import { useState } from 'react';
import GetStartedModal from '../landing-page/GetStartedModal';

function LandingNavbar() {
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
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="text-heading text-purple">
                  About & FAQs
                </a>
              </li>
              <li>
                <a href="#features" className="text-heading text-purple">
                  Features
                </a>
              </li>
              <li>
                <a href="#team" className="text-heading text-purple">
                  Team
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-2-User-Manual"
                  className="text-heading text-purple"
                >
                  Help
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

export default LandingNavbar;

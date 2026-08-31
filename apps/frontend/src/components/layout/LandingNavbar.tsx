import { useState } from 'react';
import GetStartedModal from '../landing-page/GetStartedModal';

function LandingNavbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <header className="fixed w-full z-20 top-0 start-0">
      <nav className="bg-white-purple">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <a href="/" className="flex items-center gap-2 sm:gap-3">
            <img src="/Phish Logo Light.png" className="h-11 sm:h-14" alt="Insightful Phish Logo" />
            <span className="flex items-center gap-1 sm:gap-2">
              <span className="font-overpass self-center text-[1.35rem] text-pink text-heading font-medium whitespace-nowrap tracking-wide sm:text-[1.94rem]">
                Insightful
              </span>
              <span className="font-overpass self-center text-[1.35rem] text-pink text-heading font-black whitespace-nowrap tracking-wide sm:text-[1.94rem]">
                Phish.
              </span>
            </span>
          </a>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer font-jost tracking-wider text-[1rem] text-white font-regular bg-main-purple leading-5 px-4 py-2.5 focus:outline-none sm:text-xl"
            >
              Get Started
            </button>
            <a
              href="/login"
              className="font-jost text-[1rem] font-medium tracking-wider text-pink sm:text-xl"
            >
              Login
            </a>
          </div>
        </div>
      </nav>
      <nav className="bg-faint-purple">
        <div className="max-w-screen-xl px-4 py-3 mx-auto overflow-x-auto">
          <div className="flex items-center">
            <ul className="flex min-w-max flex-row gap-5 font-medium font-jost text-[1rem] tracking-wider sm:gap-8 sm:text-[1.4rem]">
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
                  className="text-heading text-dark-pink"
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

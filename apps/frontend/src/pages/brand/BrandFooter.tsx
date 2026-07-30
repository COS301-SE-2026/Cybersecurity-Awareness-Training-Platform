import { Popover } from 'flowbite-react';

function BrandFooter() {
  const brandGuidelinesChangelog = (
    <div className="w-145 bg-faint-purple shadow-xl">
      <div className="bg-gray-100 bg-light-purple px-3 py-2">
        <h3 className="font-semibold font-jost text-[1.4rem] text-purple tracking-wider">
          Brand Guidelines Changelog
        </h3>
      </div>

      <p className="tracking-wider px-3 mt-2 text-sm font-jost font-medium text-[1.2rem] text-pink">
        Last Updated 30 July 2026 (Demo 2)
      </p>

      <div className="px-3 py-2 tracking-wider">
        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Added Comprehensive Colour Palette
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Updated Typography To Include New Fonts
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Updated Logo Usage Information
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Polished Iconography Information
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Added Voice and Tone Information
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Added Component Library
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-dark-pink -mt-1">●</span>
          <p className="text-sm font-overpass font-medium text-[1.05rem] text-dark-pink mb-2">
            Added Changelog
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="bg-dark-pink">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-white">
          DON'T TAKE THE BAIT.
        </h2>

        <div className="flex items-start gap-2 mt-4">
          <Popover
            content={brandGuidelinesChangelog}
            arrow={false}
            theme={{
              base: 'rounded-none bg-transparent border-0 shadow-xl absolute z-20 inline-block w-max max-w-[100vw] outline-none',
              content: 'relative overflow-hidden rounded-none',
            }}
          >
            <span
              className="material-symbols-sharp cursor-pointer text-white"
              style={{ fontSize: '2.3rem' }}
            >
              text_compare
            </span>
          </Popover>

          <p className="text-3xl mb-2 font-jost tracking-wide text-white font-regular">
            Brand Guidelines Changelog
          </p>
        </div>
        <div className="flex items-start gap-2 mt-4">
          <span
            className="material-symbols-sharp cursor-pointer text-white"
            style={{ fontSize: '2.3rem' }}
          >
            help
          </span>
          <a
            href="https://github.com/COS301-SE-2026/Cybersecurity-Awareness-Training-Platform/wiki/Demo-2-User-Manual"
            className="text-3xl mb-2 underline font-jost tracking-wide text-white font-regular"
          >
            User Manual
          </a>
        </div>

        {/* Easter Egg */}
        <p className="mt-2 text-md font-jost tracking-wide text-white font-regular">
          © 2026 Insightful Phish Cybersecurity Software Systems (Pty) Ltd. and The Project
          Cheesecake Team
        </p>
        <p className="text-md font-jost tracking-wide text-white font-regular">
          <em>Pretoria, Gauteng, South Africa</em>
        </p>
      </div>
    </section>
  );
}

export default BrandFooter;

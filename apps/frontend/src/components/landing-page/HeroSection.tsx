function HeroSection() {
  return (
    <section className="bg-light-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left sm:px-6 lg:py-16">
        <h1 className="font-jost mb-4 text-[2.75rem] mt-4 font-semibold tracking-regular text-purple leading-tight sm:mt-8 sm:text-6xl lg:mt-4 lg:text-8xl">
          DON'T TAKE THE BAIT.
        </h1>
        <h1 className="font-jost mb-2 text-3xl font-medium tracking-wide text-dark-pink leading-tight sm:text-5xl lg:text-6xl">
          Cybersecurity Awareness Training
        </h1>
        <h1 className="font-jost mb-6 text-3xl font-medium tracking-wide text-dark-pink leading-tight sm:mb-8 sm:text-5xl lg:text-6xl">
          for Individuals and Organisations.
        </h1>

        <p className="mb-8 text-lg font-overpass tracking-wide text-dark-pink font-medium sm:text-2xl">
          We help individuals and organisations recognise phishing attacks, build cybersecurity
          awareness, and develop safer online habits through realistic simulations, interactive
          training, and practical assessments.
        </p>

        <div className="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row">
          <a
            href="#about"
            className="font-jost tracking-wider text-[1.05rem] inline-flex justify-center items-center py-3 px-5 font-regular text-center text-white bg-pink sm:text-xl"
          >
            Learn More
            <svg
              className="ml-2 -mr-1 w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              ></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

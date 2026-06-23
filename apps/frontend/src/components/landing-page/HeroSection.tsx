function HeroSection() {
  return (
    <section className="bg-light-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        {/* <a href="#" className="inline-flex justify-between items-center py-1 px-1 pr-4 mb-7 text-sm text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700" role="alert">
          <span className="text-xs bg-primary-600 rounded-full text-white px-4 py-1.5 mr-3">New</span> <span className="text-sm font-medium">Flowbite is out! See what's new</span>
          <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>
        </a> */}

        <h1 className="font-jost mb-4 text-8xl mt-12 font-semibold tracking-regular text-purple">
          DON'T TAKE THE BAIT.
        </h1>
        <h1 className="font-jost mb-2 text-6xl font-medium tracking-wide text-dark-pink">
          Cybersecurity Awareness Training
        </h1>
        <h1 className="font-jost mb-8 text-6xl font-medium tracking-wide text-dark-pink">
          for Individuals and Organisations.
        </h1>

        <p className="mb-8 text-2xl font-overpass tracking-wide text-dark-pink font-medium">
          We help individuals and organisations recognise phishing attacks, build cybersecurity
          awareness, and develop safer online habits through realistic simulations, interactive
          training, and practical assessments.
        </p>

        <div className="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row ">
          <a
            href="/"
            className="font-jost tracking-wider text-xl inline-flex justify-center items-center py-3 px-5 font-regular text-center text-white bg-pink"
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

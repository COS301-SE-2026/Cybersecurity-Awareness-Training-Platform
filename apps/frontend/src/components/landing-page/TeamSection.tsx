function TeamSection() {
  return (
    <section className="bg-faint-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        {/* HEADING */}
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-dark-pink">
          Team
        </h2>

        {/* TEAM MEMBERS */}
        <div className="-ml-11 grid gap-16 lg:gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Johan Nel */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            {/* HEADSHOT */}
            <img
              className="mx-auto mb-4 w-36 h-36"
              src="headshots/Johan.jpg"
              alt="Johan Nel Headshot"
            />

            {/* NAME */}
            <h3 className="font-overpass mb-0 text-2xl font-bold tracking-tight text-deep-purple">
              <a href="/">Johan Nel</a>
            </h3>

            {/* ROLE */}
            <p className="font-jost font-regular text-xl">Team Lead</p>

            {/* LINKEDIN and GITHUB */}
            <ul className="flex justify-center mt-2 space-x-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/ferdinand-johannes-nel/"
                  className="text-[#39569c] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/LinkedIn.svg" alt="LinkedIn Icon" className="w-8 h-8" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/FJNel"
                  className="text-[#00acee] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/GitHub.svg" alt="GitHub Icon" className="w-7 h-7" />
                </a>
              </li>
            </ul>
          </div>

          {/* Connor Bell */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            {/* HEADSHOT */}
            <img
              className="mx-auto mb-4 w-36 h-36"
              src="headshots/Connor.jpg"
              alt="Connor Bell Headshot"
            />

            {/* NAME */}
            <h3 className="font-overpass mb-0 text-2xl font-bold tracking-tight text-deep-purple">
              <a href="/">Connor Bell</a>
            </h3>

            {/* ROLE */}
            <p className="font-jost font-regular text-xl">Frontend</p>

            {/* LINKEDIN and GITHUB */}
            <ul className="flex justify-center mt-2 space-x-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/connorbellUP/"
                  className="text-[#39569c] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/LinkedIn.svg" alt="LinkedIn Icon" className="w-8 h-8" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/u24569608"
                  className="text-[#00acee] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/GitHub.svg" alt="GitHub Icon" className="w-7 h-7" />
                </a>
              </li>
            </ul>
          </div>

          {/* Rudolph Lamprecht */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            {/* HEADSHOT */}
            <img
              className="mx-auto mb-4 w-36 h-36"
              src="headshots/Rudolph.jpg"
              alt="Rudolph Lamprecht Headshot"
            />

            {/* NAME */}
            <h3 className="font-overpass mb-0 text-2xl font-bold tracking-tight text-deep-purple">
              <a href="/">Rudolph Lamprecht</a>
            </h3>

            {/* ROLE */}
            <p className="font-jost font-regular text-xl">Full--Stack</p>

            {/* LINKEDIN and GITHUB */}
            <ul className="flex justify-center mt-2 space-x-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/rudolph-lamprecht-2b9511380/"
                  className="text-[#39569c] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/LinkedIn.svg" alt="LinkedIn Icon" className="w-8 h-8" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/RudolphLamp"
                  className="text-[#00acee] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/GitHub.svg" alt="GitHub Icon" className="w-7 h-7" />
                </a>
              </li>
            </ul>
          </div>

          {/* Zoë Joubert */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            {/* HEADSHOT */}
            <img
              className="mx-auto mb-4 w-36 h-36"
              src="headshots/Zoe.jpg"
              alt="Zoë Joubert Headshot"
            />

            {/* NAME */}
            <h3 className="font-overpass mb-0 text-2xl font-bold tracking-tight text-deep-purple">
              <a href="/">Zoë Joubert</a>
            </h3>

            {/* ROLE */}
            <p className="font-jost font-regular text-xl">Integration & QA</p>

            {/* LINKEDIN and GITHUB */}
            <ul className="flex justify-center mt-2 space-x-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/zoë-joubert/"
                  className="text-[#39569c] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/LinkedIn.svg" alt="LinkedIn Icon" className="w-8 h-8" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ZoeJ72005"
                  className="text-[#00acee] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/GitHub.svg" alt="GitHub Icon" className="w-7 h-7" />
                </a>
              </li>
            </ul>
          </div>

          {/* Adriano Roberto Da Costa Jorge */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            {/* HEADSHOT */}
            <img
              className="mx-auto mb-4 w-36 h-36"
              src="headshots/Adriano.jpg"
              alt="Adriano Roberto Da Costa Jorge Headshot"
            />

            {/* NAME */}
            <h3 className="font-overpass mb-0 text-2xl font-bold tracking-tight text-deep-purple">
              <a href="/">Adriano Jorge</a>
            </h3>

            {/* ROLE */}
            <p className="font-jost font-regular text-xl">Backend</p>

            {/* LINKEDIN and GITHUB */}
            <ul className="flex justify-center mt-2 space-x-2">
              <li>
                <a
                  href="https://www.linkedin.com/in/adriano-jorge-909486378/"
                  className="text-[#39569c] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/LinkedIn.svg" alt="LinkedIn Icon" className="w-8 h-8" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Adri4no098"
                  className="text-[#00acee] hover:text-gray-900 dark:hover:text-white"
                >
                  <img src="/icons/GitHub.svg" alt="GitHub Icon" className="w-7 h-7" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TeamSection;

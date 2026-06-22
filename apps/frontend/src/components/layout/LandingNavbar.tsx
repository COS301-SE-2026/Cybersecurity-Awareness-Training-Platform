function LandingNavbar() {
  return (
    <header className="fixed w-full z-20 top-0 start-0">
      <nav className="bg-neutral-primary">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl p-4">
          <a href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
            <img src="/Phish Logo Light.png" className="h-10" alt="Insightful Phish Logo" />
            <span className="self-center text-xl text-heading font-semibold whitespace-nowrap">
              Insightful Phish.
            </span>
          </a>

          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <a
              href="/login"
              className="font-overpass text-md font-medium text-fg-brand hover:underline"
            >
              Login
            </a>
          </div>
        </div>
      </nav>
      <nav className="bg-neutral-secondary-soft border-y border-default border-default">
        <div className="max-w-screen-xl px-4 py-3 mx-auto">
          <div className="flex items-center">
            <ul className="flex flex-row font-medium mt-0 space-x-8 rtl:space-x-reverse text-sm">
              <li>
                <a href="/" className="text-heading hover:underline" aria-current="page">
                  Home
                </a>
              </li>
              <li>
                <a href="/" className="text-heading hover:underline">
                  Company
                </a>
              </li>
              <li>
                <a href="/" className="text-heading hover:underline">
                  Team
                </a>
              </li>
              <li>
                <a href="/" className="text-heading hover:underline">
                  Features
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default LandingNavbar;

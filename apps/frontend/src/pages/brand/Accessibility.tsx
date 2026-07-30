function Logo() {
  return (
    <section className="bg-white">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-purple">
          Accessibility
        </h2>

        <img
          src="/a_score.png"
          alt="Insightful Phish Secondary Dark Logo with Motto"
          style={{ width: '100%', maxWidth: '500px' }}
        />

        <p className="text-xl mb-12 mt-12 font-overpass tracking-wide text-dark-pink font-regular text-justify text-justify">
          We also considered accessibility in the interface design. The platform uses high-contrast
          colours, large readable typography, clear navigation, and consistent layouts to improve
          usability and readability for trainees. We additionally used <em>Google Lighthouse</em>{' '}
          accessibility testing, where the frontend achieved a score ranging from 80 to 100.
        </p>
      </div>
    </section>
  );
}
export default Logo;

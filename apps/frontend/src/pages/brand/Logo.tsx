function Logo() {
  return (
    <section className="bg-white">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-purple">
          Logo
        </h2>

        <div className="mb-16">
          <p className="text-3xl font-jost tracking-wide text-purple font-medium text-justify">
            Light Background Logos
          </p>

          <div className="grid grid-cols-3 items-center gap-6 px-6 pb-8">
            <img
              src="/main_logo_light_motto.png"
              alt="Insightful Phish Main Light Logo with Motto"
              style={{ width: '100%', maxWidth: '300px' }}
            />

            <img
              src="/secondary_logo_light_motto.png"
              alt="Insightful Phish Secondary Light Logo with Motto"
              style={{ width: '150%', maxWidth: '1200px' }}
            />
          </div>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Dark Background Logos
        </p>

        <div className="grid grid-cols-3 items-center gap-6 bg-[#090054] px-6 pb-8 mb-12">
          <img
            src="/main_logo_dark_motto.png"
            alt="Insightful Phish Main Dark Logo with Motto"
            style={{ width: '100%', maxWidth: '300px' }}
          />

          <img
            src="/secondary_logo_dark_motto.png"
            alt="Insightful Phish Secondary Dark Logo with Motto"
            style={{ width: '150%', maxWidth: '1200px' }}
          />
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-purple font-medium text-justify">
          Logo Usage
        </p>

        <p className="text-xl mb-12 font-overpass tracking-wide text-dark-pink font-regular text-justify text-justify">
          <strong>
            {' '}
            The <em>Insightful Phish</em> logo is the primary visual identifier of the brand and
            should be used consistently across all applications.
          </strong>{' '}
          <br />
          <br />
          It is available in both light and dark variations, and the appropriate version should
          always be selected to ensure maximum visibility and contrast against the background.
          <br />
          <br />
          <div className="font-jost text-pink text-left -mb-6 text-3xl max-w-xl">
            The sharp linework and modern typography reflect the brand's focus on precision,
            awareness, and confidence.
          </div>
          <br />
          <br />
          To maintain brand consistency, the logo must always retain its original proportions,
          spacing, colours, and typography, and must never be distorted, stretched, rotated,
          recoloured, or modified with unauthorised visual effects.
          <br />
          The approved logo layouts position the logotype either to the right of or below the fish.
          No other arrangements are permitted.
          <br />
          <br />
          The slogan, <span className="font-google_sans_code">“DON'T TAKE THE BAIT”</span>, should
          be included whenever possible and may only be omitted if it already appears elsewhere on
          the same page or if space constraints prevent its use.
          <br />
          Adequate clear space should always surround the logo to preserve its clarity, readability,
          and visual impact across both digital and print media.
        </p>
      </div>
    </section>
  );
}
export default Logo;

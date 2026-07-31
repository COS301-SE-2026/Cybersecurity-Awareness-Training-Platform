function Typography() {
  return (
    <section className="bg-[#CFD7FF]">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left lg:py-16">
        <h2 className="font-jost mb-12 text-6xl font-semibold tracking-regular text-purple">
          Typography
        </h2>

        <p className="text-3xl mb-4 font-jost tracking-wide text-dark-pink font-medium text-justify">
          Main Fonts
        </p>
        <div className="grid grid-cols-2 gap-12">
          <div className="mb-12">
            <h2 className="font-jost mb-6 text-7xl font-regular tracking-regular text-[#0D0086]">
              Jost
            </h2>

            <p className="max-w-md text-left font-jost text-[1.3rem] tracking-wide text-[#0D0086]">
              A bold, modern typeface used for headings, buttons, and key visual elements throughout
              the brand. Its clean geometric structure and strong presence create clear visual
              hierarchy while reinforcing the sharp, confident personality of the{' '}
              <em>Insightful Phish</em> brand. <em>Jost</em> is used to immediately capture
              attention and strengthen the brand's modern cybersecurity aesthetic.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="font-overpass mb-6 text-7xl font-regular tracking-regular text-[#0D0086]">
              Overpass
            </h2>

            <p className="max-w-md text-left font-overpass text-xl tracking-wider text-[#0D0086]">
              A structured and highly readable typeface used for body text, supporting content, and
              longer-form communication. Its balanced proportions improve clarity and readability
              while maintaining a modern technical feel consistent with the brand identity.{' '}
              <em>Overpass</em> supports accessible communication while complementing the sharp
              visual style of the overall brand.
            </p>
          </div>
        </div>

        <p className="text-3xl mb-4 font-jost tracking-wide text-dark-pink font-medium text-justify">
          Other Fonts
        </p>
        <div className="grid grid-cols-2 gap-12">
          <div className="mb-12">
            <h2 className="font-jost mb-6 text-6xl font-google_sans_code tracking-regular text-[#0D0086]">
              Google Sans Code
            </h2>

            <p className="max-w-md text-left font-google_sans_code text-xl tracking-wide text-[#0D0086]">
              <em>Google Sans Code</em> is reserved for technical and data-oriented content
              throughout the application. It is used to display values such as email addresses,
              usernames, verification codes, hexadecimal colour values, and other fixed-format text
              where readability and character distinction are important. Its clean monospace design
              helps technical information stand out from the surrounding interface.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Typography;

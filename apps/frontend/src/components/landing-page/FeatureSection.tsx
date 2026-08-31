function FeatureSection() {
  return (
    <section className="bg-ip-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl sm:py-16 lg:px-6">
        <div className="max-w-screen-md mb-8 lg:mb-16">
          <h2 className="font-jost mb-6 text-4xl font-semibold tracking-regular text-deep-purple sm:text-6xl">
            Features
          </h2>
          <p className="font-overpass text-dark-pink font-medium text-base tracking-wide sm:text-xl">
            Explore the tools and training resources that help individuals and organisations build
            stronger cybersecurity awareness and reduce human risk.
          </p>
        </div>

        <div className="space-y-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 md:space-y-0">
          {/* FEATURE 1 */}
          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span className="material-icons-sharp text-purple" style={{ fontSize: '3rem' }}>
                gamepad
              </span>
            </div>

            {/* Feature Title */}
            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Phishing Simulations
            </h3>

            {/* Feature Description */}
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Practise identify realistic phishing attacks in a safe, controlled environment
              designed to build confidence and awareness.
            </p>
          </div>

          {/* FEATURE 2 */}
          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span className="material-icons-sharp text-purple" style={{ fontSize: '3rem' }}>
                school
              </span>
            </div>

            {/* Feature Title */}
            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Interactive Training
            </h3>

            {/* Feature Description */}
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Learn cybersecurity concepts through structured training content designed to improve
              awareness and reduce unsafe behaviour.
            </p>
          </div>

          {/* FEATURE 3 */}
          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span className="material-icons-sharp text-purple" style={{ fontSize: '3rem' }}>
                quiz
              </span>
            </div>

            {/* Feature Title */}
            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Knowledge Quizzes
            </h3>

            {/* Feature Description */}
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Reinforce learning with quizzes that test understanding and help trainees measure
              their cybersecurity knowledge.
            </p>
          </div>

          {/* We can add more features later on...  */}
          {/* I will leave it at these three for now... */}
        </div>
      </div>
    </section>
  );
}

export default FeatureSection;

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
          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                gamepad
              </span>
            </div>

            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Phishing Simulations
            </h3>

            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Practise spotting suspicious messages in a simulated inbox. Organisations can also
              send controlled phishing emails to real inboxes, helping trainees recognise warning
              signs in everyday situations.
            </p>
          </div>

          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                school
              </span>
            </div>

            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Interactive Training
            </h3>

            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Work through training documents and practical activities that explain common cyber
              threats. Learn what to look for in suspicious emails and build safer habits you can
              apply beyond the training.
            </p>
          </div>

          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                quiz
              </span>
            </div>

            <h3 className="mb-2 text-2xl font-jost font-medium text-pink sm:text-3xl">
              Knowledge Quizzes
            </h3>

            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Put your understanding to the test with quizzes alongside your training. Review your
              results and answer feedback to understand mistakes and see which topics need more
              practice.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureSection;

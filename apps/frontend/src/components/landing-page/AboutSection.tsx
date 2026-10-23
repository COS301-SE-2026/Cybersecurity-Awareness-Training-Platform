function AboutSection() {
  return (
    <section className="bg-white-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left sm:px-6 lg:py-16">
        <h2 className="font-jost mb-8 text-4xl font-semibold tracking-regular text-purple sm:mb-12 sm:text-6xl">
          About
        </h2>

        <p className="text-lg mb-6 font-overpass tracking-wide text-purple font-bold sm:text-2xl sm:text-justify">
          Insightful Phish is a cybersecurity awareness and training platform that helps individuals
          and organisations learn how to recognise and respond to common cyber threats, especially
          phishing attacks.
        </p>

        <p className="text-base mb-6 font-overpass tracking-wide text-dark-pink font-medium sm:text-xl sm:text-justify">
          The platform combines realistic phishing simulations with interactive training to help
          people recognise and respond to cyber threats in a safe environment. Through simulated
          emails, training content, and quizzes, trainees can practice identifying suspicious
          activity, learn from mistakes, and build stronger cybersecurity habits.
        </p>
      </div>
      <div className="py-6 px-4 mx-auto max-w-screen-xl sm:px-6">
        <h2 className="font-jost mb-6 text-4xl font-semibold tracking-regular text-purple sm:text-6xl">
          Frequently Asked Questions
        </h2>
        <div className="grid pt-4 text-left md:gap-16 md:grid-cols-2 md:pt-8">
          <div>
            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  {' '}
                  help_center{' '}
                </span>
                <span> What is Insightful Phish? </span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                A cybersecurity awareness and training platform that helps individuals and
                organisations recognise phishing attacks, develop safer online habits, and improve
                their overall security awareness through interactive learning experiences.
              </p>
            </div>
            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  {' '}
                  help_center{' '}
                </span>
                <span> How does the training work? </span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                The platform combines realistic phishing simulations, training material, and
                assessments to help learners identify threats, understand common attack techniques,
                and respond safely to suspicious activity.
              </p>
            </div>

            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  aria-hidden="true"
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  help_center
                </span>
                <span>How do I get started?</span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                Choose Get Started to register as an individual trainee or request registration for
                your organisation. Individuals can browse and join available platform campaigns,
                while organisation members complete training assigned by their administrators.
              </p>
            </div>

            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  aria-hidden="true"
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  help_center
                </span>
                <span>Are the phishing simulations safe?</span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                Simulations provide controlled practice with realistic emails and phishing pages.
                The platform records interactions, such as opening a page or submitting a form,
                without recording what you type into the simulation page.
              </p>
            </div>
          </div>
          <div>
            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  {' '}
                  help_center{' '}
                </span>
                <span> Who can use Insightful Phish? </span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                It is designed for both individuals and organisations. Whether you're improving your
                own cybersecurity knowledge or training an entire workforce, the platform provides
                practical learning tools to build stronger security habits.
              </p>
            </div>
            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  {' '}
                  help_center{' '}
                </span>
                <span> Why is cybersecurity awareness important? </span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                Many security breaches occur because of human error rather than technical failures.
                By learning how to recognise phishing attempts and other common threats, individuals
                and organisations can significantly reduce their risk of cyberattacks.
              </p>
            </div>

            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  aria-hidden="true"
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  help_center
                </span>
                <span>Does the training adapt to my progress?</span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                Campaigns can include adaptive activities that choose content difficulty based on
                your performance. This means trainees on the same campaign can receive different
                levels of practice suited to their learning needs.
              </p>
            </div>

            <div className="mb-10">
              <h3 className="font-jost flex items-start mb-2 text-[1.25rem] font-medium tracking-wide text-purple sm:items-center sm:text-[1.6rem]">
                <span
                  aria-hidden="true"
                  className="material-icons-sharp text-purple mr-2"
                  style={{ fontSize: '2rem' }}
                >
                  help_center
                </span>
                <span>What results can I see?</span>
              </h3>
              <p className="text-dark-pink font-overpass font-regular tracking-wide text-left text-base sm:text-lg sm:text-justify">
                Trainees can review their own campaign progress and quiz results. Organisation
                administrators can also view completion, quiz performance, and phishing simulation
                interactions for their trainees to plan follow-up training.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutSection;

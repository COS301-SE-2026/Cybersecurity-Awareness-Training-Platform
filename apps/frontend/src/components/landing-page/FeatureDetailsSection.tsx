function FeatureDetailsSection() {
  return (
    <section className="bg-faint-purple">
      <div className="py-8 px-4 mx-auto max-w-screen-xl text-left sm:px-6 lg:py-16">
        <h2 className="font-jost mb-8 text-4xl font-semibold tracking-regular text-dark-pink sm:mb-12 sm:text-6xl">
          Training That Goes Further
        </h2>

        <div className="space-y-8 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-12 md:space-y-0">
          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                assignment
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-jost font-medium text-deep-purple sm:text-3xl">
              Campaign Management
            </h3>
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Bring training documents, quizzes, and simulated inboxes together in campaigns. Assign
              trainees, schedule phishing emails, and use AI to draft editable content and campaign
              proposals for administrators to review.
            </p>
          </div>

          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                trending_up
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-jost font-medium text-deep-purple sm:text-3xl">
              Adaptive Learning
            </h3>
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Give learners practice suited to their progress. Campaigns can include adaptive
              activities that select content difficulty based on trainee performance, helping people
              build confidence and tackle more challenging material.
            </p>
          </div>

          <div>
            <div className="flex justify-left items-center mb-4 w-16 h-16">
              <span
                aria-hidden="true"
                className="material-icons-sharp text-purple"
                style={{ fontSize: '3rem' }}
              >
                insights
              </span>
            </div>
            <h3 className="mb-2 text-2xl font-jost font-medium text-deep-purple sm:text-3xl">
              Progress & Insights
            </h3>
            <p className="font-overpass font-medium text-base text-left text-dark-pink max-w-[22rem] sm:text-lg">
              Trainees can review their progress and quiz results. Organisation administrators can
              track campaign completion, quiz performance, and phishing interactions to see where
              follow-up training could help.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureDetailsSection;

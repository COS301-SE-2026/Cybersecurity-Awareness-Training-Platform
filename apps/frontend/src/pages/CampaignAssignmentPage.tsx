import AppLayout from '../components/layout/AppLayout';

function CampaignAssignmentPage() {
  return (
    <AppLayout
      contentStyle={{
        //backgroundColor: '#F3F4F6',
        backgroundColor: 'white',
      }}
    >
      <div>
        {/* HEADING  and SUB-HEADING */}
        <div
          style={{
            padding: '1.4rem',
            boxSizing: 'border-box',
            flexShrink: 0,
            paddingBottom: '0.8rem',
          }}
        >
          <h1
            style={{
              margin: 0,
              marginBottom: '0.8rem',
              fontWeight: 500,
              fontSize: '3.8rem',
              lineHeight: 1,
              fontFamily: 'Jost',
              color: 'rgb(132, 25, 255)',
            }}
          >
            Campaign Assignment
          </h1>

          <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
            Sub-heading...
          </p>
        </div>

        <div className="px-6 pb-6"></div>
      </div>
    </AppLayout>
  );
}

export default CampaignAssignmentPage;

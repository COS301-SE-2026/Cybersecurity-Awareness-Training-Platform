import AppLayout from '../components/layout/AppLayout';

function OrganisationSecuritySettings() {
  return (
    <AppLayout
      contentStyle={{
        backgroundColor: '#F3F4F6',
      }}
    >
      {/* HEADING */}
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '0.8rem',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            marginBottom: '0.8  rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            // color: 'white',
            color: 'rgb(132, 25, 255)',
            fontFamily: 'Jost',
          }}
        >
          Organisation Security Settings
        </h1>

        {/* SUB-HEADING */}
        <p className="font-regular tracking-wider text-[1.3rem] font-justify font-jost text-gray-500 mb-4">
          Configure organisation-wide security policies for all users.
        </p>
      </div>
    </AppLayout>
  );
}

export default OrganisationSecuritySettings;

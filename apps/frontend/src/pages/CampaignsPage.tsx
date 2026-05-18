import AppLayout from '../components/layout/AppLayout';

import CampaignAccordion from '../components/ui/CampaignAccordion';

import TrainingPartAccordion from '../components/ui/TrainingPartAccordion';

import TrainingActionRow from '../components/ui/TrainingActionRow';
import CampaignActionRow from '../components/ui/CampaignActionRow';

function CampaignsPage() {
  return (
    <AppLayout>
      <div
        style={{
          padding: '1.4rem',
          paddingBottom: '2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          userSelect: 'none',
        }}
      >
        {/* HEADING */}

        <h1
          style={{
            margin: 0,
            marginBottom: '0.5rem',
            fontSize: '3.8rem',
            fontWeight: 500,
            lineHeight: 1,
            color: 'white',
            fontFamily: 'Jost',
          }}
        >
          Campaigns
        </h1>

        {/* CAMPAIGN 1 */}

        <CampaignAccordion
          title="Campaign 1"
          subtitle="Phishing"
          status="NOT STARTED"
          accentColor="#00FFA6"
        >
          <TrainingPartAccordion title="Part 1: Introduction to Phishing" status="NOT STARTED">
            <TrainingActionRow label="Learn" status="NOT STARTED" />

            <TrainingActionRow label="Quiz" status="COMPLETE LEARN FIRST" disabled />
          </TrainingPartAccordion>

          <TrainingPartAccordion title="Part 2: Spotting Suspicious Emails" status="NOT STARTED">
            <TrainingActionRow label="Learn" status="NOT STARTED" />

            <TrainingActionRow label="Quiz" status="COMPLETE LEARN FIRST" disabled />
          </TrainingPartAccordion>
        </CampaignAccordion>

        {/* CAMPAIGN 2 */}

        <CampaignAccordion
          title="Campaign 2"
          subtitle="Password Security"
          status="STARTED"
          accentColor="#FF00D4"
        >
          <TrainingPartAccordion title="Part 1: What is Password Security?" status="COMPLETED">
            <TrainingActionRow label="Learn" status="COMPLETED" />

            <TrainingActionRow label="Quiz" status="COMPLETED" />
          </TrainingPartAccordion>

          <TrainingPartAccordion title="Part 2: Is your Password Secure?" status="STARTED">
            <TrainingActionRow label="Learn" status="STARTED" />

            <TrainingActionRow label="Quiz" status="COMPLETE LEARN FIRST" disabled />
          </TrainingPartAccordion>

          <CampaignActionRow
            title="Password Security Simulation"
            status="COMPLETE ALL PARTS FIRST"
            disabled
          />

          <CampaignActionRow title="Final Quiz" status="COMPLETE ALL PARTS FIRST" disabled />
        </CampaignAccordion>
      </div>
    </AppLayout>
  );
}

export default CampaignsPage;

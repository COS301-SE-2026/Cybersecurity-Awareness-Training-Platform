import { SYSTEM_LINK_MARKER, type OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { EmailBuilder } from './EmailBuilder';
import { createEmptyOrganisationEmailDraft } from './emailDraft';

function Harness({ initial = createEmptyOrganisationEmailDraft(), disabled = false }) {
  const [draft, setDraft] = useState(initial);
  return (
    <>
      <EmailBuilder value={draft} onChange={setDraft} disabled={disabled} />
      <output data-testid="draft-value">{JSON.stringify(draft)}</output>
    </>
  );
}

function currentDraft(): OrganisationEmailDraftInput {
  return JSON.parse(
    screen.getByTestId('draft-value').textContent ?? '',
  ) as OrganisationEmailDraftInput;
}

function portalDraft(): OrganisationEmailDraftInput {
  return {
    ...createEmptyOrganisationEmailDraft(),
    bodyHtml: `<p>${SYSTEM_LINK_MARKER}</p>`,
    link: { anchorText: 'Review account' },
    expectedClassification: 'PHISHING',
    portalTemplateId: 'GENERIC_ACCOUNT_LOGIN_V1',
  };
}

describe('EmailBuilder', () => {
  it('renders a null preview as an empty controlled field', () => {
    render(<Harness initial={{ ...createEmptyOrganisationEmailDraft(), preview: null }} />);

    expect(screen.getByLabelText('Preview text')).toHaveValue('');
    expect(currentDraft().preview).toBeNull();
  });

  it('edits every canonical field without exposing destinations, attachments or legacy difficulty values', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Sender label'), 'Security Team');
    await user.type(screen.getByLabelText('Sender address'), 'security@example.test');
    await user.type(screen.getByLabelText('Subject'), 'Review access');
    await user.type(screen.getByLabelText('Preview text'), 'A review is pending');
    await user.selectOptions(screen.getByLabelText('Expected classification'), 'SUSPICIOUS');
    await user.selectOptions(screen.getByLabelText('Difficulty'), 'HARD');
    await user.click(screen.getByLabelText('Links, domains and sender verification'));

    expect(currentDraft()).toMatchObject({
      senderLabel: 'Security Team',
      senderAddress: 'security@example.test',
      subject: 'Review access',
      preview: 'A review is pending',
      expectedClassification: 'SUSPICIOUS',
      difficultyLevel: 'HARD',
      categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
    });
    expect(screen.queryByLabelText(/destination|url|attachment/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /beginner|intermediate|advanced|adaptive/i }),
    ).not.toBeInTheDocument();
  });

  it('adds, edits and removes accessible red flags', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Add red flag' }));
    const redFlag = screen.getByRole('region', { name: 'Red flag 1' });
    await user.selectOptions(within(redFlag).getByLabelText('Type'), 'LINK');
    await user.selectOptions(within(redFlag).getByLabelText('Severity'), 'HIGH');
    await user.type(within(redFlag).getByLabelText('Label'), 'Unexpected link');
    await user.type(within(redFlag).getByLabelText('Description'), 'The request was unexpected');

    expect(currentDraft().redFlags).toEqual([
      {
        redFlagType: 'LINK',
        severity: 'HIGH',
        label: 'Unexpected link',
        description: 'The request was unexpected',
      },
    ]);

    await user.click(within(redFlag).getByRole('button', { name: 'Remove red flag 1' }));
    expect(currentDraft().redFlags).toEqual([]);
  });

  it('inserts markers at the body cursor and keeps the managed-link shape consistent', async () => {
    const user = userEvent.setup();
    render(
      <Harness initial={{ ...createEmptyOrganisationEmailDraft(), bodyHtml: '<p>Hello </p>' }} />,
    );
    const body = screen.getByLabelText('Safe HTML body') as HTMLTextAreaElement;
    body.focus();
    body.setSelectionRange(9, 9);

    await user.click(screen.getByRole('button', { name: 'First name' }));
    expect(currentDraft().bodyHtml).toBe('<p>Hello {{FIRST_NAME}}</p>');

    await user.click(screen.getByRole('button', { name: 'Managed link' }));
    expect(currentDraft().bodyHtml).toContain('{{SYSTEM_LINK}}');
    expect(currentDraft().link).toEqual({ anchorText: '' });
    await user.type(screen.getByLabelText('Managed-link anchor text'), 'Review securely');
    expect(currentDraft().link).toEqual({ anchorText: 'Review securely' });
  });

  it('clears the portal selection when classification changes to safe', async () => {
    const user = userEvent.setup();
    render(<Harness initial={portalDraft()} />);

    await user.selectOptions(screen.getByLabelText('Expected classification'), 'SAFE');

    expect(currentDraft().portalTemplateId).toBeNull();
    expect(currentDraft().link).toEqual({ anchorText: 'Review account' });
  });

  it('clears the portal selection when the managed-link marker is removed', async () => {
    const user = userEvent.setup();
    render(<Harness initial={portalDraft()} />);

    await user.clear(screen.getByLabelText('Safe HTML body'));

    expect(currentDraft().portalTemplateId).toBeNull();
    expect(currentDraft().link).toBeNull();
  });

  it('shows the fixed portal selector only when the email is eligible', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByLabelText('Phishing portal')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Expected classification'), 'SUSPICIOUS');
    expect(
      screen.getByText('Insert the managed-link marker to enable a phishing portal.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Managed link' }));
    const selector = screen.getByLabelText('Phishing portal');
    expect(selector).toBeInTheDocument();
    expect(
      screen.queryByText('Insert the managed-link marker to enable a phishing portal.'),
    ).not.toBeInTheDocument();

    await user.selectOptions(selector, 'GENERIC_DOCUMENT_ACCESS_V1');
    expect(currentDraft().portalTemplateId).toBe('GENERIC_DOCUMENT_ACCESS_V1');
    expect(screen.getByRole('heading', { name: 'Access shared document' })).toBeInTheDocument();

    await user.selectOptions(selector, '');
    expect(currentDraft().portalTemplateId).toBeNull();
    expect(currentDraft().link).toEqual({ anchorText: '' });
    expect(
      screen.queryByRole('region', { name: 'Selected phishing portal preview' }),
    ).not.toBeInTheDocument();
  });

  it('restores an existing fixed portal selection', () => {
    render(<Harness initial={portalDraft()} />);

    expect(screen.getByLabelText('Phishing portal')).toHaveValue('GENERIC_ACCOUNT_LOGIN_V1');
    const portalPreview = screen.getByRole('region', {
      name: 'Selected phishing portal preview',
    });
    expect(
      within(portalPreview).getByRole('heading', { name: 'Sign in to your account' }),
    ).toBeInTheDocument();
    expect(within(portalPreview).getByText('Email address or username')).toBeInTheDocument();
    expect(within(portalPreview).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(portalPreview).queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders escaped samples, strips malicious resources and makes the managed link non-navigating', () => {
    const initial: OrganisationEmailDraftInput = {
      ...createEmptyOrganisationEmailDraft(),
      senderLabel: 'Security',
      bodyHtml:
        '<p onclick="alert(1)">Hello {{FIRST_NAME}} {{SURNAME}} at {{EMAIL_ADDRESS}}. {{SYSTEM_LINK}}</p><img src="https://evil.example/a.png"><script>alert(1)</script><a href="https://evil.example">External</a>',
      link: { anchorText: '<Review now>' },
    };
    render(<Harness initial={initial} />);

    expect(screen.getByText(/Alex Smith at alex\.smith@example\.test/)).toBeInTheDocument();
    expect(document.querySelector('.email-preview img')).not.toBeInTheDocument();
    expect(document.querySelector('.email-preview script')).not.toBeInTheDocument();
    expect(document.querySelector('.email-preview a')).not.toBeInTheDocument();
    expect(document.querySelector('.email-preview [onclick]')).not.toBeInTheDocument();
    const managedLink = document.querySelector('.email-preview-managed-link');
    expect(managedLink).toHaveTextContent('<Review now>');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(managedLink?.dispatchEvent(click)).toBe(false);
    expect(click.defaultPrevented).toBe(true);
  });

  it('disables all editing controls in read-only mode', () => {
    render(<Harness disabled />);

    expect(screen.getByLabelText('Sender label')).toBeDisabled();
    expect(screen.getByLabelText('Safe HTML body')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Add red flag' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First name' })).toBeDisabled();
  });
});

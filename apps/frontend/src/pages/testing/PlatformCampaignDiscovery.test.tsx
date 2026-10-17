import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  GetPlatformCampaignsResponseDto,
  PlatformCampaignSummaryDto,
} from '@insightful-phish/shared';
import { beforeEach, expect, it, vi } from 'vitest';
import PlatformCampaignDiscovery from '../PlatformCampaignDiscovery';
import { discoverPlatformCampaigns, enrolPlatformCampaign } from '../../lib/campaignsApi';
import { createDeferred } from '../../testing/render';

vi.mock('../../lib/campaignsApi', () => ({
  discoverPlatformCampaigns: vi.fn(),
  enrolPlatformCampaign: vi.fn(),
}));

const campaigns: PlatformCampaignSummaryDto[] = Array.from({ length: 11 }, (_, index) => ({
  campaignId: `campaign-${index}`,
  name: `Available campaign ${index}`,
  campaignType: 'PREMADE_GENERAL',
  difficultyLevel: 'EASY',
  status: 'ACTIVE',
  isEnrolled: false,
  progressStatus: null,
  eligibility: { canView: true, canProgress: true, reason: 'AVAILABLE' },
}));

function response(page: number, total = 11): GetPlatformCampaignsResponseDto {
  const totalPages = Math.ceil(total / 10);
  return {
    items: campaigns.slice(0, total).slice((page - 1) * 10, page * 10),
    pagination: {
      page,
      limit: 10,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

beforeEach(() => vi.resetAllMocks());

it.each([false, true])(
  'corrects page two after enrolment, including opening failure: %s',
  async (openingFails) => {
    let total = 11;
    const correctedPage = createDeferred<GetPlatformCampaignsResponseDto>();
    vi.mocked(discoverPlatformCampaigns).mockImplementation(async ({ page }) => {
      if (total === 10 && page === 1) return correctedPage.promise;
      return response(page, total);
    });
    vi.mocked(enrolPlatformCampaign).mockImplementation(async () => {
      total = 10;
      return { ...campaigns[10], progressStatus: 'NOT_STARTED' };
    });
    const onOpenCampaign = openingFails
      ? vi.fn().mockRejectedValue(new Error('Details unavailable'))
      : vi.fn().mockResolvedValue(undefined);
    render(<PlatformCampaignDiscovery onOpenCampaign={onOpenCampaign} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }));
    const campaign = await screen.findByRole('button', {
      name: /Available campaign 10/,
      expanded: false,
    });
    fireEvent.click(campaign);
    fireEvent.click(screen.getByRole('button', { name: /Enrol.*Available campaign 10/ }));

    await waitFor(() =>
      expect(discoverPlatformCampaigns).toHaveBeenLastCalledWith({ page: 1, limit: 10 }),
    );
    expect(screen.queryByText('NO PLATFORM CAMPAIGNS ARE AVAILABLE RIGHT NOW.')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('LOADING PLATFORM CAMPAIGNS');
    await act(async () => correctedPage.resolve(response(1, 10)));
    expect(
      await screen.findByRole('button', { name: /Available campaign 0/, expanded: false }),
    ).toBeVisible();
    expect(enrolPlatformCampaign).toHaveBeenCalledTimes(1);
    if (openingFails)
      expect(
        screen.getByText(/YOU ARE ENROLLED, BUT THE CAMPAIGN COULD NOT BE OPENED/),
      ).toBeVisible();
  },
);

it('corrects an invalid page during refresh and preserves a genuinely empty result', async () => {
  let total = 11;
  vi.mocked(discoverPlatformCampaigns).mockImplementation(async ({ page }) =>
    response(page, total),
  );
  render(<PlatformCampaignDiscovery onOpenCampaign={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }));
  await screen.findByRole('button', { name: /Available campaign 10/, expanded: false });
  total = 0;
  fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }));
  expect(await screen.findByText('NO PLATFORM CAMPAIGNS ARE AVAILABLE RIGHT NOW.')).toBeVisible();
  expect(discoverPlatformCampaigns).toHaveBeenLastCalledWith({ page: 1, limit: 10 });
});

it('keeps an available campaign after enrolment fails', async () => {
  vi.mocked(discoverPlatformCampaigns).mockResolvedValue(response(1, 1));
  vi.mocked(enrolPlatformCampaign).mockRejectedValue(new Error('Enrolment failed'));
  render(<PlatformCampaignDiscovery onOpenCampaign={vi.fn()} />);
  fireEvent.click(
    await screen.findByRole('button', { name: /Available campaign 0/, expanded: false }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Enrol.*Available campaign 0/ }));
  expect(await screen.findByText('REQUEST FAILED. PLEASE TRY AGAIN.')).toBeVisible();
  expect(screen.getByRole('button', { name: /Enrol.*Available campaign 0/ })).toBeEnabled();
  expect(discoverPlatformCampaigns).toHaveBeenCalledTimes(1);
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import CampaignAssignmentPagination from '../campaign-assignment/CampaignAssignmentPagination';

function Pagination({ totalPages }: Readonly<{ totalPages: number }>) {
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <>
      <output aria-label="Current page">{currentPage}</output>
      <CampaignAssignmentPagination
        className=""
        ariaLabel="Campaign assignment pagination"
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={false}
        setCurrentPage={setCurrentPage}
      />
    </>
  );
}

describe('CampaignAssignmentPagination', () => {
  it.each([0, 1])('disables pagination when totalPages is %i', (totalPages) => {
    render(<Pagination totalPages={totalPages} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByLabelText('Current page')).toHaveTextContent('1');
  });

  it('keeps page changes within the available one-based range', async () => {
    const user = userEvent.setup();
    render(<Pagination totalPages={2} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Current page')).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByLabelText('Current page')).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });
});

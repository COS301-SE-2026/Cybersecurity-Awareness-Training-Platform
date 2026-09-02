import type { CampaignAssignmentOptionsQueryDto } from '@insightful-phish/shared';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';

type PaginatedOptionsResponse<T> = Readonly<{
  items: T[];
  pagination: Readonly<{
    totalPages: number;
  }>;
}>;

type CampaignAssignmentOptionsLoader<T> = (
  organisationId: string,
  query: CampaignAssignmentOptionsQueryDto,
) => Promise<PaginatedOptionsResponse<T>>;

type UseCampaignAssignmentOptionsParameters<T> = Readonly<{
  loadOptions: CampaignAssignmentOptionsLoader<T>;
  loadErrorMessage: string;
}>;

function useCampaignAssignmentOptions<T>({
  loadOptions,
  loadErrorMessage,
}: UseCampaignAssignmentOptionsParameters<T>) {
  const { authContext } = useAuth();
  const organisationId = authContext?.organisation?.id ?? null;
  const [loadedItems, setLoadedItems] = useState<T[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestIsLoading, setRequestIsLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const hasOrganisationId = organisationId !== null && organisationId.length > 0;
  const items = hasOrganisationId === true ? loadedItems : [];
  const isLoading = hasOrganisationId === true ? requestIsLoading : false;
  const error =
    hasOrganisationId === true ? requestError : 'Unable To Determine The Current Organisation';

  useEffect(() => {
    if (organisationId === null || organisationId.length === 0) {
      return;
    }

    const currentOrganisationId = organisationId;
    let isCurrent = true;

    async function loadItems() {
      setRequestIsLoading(true);
      setRequestError(null);

      try {
        const trimmedSearchTerm = searchTerm.trim();
        const response = await loadOptions(currentOrganisationId, {
          page: currentPage,
          limit: 3,
          ...(trimmedSearchTerm.length > 0 ? { search: trimmedSearchTerm } : {}),
        });

        if (isCurrent !== true) {
          return;
        }

        setLoadedItems(response.items);
        setTotalPages(response.pagination.totalPages);
      } catch {
        if (isCurrent !== true) {
          return;
        }

        setLoadedItems([]);
        setRequestError(loadErrorMessage);
      } finally {
        if (isCurrent === true) {
          setRequestIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isCurrent = false;
    };
  }, [currentPage, loadErrorMessage, loadOptions, organisationId, searchTerm]);

  return {
    items,
    searchTerm,
    setSearchTerm,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
  };
}

export default useCampaignAssignmentOptions;

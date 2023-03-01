import { Alert } from "@aivenio/aquarium";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pagination } from "src/app/components/Pagination";
import { ApprovalsLayout } from "src/app/features/approvals/components/ApprovalsLayout";
import RequestDetailsModal from "src/app/features/approvals/components/RequestDetailsModal";
import RequestDeclineModal from "src/app/features/approvals/components/RequestDeclineModal";
import DetailsModalContent from "src/app/features/approvals/topics/components/DetailsModalContent";
import { TopicApprovalsTable } from "src/app/features/approvals/topics/components/TopicApprovalsTable";
import useTableFilters from "src/app/features/approvals/topics/hooks/useTableFilters";
import {
  approveTopicRequest,
  getTopicRequestsForApprover,
  declineTopicRequest,
} from "src/domain/topic/topic-api";
import { HTTPError } from "src/services/api";

function TopicApprovals() {
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = searchParams.get("page")
    ? Number(searchParams.get("page"))
    : 1;

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    topicId: number | null;
  }>({
    isOpen: false,
    topicId: null,
  });
  const [declineModal, setDeclineModal] = useState<{
    isOpen: boolean;
    topicId: number | null;
  }>({
    isOpen: false,
    topicId: null,
  });

  const [errorMessage, setErrorMessage] = useState("");

  const handleChangePage = (activePage: number) => {
    searchParams.set("page", activePage.toString());
    setSearchParams(searchParams);
  };

  const { environment, status, team, topic, filters } = useTableFilters();

  const {
    data: topicRequests,
    isLoading: topicRequestsLoading,
    isError: topicRequestsIsError,
    error: topicRequestsError,
  } = useQuery({
    queryKey: [
      "topicRequestsForApprover",
      currentPage,
      environment,
      status,
      team,
      topic,
    ],
    queryFn: () =>
      getTopicRequestsForApprover({
        pageNo: String(currentPage),
        env: environment,
        requestStatus: status,
        teamId: team === "ALL" ? undefined : Number(team),
        search: topic,
      }),
    keepPreviousData: true,
  });

  const { isLoading: approveIsLoading, mutate: approveRequest } = useMutation({
    mutationFn: approveTopicRequest,
    onSuccess: (responses) => {
      // This mutation is used on a single request, so we always want the first response in the array
      const response = responses[0];

      if (response.result !== "success") {
        return setErrorMessage(
          response.message || response.result || "Unexpected error"
        );
      }
      setErrorMessage("");
      setDetailsModal({ isOpen: false, topicId: null });

      // If approved request is last in the page, go back to previous page
      // This avoids staying on a non-existent page of entries, which makes the table bug hard
      // With pagination being 0 of 0, and clicking Previous button sets active page at -1
      // We also do not need to invalidate the query, as the activePage does not exist any more
      // And there is no need to update anything on it
      if (
        topicRequests?.entries.length === 1 &&
        topicRequests?.currentPage > 1
      ) {
        return handleChangePage(currentPage - 1);
      }

      // We need to refetch all aclrequests queries to keep Table state in sync
      queryClient.refetchQueries(["topicRequestsForApprover"]);
    },
    onError: (error: HTTPError) => {
      const errorMessage = Array.isArray(error.data)
        ? error.data[0].message || error.data[0].result
        : "Unexpected error";

      setErrorMessage(errorMessage);
    },
  });

  const { isLoading: declineIsLoading, mutate: declineRequest } = useMutation({
    mutationFn: declineTopicRequest,
    onSuccess: (responses) => {
      // This mutation is used on a single request, so we always want the first response in the array
      const response = responses[0];

      if (response.result !== "success") {
        return setErrorMessage(
          response.message || response.result || "Unexpected error"
        );
      }
      setErrorMessage("");
      setDeclineModal({ isOpen: false, topicId: null });

      // If approved request is last in the page, go back to previous page
      // This avoids staying on a non-existent page of entries, which makes the table bug hard
      // With pagination being 0 of 0, and clicking Previous button sets active page at -1
      // We also do not need to invalidate the query, as the activePage does not exist any more
      // And there is no need to update anything on it
      if (
        topicRequests?.entries.length === 1 &&
        topicRequests?.currentPage > 1
      ) {
        return handleChangePage(currentPage - 1);
      }

      // We need to refetch all aclrequests queries to keep Table state in sync
      queryClient.refetchQueries(["topicRequestsForApprover"]);
    },
    onError: (error: HTTPError) => {
      const errorMessage = Array.isArray(error.data)
        ? error.data[0].message || error.data[0].result
        : "Unexpected error";

      setErrorMessage(errorMessage);
    },
  });

  const setCurrentPage = (page: number) => {
    searchParams.set("page", page.toString());
    setSearchParams(searchParams);
  };

  const table = (
    <TopicApprovalsTable
      requests={topicRequests?.entries || []}
      setDetailsModal={setDetailsModal}
      setDeclineModal={setDeclineModal}
      approveRequest={approveRequest}
      quickActionLoading={approveIsLoading || declineIsLoading}
    />
  );
  const pagination =
    topicRequests?.totalPages && topicRequests.totalPages > 1 ? (
      <Pagination
        activePage={topicRequests.currentPage}
        totalPages={topicRequests?.totalPages}
        setActivePage={setCurrentPage}
      />
    ) : undefined;

  const selectedTopicRequest = topicRequests?.entries.find(
    (request) => request.topicid === Number(detailsModal.topicId)
  );
  return (
    <>
      {detailsModal.isOpen && (
        <RequestDetailsModal
          onClose={() => setDetailsModal({ isOpen: false, topicId: null })}
          onApprove={() => {
            if (detailsModal.topicId === null) {
              setErrorMessage("topicId is null, it should be a number");
              return;
            }
            approveRequest({
              requestEntityType: "TOPIC",
              reqIds: [String(detailsModal.topicId)],
            });
          }}
          onDecline={() => {
            setDetailsModal({ isOpen: false, topicId: null });
            setDeclineModal({ isOpen: true, topicId: detailsModal.topicId });
          }}
          isLoading={approveIsLoading || declineIsLoading}
          disabledActions={
            selectedTopicRequest?.requestStatus !== "CREATED" ||
            approveIsLoading ||
            declineIsLoading
          }
        >
          <DetailsModalContent topicRequest={selectedTopicRequest} />
        </RequestDetailsModal>
      )}
      {declineModal.isOpen && (
        <RequestDeclineModal
          onClose={() => setDeclineModal({ isOpen: false, topicId: null })}
          onCancel={() => setDeclineModal({ isOpen: false, topicId: null })}
          onSubmit={(message: string) => {
            if (declineModal.topicId === null) {
              setErrorMessage("topicId is null, it should be a number");
              return;
            }
            declineRequest({
              requestEntityType: "TOPIC",
              reqIds: [String(declineModal.topicId)],
              reason: message,
            });
          }}
          isLoading={declineIsLoading || approveIsLoading}
        />
      )}
      {errorMessage !== "" && (
        <div role="alert">
          <Alert type="warning">{errorMessage}</Alert>
        </div>
      )}
      <ApprovalsLayout
        filters={filters}
        table={table}
        pagination={pagination}
        isLoading={topicRequestsLoading}
        isErrorLoading={topicRequestsIsError}
        errorMessage={topicRequestsError}
      />
    </>
  );
}

export default TopicApprovals;

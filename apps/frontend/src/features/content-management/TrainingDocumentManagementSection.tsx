import { Link } from 'react-router-dom';

type TrainingDocumentManagementSectionProps = Readonly<{
  organisationId: string;
  canManage: boolean;
}>;

export function TrainingDocumentManagementSection({
  organisationId,
  canManage,
}: TrainingDocumentManagementSectionProps) {
  const createPath = `/organisations/${encodeURIComponent(organisationId)}/training-documents/new`;

  return (
    <section className="training-document-management" aria-labelledby="training-documents-heading">
      <div className="training-document-management__create">
        <h2 id="training-documents-heading">Create and Activate a Training Document</h2>
        {canManage === true ? (
          <Link className="training-document-management__create-button" to={createPath}>
            Create
          </Link>
        ) : null}
      </div>
      <h2 className="training-document-management__list-heading">All Training Documents</h2>
    </section>
  );
}

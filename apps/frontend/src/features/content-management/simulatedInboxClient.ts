import {
  activateSimulatedInbox,
  addAuthoredEmailToSimulatedInbox,
  addLibraryEmailToSimulatedInbox,
  copySimulatedInbox,
  createSimulatedInboxDraft,
  getOrganisationEmails,
  getSimulatedInbox,
  getSimulatedInboxes,
  removeSimulatedInboxEmail,
  reorderSimulatedInboxEmails,
  updateSimulatedInboxDraft,
  updateSimulatedInboxEmail,
} from '../../lib/campaignsApi';

export type SimulatedInboxManagementClient = Readonly<{
  list: typeof getSimulatedInboxes;
  create: typeof createSimulatedInboxDraft;
  get: typeof getSimulatedInbox;
  update: typeof updateSimulatedInboxDraft;
  addAuthoredEmail: typeof addAuthoredEmailToSimulatedInbox;
  addLibraryEmail: typeof addLibraryEmailToSimulatedInbox;
  listLibraryEmails: typeof getOrganisationEmails;
  updateEmail: typeof updateSimulatedInboxEmail;
  removeEmail: typeof removeSimulatedInboxEmail;
  reorderEmails: typeof reorderSimulatedInboxEmails;
  activate: typeof activateSimulatedInbox;
  copy: typeof copySimulatedInbox;
}>;

export const simulatedInboxManagementClient: SimulatedInboxManagementClient = {
  list: getSimulatedInboxes,
  create: createSimulatedInboxDraft,
  get: getSimulatedInbox,
  update: updateSimulatedInboxDraft,
  addAuthoredEmail: addAuthoredEmailToSimulatedInbox,
  addLibraryEmail: addLibraryEmailToSimulatedInbox,
  listLibraryEmails: getOrganisationEmails,
  updateEmail: updateSimulatedInboxEmail,
  removeEmail: removeSimulatedInboxEmail,
  reorderEmails: reorderSimulatedInboxEmails,
  activate: activateSimulatedInbox,
  copy: copySimulatedInbox,
};

/**
 * AdyaGo ERP - Centralized iDempiere Configuration
 * Modeled after /config/idempiere.php (Laravel) for fullstack architecture.
 *
 * All static ERP IDs, default values, doc types, workflow definitions,
 * status mappings, and API endpoints are consolidated here.
 * If any ERP configuration changes in the future, simply update the values here
 * or set the corresponding VITE_* environment variables.
 */

export const idempiereConfig = {
  // API Endpoints
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  },

  // Storage Keys for authentication and session persistence
  storage: {
    sessionKey: 'adyago_session',
    legacySessionKey: 'factoryhub_session',
    tempAuthKey: 'adyago_temp_auth',
    legacyTempAuthKey: 'factoryhub_temp_auth',
  },

  // Global Tenant / Client Defaults
  tenant: {
    clientId: Number(import.meta.env.VITE_IDEMPIERE_CLIENT_ID || 1000000),
    orgId: Number(import.meta.env.VITE_IDEMPIERE_ORG_ID || 0),
    name: import.meta.env.VITE_IDEMPIERE_TENANT_NAME || 'PT. Adyawinsa Plastics Industry',
  },

  // Module Configuration: Purchase Requisition (create-pr)
  createPr: {
    docTypes: {
      purchaseRequisition: Number(import.meta.env.VITE_IDEMPIERE_DOC_TYPE_PR_ID || 1000018),
    },
    defaults: {
      documentStatusLabel: 'Draft',
      pricelistId: Number(import.meta.env.VITE_IDEMPIERE_PR_DEFAULT_PRICELIST_ID || 1000208),
      priorityRule: '5', // 5 = Medium
    },
    statuses: {
      completed: ['CO', 'CL'],
      draft: ['DR', 'IN'],
      inProgress: ['IP'],
      readOnly: ['CO', 'CL', 'VO', 'RE'],
      printable: ['IP', 'CO'],
      lineEditable: ['DR', 'IN', 'IP'],
      actionBlocked: ['CL', 'VO', 'RE'],
      filterOptions: [
        { value: '', label: 'All Statuses' },
        { value: 'DR', label: 'Drafted' },
        { value: 'IP', label: 'In Progress' },
        { value: 'CO', label: 'Completed' },
        { value: 'CL', label: 'Closed' },
        { value: 'VO', label: 'Voided' },
        { value: 'RE', label: 'Reversed' },
      ],
      labels: {
        DR: 'Draft',
        IN: 'Draft',
        IP: 'In Progress',
        CO: 'Completed',
        CL: 'Closed',
        VO: 'Voided',
        RE: 'Reversed',
      },
    },
    limits: {
      listPerPage: 10,
      lineDefaultPerPage: 10,
      linePerPageOptions: [10, 25, 50, 100],
      productsPerPage: 25,
      lineIncrement: 10,
    },
    workflow: {
      allowedActions: ['CO', 'PR', 'VO', 'RE'],
      completeAction: 'CO',
      prepareAction: 'PR',
      voidAction: 'VO',
      reactivateAction: 'RE',
      actionLabels: {
        CO: 'Complete',
        PR: 'Prepare',
        VO: 'Void',
        RE: 'Re-Active',
        CL: 'Close',
      },
      confirmationMessages: {
        CO: 'Are you sure you want to complete this document?',
        PR: 'Are you sure you want to prepare this document?',
        VO: 'Are you sure you want to void this document? This action cannot be undone!',
        RE: 'Are you sure you want to re-activate this document back to Draft?',
        CL: 'Are you sure you want to close this requisition document?',
      },
    },
  },

  // Module Configuration: Purchase Order (create-po)
  createPo: {
    docTypes: {
      purchaseOrder: Number(import.meta.env.VITE_IDEMPIERE_DOC_TYPE_PO_ID || 1000016),
      baseType: 'POO',
    },
    defaults: {
      isSoTrx: 'N',
      deliveryViaRule: 'P',
      priorityRule: '5', // 5 = Medium
      currencyId: Number(import.meta.env.VITE_IDEMPIERE_PO_CURRENCY_ID || 303),
      pricelistId: Number(import.meta.env.VITE_IDEMPIERE_PO_PRICELIST_ID || 1000208),
      paymentRule: 'P',
      paymentTermId: Number(import.meta.env.VITE_IDEMPIERE_PO_PAYMENT_TERM_ID || 1000007),
      chargeTaxId: Number(import.meta.env.VITE_IDEMPIERE_PO_CHARGE_TAX_ID || 1000001),
      documentStatusLabel: 'Draft',
    },
    statuses: {
      completed: ['CO', 'CL'],
      draft: ['DR', 'IN'],
      inProgress: ['IP'],
      readOnly: ['CO', 'CL', 'VO', 'RE'],
      printable: ['IP', 'CO', 'DR'],
      lineEditable: ['DR', 'IN', 'IP'],
      actionBlocked: ['CL', 'VO', 'RE'],
      filterOptions: [
        { value: '', label: 'All Statuses' },
        { value: 'DR', label: 'Drafted' },
        { value: 'IP', label: 'In Progress' },
        { value: 'CO', label: 'Completed' },
        { value: 'CL', label: 'Closed' },
        { value: 'VO', label: 'Voided' },
        { value: 'RE', label: 'Reversed' },
      ],
      labels: {
        DR: 'Draft',
        IN: 'Draft',
        IP: 'In Progress',
        CO: 'Completed',
        CL: 'Closed',
        VO: 'Voided',
        RE: 'Reversed',
      },
    },
    limits: {
      listPerPage: 10,
      lineDefaultPerPage: 10,
      linePerPageOptions: [10, 25, 50, 100],
      productsPerPage: 25,
      vendorSearch: 1500,
      lineIncrement: 10,
    },
    workflow: {
      allowedActions: ['CO', 'PR', 'VO', 'CL', 'RE'],
      completeAction: 'CO',
      prepareAction: 'PR',
      voidAction: 'VO',
      closeAction: 'CL',
      reactivateAction: 'RE',
      actionLabels: {
        CO: 'Complete',
        PR: 'Prepare',
        VO: 'Void',
        CL: 'Close',
        RE: 'Re-Activate',
      },
      confirmationMessages: {
        CO: 'Are you sure you want to complete this purchase order?',
        PR: 'Are you sure you want to prepare this purchase order?',
        VO: 'Are you sure you want to void this purchase order? This action cannot be undone!',
        CL: 'Are you sure you want to close this purchase order?',
        RE: 'Are you sure you want to re-activate this purchase order back to In Progress?',
      },
    },
  },
};

export default idempiereConfig;


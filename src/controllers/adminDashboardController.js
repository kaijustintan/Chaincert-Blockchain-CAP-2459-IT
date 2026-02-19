// controllers/adminDashboardController.js

const couchdbService = require('../couchDB_service');

/*
  Function Name: getAllIssuerCredentialsAdminController

  Technical:
  Express controller na nag-e-expose ng HTTP endpoint para sa
  aggregated credentials across all issuers. Naka-wrap lang siya
  sa CouchDB helper na getAllIssuerCredentialsAdmin.

  Tropang Ex:
  Ito yung API handler para sa Admin Dashboard:
  - Chine-check muna kung admin ka.
  - Kinukuha lahat ng credentials ng lahat ng issuers (optional filters).
  - Ibinabalik sa frontend as JSON.
*/
async function getAllIssuerCredentialsAdminController(req, res) {
  try {
    /* Step 1: Auth / role check

      Technical:
      Requires req.user with role === 'admin'.
      Otherwise, returns 403 Forbidden.

      Tropang Ex:
      Siguraduhin muna na admin talaga yung tumatawag sa endpoint.
    */
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: admin access only'
      });
    }

    /* Step 2: Read optional query filters

      Technical:
      - issuerId: filter for one specific issuer
      - type: 'issued' | 'templates' (or omitted for all)

      Tropang Ex:
      Para ma-filter sa dropdown:
      - Puwede piliin kung isang issuer lang (e.g. DLSU).
      - Puwede piliin kung templates lang o issued lang.
    */
    const issuerId = req.query.issuerId || null;
    const type = req.query.type || null; // 'issued' | 'templates' | null

    /* Step 3: Delegate to CouchDB service

      Technical:
      Calls getAllIssuerCredentialsAdmin({ issuerId, type }) which:
        - Gets all approved issuers
        - Loops each issuer and fetches credentials
        - Applies type/issuer filtering
        - Returns flattened, sorted rows

      Tropang Ex:
      Dito na natin tinatawag yung “master list” logic sa couchDB_service.
    */
    const rows = await couchdbService.getAllIssuerCredentialsAdmin({
      issuerId,
      type
    });

    /* Step 4: Build and send HTTP response

      Technical:
      Wraps the array into a standardized JSON object with:
        - success
        - data
        - count
        - filters used
        - timestamp

      Tropang Ex:
      Ito na yung final payload na babasahin ng Admin Dashboard.
    */
    return res.status(200).json({
      success: true,
      data: rows,
      count: rows.length,
      filters: {
        issuerId: issuerId || null,
        type: type || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in getAllIssuerCredentialsAdminController:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  getAllIssuerCredentialsAdminController
};

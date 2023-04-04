describe('Dashboard', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('Security', () => {
    it('should not be able to access dashboard: unauthenticated', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')

        .url()
        .should('equal', Cypress.config().baseUrl + '/login');
    });

    it('should not be able to access non-owned event dashboard: authenticated', () => {
      cy.login()
        .visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')

        .url()
        .should('equal', Cypress.config().baseUrl + '/');
    });
  });

  context('General', () => {
    beforeEach(() => {
      cy.loginOrganiser();
    });

    it('should have correct number of pages', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .get('button[data-cy=page-number]')
        .should('exist')
        .and('have.length', 2);
    });
    it('should change pages and stop when its the last/first page', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .intercept('GET', '*?page=*_data=routes*')
        .as('dashboardRequests')

        .get('button[data-cy=next-page]')
        .should('exist')

        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'actionId=nextPage')

        .get('button[data-cy=next-page]')
        .should('have.prop', 'disabled')

        .get('button[data-cy=page-number]')
        .first()
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'set-page=0')

        .get('button[data-cy=previous-page]')
        .should('have.prop', 'disabled');
    });

    it('should have correct number of participants', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .intercept('GET', '*?page=*_data=routes*')
        .as('dashboardRequests')

        .get('[data-cy=participant-row]')
        .should('exist')
        .and('have.length', 10)

        .get('button[data-cy=page-number]')
        .eq(1)
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'set-page=1')

        .get('[data-cy=participant-row]')
        .should('exist')
        .and('have.length', 1);
    });

    it('should search participant by name', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .intercept('GET', '*?searched-name=*_data=routes*')
        .as('dashboardRequests')

        .get('[data-cy=search]')
        .should('exist')
        .type('Joaquim Lopes')

        .get('button[data-cy=search-participant]')
        .click()

        .wait('@dashboardRequests')

        .get('[data-cy=participant-row]')
        .should('exist')
        .and('have.length', 3)
        .first()
        .contains('Joaquim Lopes');
    });

    it('should not retrieve results if there is no matching participant name', () => {
      cy.visitAndWaitForHydration('/o/event/MY4bvgxDbMtGv8rbYe5d/dashboard')
        .intercept('GET', '*?searched-name=*_data=routes*')
        .as('dashboardRequests')

        .get('[data-cy=search]')
        .should('exist')
        .type('Joaquim Afonso')

        .get('button[data-cy=search-participant]')
        .click()

        .wait('@dashboardRequests')

        .get('[data-cy=participant-row]')
        .should('not.exist')

        .get('button[data-cy=page-number]')
        .should('not.exist');
    });
  });
});

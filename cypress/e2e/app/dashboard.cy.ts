describe('Dashboard', () => {
  beforeEach(() => {
    cy.task('db:reset');
    cy.loginAdmin();
  });

  context('General', () => {
    it('should have correct number of pages', () => {
      cy.visitAndWaitForHydration('/dashboard/MY4bvgxDbMtGv8rbYe5d')
        .get('button[data-cy=page-number]')
        .should('exist')
        .and('have.length', 2);
    });
    it('should change pages and stop when its the last/first page', () => {
      cy.visitAndWaitForHydration('/dashboard/MY4bvgxDbMtGv8rbYe5d')
        .intercept('GET', '*?page=*_data=routes*')
        .as('dashboardRequests')

        .get('button[data-cy=next-page]')
        .should('exist')

        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'page=1')

        .get('button[data-cy=next-page]')
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'page=1')

        .get('button[data-cy=page-number]')
        .first()
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'page=0')

        .get('button[data-cy=previous-page]')
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'page=0');
    });

    it('should have correct number of participants', () => {
      cy.visitAndWaitForHydration('/dashboard/MY4bvgxDbMtGv8rbYe5d')
        .intercept('GET', '*?page=*_data=routes*')
        .as('dashboardRequests')

        .get('[data-cy=participant-row]')
        .should('exist')
        .and('have.length', 10)

        .get('button[data-cy=page-number]').eq(1)
        .click()
        .wait('@dashboardRequests')

        .url()
        .should('include', 'page=1')

        .get('[data-cy=participant-row]')
        .should('exist')
        .and('have.length', 1);
    });

    it('should search participant by name', () => {
      cy.visitAndWaitForHydration('/dashboard/MY4bvgxDbMtGv8rbYe5d')
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
      cy.visitAndWaitForHydration('/dashboard/MY4bvgxDbMtGv8rbYe5d')
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

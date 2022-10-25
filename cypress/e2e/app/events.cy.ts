describe('Events', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load events', () => {
      cy.login()
        .visit('/organizer')
        .get('button[name=create-event]')
        .should('exist');
    });
    //TODO: finish general tests
  });

  context('Security', () => {
    it('should not access /organizer when not authenticated', () => {
      cy.visit('/organizer')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });
    //TODO: finish security tests
  });
});

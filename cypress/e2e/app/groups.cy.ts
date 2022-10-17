describe('Groups Maintenance', () => {
  context('When user is authenticated', () => {
    beforeEach(() => {
      // intentionally left blank
    });

    it('should load groups', () => {
      cy.login()
        .visit('/m/groups')
        .get('button[name=create-group]')
        .should('exist');
    });

    it('should navigate to create group', () => {
      cy.login()
        .visit('/m/groups')
        .get('button[name=create-group]')
        .click()
        .get('input[name=name]')
        .should('exist');
    });

  });
});

export {};

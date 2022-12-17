describe('Checkout', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
  });

  context('Maintenance', () => {
    it('Should add race to cart', () => {
      cy.intercept('GET', '*?_data=routes*checkout*').as('selectRace')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('1');
    });
  });
});

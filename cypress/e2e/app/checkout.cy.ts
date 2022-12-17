describe('Checkout', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
  });

  context('Maintenance', () => {
    it('Should redirect and add race to cart from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/event/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('1');
    });

    it('Should add/remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/checkout/tickets/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('1')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('0');
    });

    it('Should fill form and save participant', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')
        // .intercept('GET', '')
        // .as('@checkout')

        .visitAndWaitForHydration('/checkout/tickets/MY4bvgxDbMtGv8rbYe5d')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('button[name=checkout]')
        .click()

        .wait('@checkout')

        .get('input[name=first-name]')
        .type('Nuno')

        .get('input[name=last-name]')
        .type('Lopes')

        .pickOptionFromSelect('gender', 2)

        .get('input[name=event-date]')
        .type('2001-09-21')

        .get('input[name=phone]')
        .type('987654321')

        .get('input[name=nif]')
        .type('987654321')

        .pickOptionFromSelect('shirt', 2)

        .get('input[name=nationality]')
        .type('Portuguese')

        .get('input[name=postalcode]')
        .type('4730-454');
    });
  });
});

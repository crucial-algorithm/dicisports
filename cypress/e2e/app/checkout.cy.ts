describe('Checkout', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
  });

  context('Maintenance: unauthenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
    });

    it('Should add race to cart and redirect to form route from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/e/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .url()
        .should(
          'eq',
          `${Cypress.config().baseUrl}/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('Should add race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/e/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        );
    });


    it('Should remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/e/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        )

        .get('[data-cy=update-cart]')
        .should('exist')

        .click({ force: true })

        .waitForHydration()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update`
        )
        .intercept('POST', '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*&_data=routes*checkout*')
        .as('removeParticipant')

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains('0');
    });

    it('Should fill form and save participant', () => {
      registerParticipant();
    });

    it('should contain right amount of races', () => {
      cy.login()

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains(1)

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains(2)

        .get('#checkout')
        .click()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        )

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should not exist list of participants if there is only one', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')
        .waitForHydration()

        .get('[data-cy=participant]')
        .should('not.exist');
    });

    it('should be able to update cart', () => {
      cy.intercept(
        'GET',
        '/checkout/cart/MY4bvgxDbMtGv8rbYe5d*?_data=routes*checkout*'
      )
        .as('selectRace')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d*?_data=routes*checkout*'
        )
        .as('addRace')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addRace')
        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@addRace')

        .waitForHydration()

        .url()
        .should('include', '/checkout/info/MY4bvgxDbMtGv8rbYe5d')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('addParticipant')

        .get('[data-cy=update-cart]')
        .should('exist')

        .click({ force: true })

        .waitForHydration()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update`
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@addParticipant')

        .get('#checkout')
        .click()

        .waitForHydration()

        .get('[data-cy=participant]')
        .should('exist')
        .and('have.length', 2);
    });

    it('should remove race participant', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .intercept('GET', '*?data=routes*info*')
        .as('registrationsCheckout')

        .get('#checkout')
        .click()

        .wait('@registrationsCheckout')

        .intercept('POST', '/checkout/manage*?_data=routes*')
        .as('removeParticipant')

        .get('[data-cy=participant]')
        .first()
        .click()

        .get('button[name=remove]')
        .click()

        .wait('@removeParticipant')

        .get('[data-cy=participant]')
        .should('not.exist');
    });

    it('should redirect to registration if last race participant is removed', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@selectRace')

        .intercept(
          'POST',
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update*?_data=routes*'
        )
        .as('removeParticipant')

        .get('[data-cy=update-cart]')
        .click({ force: true })

        .waitForHydration()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/cart/MY4bvgxDbMtGv8rbYe5d?a=update`
        )

        .get('#remove-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@removeParticipant')

        .get('#checkout')
        .should('be.disabled')

        .visitAndWaitForHydration('/checkout/info/MY4bvgxDbMtGv8rbYe5d')

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/cart/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('should show validation error If there are registrations with empty participant info', () => {
      cy.intercept('GET', '/checkout/cart/*?_data=routes*checkout*')
        .as('selectRace')

        .intercept('GET', '/checkout/info/*?_data=routes*checkout*')
        .as('checkout')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()

        .wait('@selectRace')

        .get('#checkout')
        .click()

        .wait('@checkout')

        .reload()
        .waitForHydration()

        .get('#checkout')
        .click()

        .wait('@checkout')
        .waitForHydration()

        .get('#checkout-error')
        .should('exist');
    });

    it('should book a race', () => {
      bookParticipant();
    });

    it('should be able to authenticate and keep booking after completing booking process', () => {
      bookParticipant();

      cy.get('[data-cy=authenticate]')
        .should('exist')
        .click()

        .url()
        .should('include', 'login?a=checkout')

        .get('body[data-cy=ready]')

        .get('[name=email]')
        .type('regular@gmail.com', { delay: 10 })

        .get('[name=password]')
        .type('Password1', { delay: 10 })

        .intercept('GET', '/?_data=routes*')
        .as('login')

        .get('button[name=login]')
        .click()

        .wait('@login')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .url()
        .should('include', '/checkout/cart/');
    });
  });

  context('Maintenance: authenticated', () => {
    beforeEach(() => {
      cy.task('db:reset');
      cy.login();
    });

    it('Should  add race to cart  and redirect to form route from event page', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration('/e/love-tiles-douro-granfondo-2023')

        .get('button[name=race-AhowRdNWCBQWSuivSt7h]')
        .click()

        .wait('@selectRace')

        .url()
        .should(
          'eq',
          `${Cypress.config().baseUrl}/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        );
    });

    it('Should add/remove race', () => {
      cy.intercept('GET', '*?_data=routes*checkout*')
        .as('selectRace')

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

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
      registerParticipant();
    });

    it('should contain right amount of races', () => {
      cy.login()

        .visitAndWaitForHydration(
          '/checkout/cart/MY4bvgxDbMtGv8rbYe5d'
        )

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains(1)

        .get('#add-race-AhowRdNWCBQWSuivSt7h')
        .click()
        .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
        .contains(2)

        .get('#checkout')
        .click()

        .url()
        .should(
          'eq',
          `${
            Cypress.config().baseUrl
          }/checkout/info/MY4bvgxDbMtGv8rbYe5d`
        )

        .get('[data-cy=participant]')
        .should('have.length', 2);
    });

    it('should fill form with saved participant info', () => {
      cy.intercept(
          'POST',
          '/checkout/cart/gLqrDfMx6qkTHn6hoZqA*?_data=routes*checkout*'
      )
          .as('addRace')

          .visitAndWaitForHydration(
              '/checkout/cart/gLqrDfMx6qkTHn6hoZqA'
          )

          .loginAdmin()

          .get('#add-race-LoDjLz7dWQTWk6Th4dRC')
          .click()

          .wait('@addRace')

          .get('#checkout')
          .click()

          .wait('@addRace')

          .waitForHydration()

          .url()
          .should('include', '/checkout/info/gLqrDfMx6qkTHn6hoZqA')

          .get('button[name=select-userSavedParticipants]')
          .should('exist')
          .pickOptionFromSelect('userSavedParticipants', 1)

          .get('input[name=first-name]')
          .should('have.length.at.least', 1)

          .get('input[name=last-name]')
          .should('have.length.at.least', 1).and('have.value', 'Lopes');
    });

    it('should book a race', () => {
      bookParticipant();
    });
  });
});

function registerParticipant() {
  cy.intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()
    .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
    .contains(1)

    .wait('@selectRace')
    .waitForHydration()

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()
    .get('[data-cy=race-AhowRdNWCBQWSuivSt7h-qtd]')
    .contains(2)

    .wait('@selectRace')
    .waitForHydration()

    .get('#checkout')
    .click()

    .wait('@selectRace')
    .waitForHydration()

    .get('div[data-cy=participant-1]')
    .click()

    .get('input[name=first-name]')
    .type('Nuno')

    .get('input[name=last-name]')
    .type('Lopes')

    .pickOptionFromSelect('gender', 2)

    .get('input[name=birthday]')
    .type('2001-09-21')

    .get('input[name=phone-number]')
    .type('937654321')

    .get('input[name=identity-card]')
    .type('987654321')

    .get('input[name=federation-number]')
    .type('8165238')

    .pickOptionFromSelect('shirt', 2)

    .pickOptionFromSelect('nationality', 188)

    .get('input[name=postal-code]')
    .type('4730-454')

    .intercept('POST', '*?_data=routes*checkout*')
    .as('saveParticipant')

    .get('#save-button')
    .click()

    .wait('@saveParticipant')
    .waitForHydration()

    .reload()
    .waitForHydration()

    .get('input[name=first-name]')
    .should('have.value', 'Nuno');
}

function bookParticipant() {
  cy.intercept('GET', '*?_data=routes*checkout*')
    .as('selectRace')

    .visitAndWaitForHydration('/checkout/cart/MY4bvgxDbMtGv8rbYe5d')

    .get('#add-race-AhowRdNWCBQWSuivSt7h')
    .click()

    .wait('@selectRace')

    .get('#checkout')
    .click()

    .wait('@selectRace')

    .get('input[name=first-name]')
    .type('Nuno')

    .get('input[name=last-name]')
    .type('Lopes')

    .pickOptionFromSelect('gender', 2)

    .get('input[name=birthday]')
    .type('2001-09-21')

    .get('input[name=phone-number]')
    .type('937654321')

    .get('input[name=identity-card]')
    .type('987654321')

    .get('input[name=federation-number]')
    .type('8165238')

    .pickOptionFromSelect('shirt', 2)

    .pickOptionFromSelect('nationality', 188)

    .get('input[name=postal-code]')
    .type('4730-454')

    .intercept('POST', '*?_data=routes*checkout*')
    .as('saveParticipant')

    .get('#save-button')
    .click()

    .wait('@saveParticipant')

    .waitForHydration()

    .url()
    .should('include', '/payment/MY4bvgxDbMtGv8rbYe5d')

    .get('button[name=pay]')
    .click()

    .get('[data-cy=confirmation-label]')
    .should('exist')

    .url()
    .should('include', '/confirmation/MY4bvgxDbMtGv8rbYe5d');
}

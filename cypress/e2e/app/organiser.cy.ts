describe('Organiser', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('Maintenance', () => {
    it('should create a organiser', () => {
      cy.login()
        .visitAndWaitForHydration('/o/us')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/us');
        })

        .get('input[name=name]')
        .type('Montanha dos Amigos')

        .get('input[name=email]')
        .type('info@montanhadosamigos.com')

        .get('input[name=address]')
        .type('Rua Custódio José Gomes Vilas Boas, 57')

        .get('input[name=postal-code]')
        .type('4755-059')

        .get('input[name=city]')
        .type('Barcelos')

        .get('textarea[name=description]')
        .type('Montanhas de Aventuras para Viver!')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/logo-organiser.jpeg', { force: true })

        .get('input[name=terms]')
        .click()

        .intercept('POST', '/o/us?*')
        .as('SubmitProfile')

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .get('[data-cy=pending-validation]')
        .should('exist');
    });

    it('should show form validation errors', () => {
      cy.login()
        .visitAndWaitForHydration('/o/us')

        .intercept('POST', '/o/us?*')
        .as('SubmitProfile')

        .get('input[name=terms]')
        .click()

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .get('p[role=alert]')
        .should('exist')
        .and('have.length', 7);
    });

    it('should show terms validation error', () => {
      cy.login()
        .visitAndWaitForHydration('/o/us')

        .intercept('POST', '/o/us?*')
        .as('SubmitProfile')

        .get('input[name=name]')
        .type('Montanha dos Amigos')

        .get('input[name=email]')
        .type('info@montanhadosamigos.com')

        .get('input[name=address]')
        .type('Rua Custódio José Gomes Vilas Boas, 57')

        .get('input[name=postal-code]')
        .type('4755-059')

        .get('input[name=city]')
        .type('Barcelos')

        .get('textarea[name=description]')
        .type('Montanhas de Aventuras para Viver!')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/logo-organiser.jpeg', { force: true })

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .get('#terms-error')
        .should('exist');
    });

    it('should display Organiser profile on event', () => {
      cy.loginOrganiser()
        .visitAndWaitForHydration('/event/trilho-dos-moinhos')

        .get('[data-cy=organiser-profile]')
        .should('exist');
    });

    it('should be able to update info', () => {
      cy.loginOrganiser()
        .visitAndWaitForHydration('/o/us')

        .get('input[name=name]')
        .should('have.value', 'Amigos da Montanha')
        .type('2')

        .intercept('POST', '/o/us?*')
        .as('SubmitProfile')

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/us');
        })

        .visitAndWaitForHydration('/event/trilho-dos-moinhos')

        .get('[data-cy=organiser-name]')
        .contains('Amigos da Montanha2');
    });
  });

  context('Security', () => {
    it('should not access /o/us if user is not logged in', () => {
      cy.visitAndWaitForHydration('/o/us')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/login');
        });
    });
  });
});

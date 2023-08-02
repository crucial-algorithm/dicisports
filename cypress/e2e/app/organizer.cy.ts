describe('Organizer', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('Maintenance', () => {
    it('should create a organizer', () => {
      cy.login()
        .visitAndWaitForHydration('/o/us')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/us');
        });

      fillFormWithOrganizerTemplate();

      cy.intercept('POST', '/o/us?*')
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
        .selectFile('cypress/assets/logo-organizer.jpeg', { force: true })

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .get('#terms-error')
        .should('exist');
    });

    it('should display Organizer profile on event', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/event/trilho-dos-moinhos')

        .get('[data-cy=organizer-profile]')
        .should('exist');
    });

    it('should be able to update info', () => {
      cy.loginOrganizer()
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

        .get('[data-cy=organizer-name]')
        .contains('Amigos da Montanha2');
    });

    it('should send confirmation email when submiting organizer profile form', () => {
      cy.login()
        .visitAndWaitForHydration('/o/us')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/us');
        });

      fillFormWithOrganizerTemplate();

      cy.intercept('POST', '/o/us?*')
        .as('SubmitProfile')

        .get('button[name=save-profile]')
        .click()

        .wait('@SubmitProfile')

        .get('[data-cy=pending-validation]')
        .should('exist')

        .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
        .then(({ body }) => {
          expect(body.to).to.eq('info@montanhadosamigos.com');
          expect(body.subject).to.eq(
            'Registo como organizador no dicisports.com  ✨'
          );
        });
    });

    it('should create new discount code', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/discount-codes')
        .get('#new-discount')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes/new');
        })

        .get('input[name=code]')
        .type('GET-FIT-35')

        .get('input[name=discount-value]')
        .type('35')

        .intercept('POST', '/o/discount-codes/new*')
        .as('CreateDiscount')

        .get('button[name=create-button]')
        .should('exist')
        .click()

        .wait('@CreateDiscount')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes');
        })

        .get('tr')
        .should('have.length', 7)
        .eq(1)
        .contains('GET-FIT-35');
    });

    it('should delete a discount code', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/discount-codes/zWZKBmZowXrns2pP4QQ2')

        .get('button[name=delete-button]')
        .should('exist')
        .click()

        .get('.cy-delete-dialog')
        .should('exist')

        .get('button.cy-primary')
        .should('exist')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes');
        })

        .get('tr')
        .should('have.length', 5);
    });

    it('should hide a discount code', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/discount-codes/zWZKBmZowXrns2pP4QQ2')

        .intercept('POST', '/o/discount-codes/zWZKBmZowXrns2pP4QQ2*')
        .as('DisableDiscount')

        .get('#disable-button')
        .should('exist')
        .click()

        .wait('@DisableDiscount')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes/zWZKBmZowXrns2pP4QQ2');
        })

        .get('#disable-button')
        .should('not.exist')

        .get('#cancel-button')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes');
        })

        .get('#status-zWZKBmZowXrns2pP4QQ2')
        .contains('Inactivo');
    });

    it('should activate a discount code', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/discount-codes/GK6mACnFumj3yMbkivPe')

        .intercept('POST', '/o/discount-codes/GK6mACnFumj3yMbkivPe*')
        .as('EnableDiscount')

        .get('#enable-button')
        .should('exist')
        .click()

        .wait('@EnableDiscount')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes/GK6mACnFumj3yMbkivPe');
        })

        .get('#enable-button')
        .should('not.exist')

        .get('#cancel-button')
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes');
        })

        .get('#status-GK6mACnFumj3yMbkivPe')
        .contains('Activo');
    });

    it('should edit discount code', () => {
      cy.loginOrganizer()
        .visitAndWaitForHydration('/o/discount-codes')

        .get('tr')
        .should('have.length', 6)
        .eq(1)
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/o/discount-codes/');
        })

        .get('input[name=code]')
        .clear()
        .type('GET-5')

        .intercept('POST', '/o/discount-codes/*')
        .as('SaveDiscount')

        .get('button[name=save-button]')
        .should('exist')
        .click()

        .wait('@SaveDiscount')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/o/discount-codes');
        })

        .get('tr')
        .should('have.length', 6)
        .contains('GET-5');
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

function fillFormWithOrganizerTemplate() {
  cy.get('input[name=name]')
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
    .selectFile('cypress/assets/logo-organizer.jpeg', { force: true })

    .get('input[name=terms]')
    .click();
}

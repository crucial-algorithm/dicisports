describe('Admin', () => {
  beforeEach(() => {
    cy.task('db:reset');
    cy.loginAdmin();
  });

  context('Maintenance', () => {
    it('should display pending organizers', () => {
      cy.visitAndWaitForHydration('/a/organizers')
        .get('tr')
        .should('have.length', 2);
    });

    it('should approve organizer', () => {
      cy.visitAndWaitForHydration('/a/organizers')
        .get('tr')
        .should('have.length', 2)
        .eq(1)
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers/uyFgbFPB67YEnzZj82wA');
        })

        .get('input[name=commission]')
        .should('have.value', 25)
        .clear()
        .type('30')

        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('ApproveOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 2)
        .eq(1)
        .click()

        .wait('@ApproveOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('tr')
        .contains('Não existem submissões pendentes!');
    });

    it('should reject organizer', () => {
      cy.visitAndWaitForHydration('/a/organizers')
        .get('tr')
        .should('have.length', 2)
        .eq(1)
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers/uyFgbFPB67YEnzZj82wA');
        })

        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('RejectOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 2)
        .eq(0)
        .click()

        .wait('@RejectOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('tr')
        .contains('Não existem submissões pendentes!');
    });

    it('should send confirmation email when organizer is approved', () => {
      cy.visitAndWaitForHydration('/a/organizers')
        .get('tr')
        .should('have.length', 2)
        .eq(1)
        .click()

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers/uyFgbFPB67YEnzZj82wA');
        })

        .get('input[name=commission]')
        .should('have.value', 25)
        .clear()
        .type('30')

        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('ApproveOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 2)
        .eq(1)
        .click()

        .wait('@ApproveOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('tr')
        .contains('Não existem submissões pendentes!')

        .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
        .then(({ body }) => {
          expect(body.to).to.eq('geral@bikeservice.pt');
          expect(body.subject).to.eq('Perfil de Organizador aprovado no dicisports.com ✨');
        });
    });
  });
});

describe('Admin', () => {
  beforeEach(() => {
    cy.task('db:reset');
    cy.loginAdmin();
  });

  context('Maintenance', () => {
    it('should display organizers', () => {
      cy.visitAndWaitForHydration('/a/organizers')
        .get('tr')
        .should('have.length', 3);
    });

    it('should approve organizer', () => {
      cy.visitAndWaitForHydration('/a/organizers/uyFgbFPB67YEnzZj82wA')
        .get('input[name=commission]')
        .should('have.value', 25)
        .clear()
        .type('30')

        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('ApproveOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 3)
        .eq(1)
        .click()

        .wait('@ApproveOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('#status-uyFgbFPB67YEnzZj82wA')
        .contains('Aprovado');
    });

    it('should reject organizer', () => {
      cy.visitAndWaitForHydration('/a/organizers/uyFgbFPB67YEnzZj82wA')
        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('RejectOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 3)
        .eq(0)
        .click()

        .wait('@RejectOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('#status-uyFgbFPB67YEnzZj82wA')
        .contains('Rejeitado');
    });

    it('should send confirmation email when organizer is approved', () => {
      cy.visitAndWaitForHydration('/a/organizers/uyFgbFPB67YEnzZj82wA')

        .get('input[name=commission]')
        .should('have.value', 25)
        .clear()
        .type('30')

        .intercept('POST', '/a/organizers/uyFgbFPB67YEnzZj82wA*')
        .as('ApproveOrganizer')

        .get('button[name=actionId]')
        .should('have.length', 3)
        .eq(1)
        .click()

        .wait('@ApproveOrganizer')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .get('#status-uyFgbFPB67YEnzZj82wA')
        .contains('Aprovado')

        .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
        .then(({ body }) => {
          expect(body.to).to.eq('geral@bikeservice.pt');
          expect(body.subject).to.eq(
            'Perfil de Organizador aprovado no dicisports.com ✨'
          );
        });
    });

    it('should allow to update commission of approved organizers', () => {
      cy.visitAndWaitForHydration('/a/organizers/qyPfCac23fMByqNa7L6n')
        .get('input[name=commission]')
        .clear()
        .type('30')

        .intercept('POST', '/a/organizers/qyPfCac23fMByqNa7L6n*')
        .as('UpdateCommission')

        .get('button[name=actionId]')
        .eq(1)
        .click()

        .wait('@UpdateCommission')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/a/organizers');
        })

        .visitAndWaitForHydration('/a/organizers/qyPfCac23fMByqNa7L6n')
        .get('input[name=commission]')
        .should('have.value', '30');
    });
  });
});

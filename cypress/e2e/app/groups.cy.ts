describe('Groups', () => {
  beforeEach(() => {
    cy.task('db:reset');
  });

  context('General', () => {
    it('should load groups in mobile', () => {
      cy.login()
        .visitAndWaitForHydration('/me')

        .get('[data-cy=group-entry]')
        .should('exist')
        .and('have.length', 2);
    });

    it('should favorite group', () => {
      cy.intercept('GET', '/groups?actionId=search*')
        .as('search')
        .login()
        .visitAndWaitForHydration('/groups?actionId=search&sport=6')

        .get('#add-favorite-05b72760f9674a2abdcc')
        .click()

        .wait('@search')

        .get('#remove-favorite')
        .should('exist')

        .visitAndWaitForHydration('/me')

        .get('[data-cy=favorite-entry]')
        .should('exist')
        .and('have.length', 2);
    });

    it('should remove group from favorites', () => {
      cy.intercept('GET', '/me*')
        .as('removeFavorite')

        .login()
        .visitAndWaitForHydration('/me')

        .get('#remove-favorite-eaaf16cc63285c840ad1')
        .click()

        .wait('@removeFavorite')

        .get('[data-cy=no-favorites]')
        .should('exist');
    });
  });

  context('Security', () => {
    it('should not access /me when not authenticated', () => {
      cy.visitAndWaitForHydration('/me')
        .url()
        .should('eq', `${Cypress.config().baseUrl}/login`);
    });

    it('should not allow a user from editing another user group', () => {
      cy.login()
        .visitAndWaitForHydration('/g/group/d888b22b730daaf3b70e')

        .url()
        .should('eq', `${Cypress.config().baseUrl}/me`);
    });
  });

  context('Maintenance', () => {
    beforeEach(() => cy.login());

    it('should create a group', () => {
      cy.visitAndWaitForHydration('/me')
        .get('[data-cy=create-group]')
        .click()

        .waitForHydration()

        .location()
        .should((l) => {
          expect(l.pathname).to.include('/g/group/');
        })

        // fill the form
        .get('input[name=name][id=group-sport]')
        .type('a new group')
        .should('have.value', 'a new group')

        .pickOptionFromSelect('sport', 4)
        .pickOptionFromSelect('type', 2)
        .pickOptionFromSelect('spirit', 3)

        .pickLocationInMap('open-map')

        .get('input[name=near]')
        .type('gaz station aaa')

        .get('button[name=add-new-schedule]')
        .click()
        .get('button[name="remove-schedule"]')

        .pickOptionFromSelect('dayOfWeek', 3)
        .pickOptionFromSelect('hour', 11)

        .get('input[name=whatsapp]')
        .type('https://...')

        .get('input[name="/file/image/0"]')
        .selectFile('cypress/assets/cycling.jpeg', { force: true })

        .get('textarea[name=description]')
        .type('we do things')

        // save group (prepare to wait for the redirect to happen when group is created)
        .intercept('GET', '/me?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()

        .wait('@createGroup')

        // validate that form was properly created
        .get('[data-cy=group-entry]')
        .should('exist')

        .visitAndWaitForHydration('/group/a-new-group')
        .wasImageLoaded('img[data-cy=image1]')
        .get('p[data-cy=schedule]')
        .contains('Terça-Feira, 10:00 | Domingo, 09:00');
    });

    it('should update group', () => {
      const description = 'Grupo organizado pela bikebrothers';

      cy.visitAndWaitForHydration('/g/group/FkoxmH5db6RXqBpExion')
        .get('textarea[name=description]')
        .type(description)
        .intercept('GET', '/me?message=*')
        .as('createGroup')
        .get('button[name=save-group]')
        .click()
        .wait('@createGroup')

        .location()
        .should((l) => {
          expect(l.pathname).to.eq('/me');
        })

        .visitAndWaitForHydration('/group/bike-brothers-domingueira')
        .get('[data-cy=description]')
        .contains(description);
    });

    it('should delete group', () => {
      cy.intercept('GET', '/me?message=*')
        .as('deleteGroup')

        .visitAndWaitForHydration('/g/group/FkoxmH5db6RXqBpExion')
        .get('button[name=delete]')
        .click()

        .get('.cy-delete-dialog')

        .get('button.cy-primary')
        .click()

        .wait('@deleteGroup')

        .visitAndWaitForHydration('/group/bike-brothers-domingueira')
        .get('p[data-cy=group-not-found]');
    });
  });
});

export {};

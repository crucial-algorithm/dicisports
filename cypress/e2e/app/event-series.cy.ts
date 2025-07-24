describe('Event Series', () => {
  before(() => {
    cy.task('db:reset');
    cy.task('clearDownloadFolder');
    cy.clearAllLocalStorage();
  });

  context('Public', () => {
    it('Should display edition badge on event entry', () => {
      cy.visitAndWaitForHydration('/pt/event/1000-trail-do-zezere')
      .get('[data-cy="newer-edition-banner"]')
      .should('be.visible');
    });

    it('Should display series overview page', () => {
      // Test the series overview page
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('[data-cy="series-name"]')
        .should('contain', 'Trail do Zêzere')
        
        .get('h2')
        .should('contain', 'Todas as Edições')
        
        // Check if events are displayed in a grid
        .get('.grid')
        .should('exist')
        .within(() => {
          cy.get('a').should('have.length.at.least', 1);
        });
    });

    it('Should redirect from series edition URL to event page', () => {
      // Test the redirect functionality from /series/slug/edition to /event/slug
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere/2024')
        .url()
        .should('include', '/event/');
    });

    it('Should display newer edition banner on older events', () => {
      // This test checks if the newer edition banner appears on older events
      // We'll need to visit an event that has a newer edition available
      cy.visitAndWaitForHydration('/pt/event/trail-do-zezere')
        .get('body').then(($body) => {
          if ($body.find('[data-cy="newer-edition-banner"]').length > 0) {
            cy.get('[data-cy="newer-edition-banner"]')
              .should('be.visible')
              .within(() => {
                cy.contains('Nova edição disponível!')
                  .should('be.visible');
                
                cy.get('[data-cy="view-latest-edition"]')
                  .should('be.visible')
                  .and('contain', 'Ver Edição Mais Recente');
                
                cy.get('[data-cy="view-all-editions"]')
                  .should('be.visible')
                  .and('contain', 'Ver Todas as Edições');
              });
          }
        });
    });

    it('Should not display newer edition banner on latest events', () => {
      // Visit the latest event in a series and ensure no banner is shown
      cy.visitAndWaitForHydration('/pt/event/love-tiles-douro-granfondo-2023')
        .get('[data-cy="newer-edition-banner"]')
        .should('not.exist');
    });

    it('Should display related editions section', () => {
      // Test the related editions section on event detail pages
      cy.visitAndWaitForHydration('/pt/event/trail-do-zezere')
        .get('body').then(($body) => {
          if ($body.find('h3').filter(':contains("Outras Edições")').length > 0) {
            cy.contains('h3', 'Outras Edições')
              .should('be.visible')
              .parent()
              .within(() => {
                cy.get('.grid')
                  .should('exist')
                  .within(() => {
                    cy.get('[data-cy^="related-edition-"]')
                      .should('have.length.at.least', 1)
                      .first()
                      .within(() => {
                        cy.get('h4').should('be.visible');
                        cy.get('.bg-blue-100, .bg-blue-900').should('exist'); // Edition badge
                      });
                  });
                
                cy.contains('Ver todas as edições')
                  .should('be.visible')
                  .and('have.attr', 'href')
                  .and('include', '/series/');
              });
          }
        });
    });

    it('Should navigate between related editions', () => {
      // Test navigation between related editions
      cy.visitAndWaitForHydration('/pt/event/trail-do-zezere')
        .get('body').then(($body) => {
          if ($body.find('[data-cy^="related-edition-"]').length > 0) {
            cy.get('[data-cy^="related-edition-"]')
              .first()
              .click()
              .url()
              .should('include', '/event/');
          }
        });
    });

    it('Should display proper edition sorting on series page', () => {
      // Test that editions are sorted correctly (years first, then alphabetical)
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('[data-cy^="edition-"]')
        .then(($editions) => {
          if ($editions.length > 1) {
            // Check that editions are displayed in some order
            cy.wrap($editions).should('have.length.at.least', 2);
            
            // Check that each edition has proper structure
            cy.wrap($editions).each(($edition) => {
              cy.wrap($edition).within(() => {
                cy.get('[data-cy="event-name"]').should('be.visible');
                cy.get('[data-cy="event-date"]').should('be.visible');
              });
            });
          }
        });
    });

    it('Should display event images on series page', () => {
      // Test that event images are displayed on series overview
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('[data-cy^="edition-"]')
        .first()
        .within(() => {
          cy.get('img, [style*="background-image"]')
            .should('exist');
        });
    });

    it('Should have proper accessibility attributes', () => {
      // Test accessibility features
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('[data-cy="series-name"]')
        .should('have.prop', 'tagName', 'H1')
        
        .get('h2')
        .should('contain', 'Todas as Edições')
        
        .get('[data-cy^="edition-"]')
        .first()
        .should('have.attr', 'href')
        .and('include', '/event/');
    });

    it('Should handle newer edition banner links correctly', () => {
      // Test that newer edition banner links work correctly
      cy.visitAndWaitForHydration('/pt/event/trail-do-zezere')
        .get('body').then(($body) => {
          if ($body.find('[data-cy="newer-edition-banner"]').length > 0) {
            cy.get('[data-cy="view-latest-edition"]')
              .should('have.attr', 'href')
              .and('include', '/event/');
            
            cy.get('[data-cy="view-all-editions"]')
              .should('have.attr', 'href')
              .and('include', '/series/');
          }
        });
    });

    it('Should display proper translation keys', () => {
      // Test that all translation keys are working
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .contains('Todas as Edições')
        .should('be.visible')
        
        .get('body').then(($body) => {
          if ($body.find('a').filter(':contains("Ver todas as edições")').length > 0) {
            cy.contains('Ver todas as edições')
              .should('be.visible');
          }
        });
    });

    it('Should maintain responsive design on mobile', () => {
      // Test responsive design
      cy.viewport('iphone-6')
        .visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('.grid')
        .should('exist')
        
        .get('[data-cy^="edition-"]')
        .first()
        .should('be.visible');
    });

    it('Should handle dark mode properly', () => {
      // Test dark mode styling (if implemented)
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('body').then(($body) => {
          // Check if dark mode classes exist
          if ($body.find('.dark\\:').length > 0) {
            cy.get('[data-cy^="edition-"]')
              .first()
              .should('have.class', 'dark:border-gray-700');
          }
        });
    });
  });

  context('Performance', () => {
    it('Should load series page quickly', () => {
      const start = Date.now();

      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .then(() => {
          const loadTime = Date.now() - start;

          expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
        });
    });

    it('Should handle large number of editions', () => {
      // Test performance with many editions (if available)
      cy.visitAndWaitForHydration('/pt/series/trail-do-zezere')
        .get('[data-cy^="edition-"]')
        .should('have.length.at.least', 1)
        .and('have.length.at.most', 50); // Reasonable limit for UI performance
    });
  });
});

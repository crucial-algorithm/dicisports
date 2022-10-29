import VisitOptions = Cypress.VisitOptions;
import AUTWindow = Cypress.AUTWindow;

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;

      pickOptionFromSelect(name: string, position: number): Chainable<void>;

      pickLocationInMap(triggerOpenMapButtonName: string): Chainable<void>;

      wasImageLoaded(selector: string): Chainable<void>;

      visitAndWaitForHydration(url: string, options?: Partial<VisitOptions>): Chainable<AUTWindow>;
    }
  }
}

function login() {
  cy.setCookie(
    'ds_root_session',
    'eyJfX3Nlc3Npb25faWRfXyI6ImM0ZTFiNTY4LTBlMzAtNDY2ZC04ZmYwLWUxMGYyMTJlM2M1ZiJ9.JjNS%2B5DEc7mf3OkCnGLesD5pPb0NFMVYMU0imAzvxKU'
  );
}

function pickOptionFromSelect(name: string, position: number) {
  cy.get(`#select-${name}`)
    .click()

    .get(`[class*="-menu"] [class*="-option"]:nth-child(${position})`)
    .click();
}

function pickLocationInMap(triggerOpenMapButtonName: string) {
  cy.intercept('GET', 'https://api.mapbox.com/geocoding/v5/mapbox.places/F*')
    .as('mapBoxSearchResult')
    .intercept(
      'GET',
      'https://api.mapbox.com/geocoding/v5/mapbox.places/-8.64*'
    )
    .as('mapBoxFindAddressFromCoords')

    // open modal
    .get(`button[name=${triggerOpenMapButtonName}]`)
    .click()

    // search location
    .get('input.mapboxgl-ctrl-geocoder--input')
    .type('Fátima, Santarém, Portugal')
    .wait('@mapBoxSearchResult')

    // get 1st suggestion - it looks like @mapBoxSearchResult might not be the right request to intercept
    .get('ul.suggestions > li > a')
    .first()
    .click()

    .wait('@mapBoxFindAddressFromCoords', { timeout: 10000 })
    .get('button[name=pick-location]')
    .click();
}

function wasImageLoaded(selector: string) {
  cy.get(selector)
    .should('be.visible')
    .and('have.prop', 'naturalWidth')
    .should('be.greaterThan', 0);
}

function visitAndWaitForHydration(url: string, options?: Partial<VisitOptions>) {
  cy.visit(url, options).window().then((win) => {
    return new Promise<AUTWindow>((resolve, reject) => {
      const id = setInterval(() => {
        const resource = win.performance
          .getEntriesByType('resource')
          .find((rs) => /(.*)\/entry.client-(.*)\.js/.test(rs.name));

        if (!resource) {
          return;
        }

        clearInterval(id);
        setTimeout(() => resolve(win), 0);
      }, 10);
    });
  });
}

Cypress.Commands.add('login', login);
Cypress.Commands.add('pickOptionFromSelect', pickOptionFromSelect);
Cypress.Commands.add('pickLocationInMap', pickLocationInMap);
Cypress.Commands.add('wasImageLoaded', wasImageLoaded);
Cypress.Commands.add('visitAndWaitForHydration', visitAndWaitForHydration);

export {};

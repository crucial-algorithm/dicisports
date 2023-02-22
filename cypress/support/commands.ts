import VisitOptions = Cypress.VisitOptions;
import AUTWindow = Cypress.AUTWindow;

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;

      loginAdmin(): Chainable<void>;

      pickOptionFromSelect(
        name: string,
        position: number,
        focused?: boolean
      ): Chainable<void>;

      pickLocationInMap(triggerOpenMapButtonName: string): Chainable<void>;

      wasImageLoaded(selector: string): Chainable<void>;

      getRecoverPasswordUrl(): Chainable<string>;

      waitForHydration(): Chainable<void>;

      visitAndWaitForHydration(
        url: string,
        options?: Partial<VisitOptions>
      ): Chainable<AUTWindow>;

      assertValueCopiedToClipboard(value: string): Promise<Chainable<void>>;
    }
  }
}

function login() {
  cy.setCookie(
    'ds_root_session',
    'eyJfX3Nlc3Npb25faWRfXyI6ImM0ZTFiNTY4LTBlMzAtNDY2ZC04ZmYwLWUxMGYyMTJlM2M1ZiJ9.JjNS%2B5DEc7mf3OkCnGLesD5pPb0NFMVYMU0imAzvxKU'
  );
}

function loginAdmin() {
  cy.setCookie(
    'ds_root_session',
    'eyJfX3Nlc3Npb25faWRfXyI6IjI5N2VmZWI4LTM5Y2YtNGI3NC05MzExLWMwODIzMzlkZTU1YSJ9.37yKylNYa4IFtwx6tM6dqYMU9wNPnlG28uvBeB18V60'
  );
}

function pickOptionFromSelect(name: string, position: number, focused = false) {
  // A workaround until we fix the Combo Box's. Ex:
  // When opening the filter's Dialog, the first combo is already focused, so it wasn't doing anything when
  // cypress clicked it
  if (focused) {
    cy.get(`#select-${name}`)
      .focused()
      .click()

      .get(`[class*="-menu"] [class*="-option"]:nth-child(${position})`)
      .click();
  } else {
    cy.get(`#select-${name}`)
      .click()

      .get(`[class*="-menu"] [class*="-option"]:nth-child(${position})`)
      .click();
  }
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
    .get('button[name=pick-location]')

    // search location
    .get('input.mapboxgl-ctrl-geocoder--input')
    .type('Fátima, Santarém, Portugal')
    .wait('@mapBoxSearchResult')

    // get 1st suggestion - it looks like @mapBoxSearchResult might not be the right request to intercept
    .get('ul.suggestions > li > a')
    .first()
    .click()

    .wait('@mapBoxFindAddressFromCoords', { timeout: 10000 })
    .get('button[name=pick-location]:enabled', { timeout: 10000 })
    .click({ force: true })

    .get('input[name=discard-location]')
    .should('have.value', 'Estrada De Torres Novas');
}

function wasImageLoaded(selector: string) {
  cy.get(selector)
    .should('be.visible')
    .and('have.prop', 'naturalWidth')
    .should('be.greaterThan', 0);
}

function visitAndWaitForHydration(
  url: string,
  options?: Partial<VisitOptions>
) {
  cy.visit(url, options).get('body[data-cy=ready]');
}

function waitForHydration() {
  cy.get('body[data-cy=ready]');
}

function getRecoverPasswordUrl() {
  function extractUrl(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let loginLink = '';

    text.replace(urlRegex, (url: string) => {
      loginLink = url;
      return url;
    });
    return loginLink;
  }

  return cy
    .request({ method: 'GET', url: Cypress.env('HTTP_CATCHER') })
    .then(({ body }) => {
      const url = extractUrl(body.text);
      const start = url.search('/magic');

      return url.substr(start);
    });
}

function assertValueCopiedToClipboard(value: string) {
  cy.window().then((win) => {
    return new Cypress.Promise((resolve) => {
      win.navigator.clipboard.readText().then((text) => {
        expect(text).to.eq(Cypress.config().baseUrl + value);
        resolve();
      });
    });
  });
}

Cypress.Commands.add('login', login);
Cypress.Commands.add('loginAdmin', loginAdmin);
Cypress.Commands.add('pickOptionFromSelect', pickOptionFromSelect);
Cypress.Commands.add('pickLocationInMap', pickLocationInMap);
Cypress.Commands.add('wasImageLoaded', wasImageLoaded);
Cypress.Commands.add('visitAndWaitForHydration', visitAndWaitForHydration);
Cypress.Commands.add('waitForHydration', waitForHydration);
Cypress.Commands.add('getRecoverPasswordUrl', getRecoverPasswordUrl);
Cypress.Commands.add(
  'assertValueCopiedToClipboard',
  assertValueCopiedToClipboard
);

export {};

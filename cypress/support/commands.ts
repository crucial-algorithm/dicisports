import VisitOptions = Cypress.VisitOptions;
import AUTWindow = Cypress.AUTWindow;

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;

      logout(): Chainable<void>;

      loginAdmin(): Chainable<void>;

      loginOrganizer(): Chainable<void>;

      pickDate(name: string, date: string, outside?: string): Chainable<void>;

      inputMaskWorkaround(selector: string, value: string): Chainable<void>;

      pickOptionFromSelect(name: string, position: number): Chainable<void>;

      pickLocationInMap(triggerOpenMapButtonName: string): Chainable<void>;

      pickLocationInInlinedMap(
        triggerOpenMapButtonName: string
      ): Chainable<void>;

      wasImageLoaded(selector: string): Chainable<void>;

      getRecoverPasswordUrl(): Chainable<string>;

      waitForHydration(): Chainable<void>;

      visitAndWaitForHydration(
        url: string,
        options?: Partial<VisitOptions>
      ): Chainable<AUTWindow>;

      assertValueCopiedToClipboard(value: string): Promise<Chainable<void>>;

      write(name: string, value: string): Chainable<void>;
    }
  }
}

function loginHelper(user: string, password: string) {
  cy.visitAndWaitForHydration('/login')
    .get('input[name=email]')
    .type(user)

    .get('input[name=password]')
    .type(password)

    .get('form[action="/login"]')
    .submit()

    .get('body[data-cy-user=logged-in]');
}

function login() {
  loginHelper('regular@gmail.com', 'Password1');
}

function logout() {
  cy.request({
    method: 'POST',
    url: '/me',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'charset': 'UTF-8'
    },
    body: {
      actionId: 'logout'
    }
  });
}

function loginAdmin() {
  loginHelper('admin@gmail.com', 'Password1');
}

function loginOrganizer() {
  loginHelper('organizer@gmail.com', 'Password1');
}

function pickOptionFromSelect(name: string, position: number) {
  cy.get(`button[name=select-${name}]`)
    .last() // in case we have multiple with the same name, pick the last one 🤷‍
    .click()

    .siblings('ul')
    .children(`:nth-child(${position})`)
    .click();
}

function convertDateInput(value: string) {
  if (value.split('-').length === 1) {
    return [
      value.substring(0, 4),
      value.substring(4, 6),
      value.substring(6)
    ].map(Number);
  }

  return value.split('-').map(Number);
}

/**
 *
 * @param name
 * @param date  format yyyy-mm-dd | yyyymmdd
 * @param outside  format yyyy-mm-dd
 */
function pickDate(name: string, date: string, outside = 'body') {
  const [year, month, day] = convertDateInput(date);

  cy.get(`input[name=${name}]`)
    .should('exist') // this + clear should be enough to delay typing and stop using 0 as prefix
    .click()

    .get(`input[name=${name}]`)
    .clear()
    .invoke('val', date)
    .trigger('input')

    .get(`[data-cy-year=${year}][data-cy-month=${month}][data-cy-day=${day}]`)
    .click({ force: true }) // when within a dialog

    .get(outside)
    .click(0, 0, { force: true }); // when within a dialog
}

function inputMaskWorkaround(selector: string, value: string) {
  cy.get(selector).then(($input) => {
    // get native DOM element
    const input = $input.get(0);

    // track last value since we need it for React16 track value
    // @ts-ignore
    const lastValue = input.value;

    // @ts-ignore
    input.value = value;

    // dispatch change into React as well
    // @ts-ignore
    input._valueTracker.setValue(lastValue);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
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
    .focus()
    .type('Fátima, Santarém, Portugal')
    .wait('@mapBoxSearchResult')

    .get('input.mapboxgl-ctrl-geocoder--input')
    .should('have.value', 'Fátima, Santarém, Portugal')

    // get 1st suggestion - it looks like @mapBoxSearchResult might not be the right request to intercept
    .get('ul.suggestions > li > a')
    .first()
    .click()

    .wait('@mapBoxFindAddressFromCoords', { timeout: 10000 })
    .get('button[name=pick-location]:enabled', { timeout: 10000 })
    .click({ force: true });
}

function pickLocationInInlinedMap(name: string) {
  cy.intercept('GET', '**/geocoding/v5/mapbox.places/F**Portugal.json**', {
    fixture: 'mapbox.search.json'
  })
    .as('mapFetchSearchResults')
    .intercept(
      '**/geocoding/**/mapbox.places/-8.644798450000053,39.59423606030617.json*',
      { fixture: 'mapbox.details.json' }
    )
    .as('mapFetchAddressDetails')

    .intercept('POST', '**/events/*', { body: {} })
    .as('mapPostToEvents')

    // open modal
    .get(`div[data-location-picker=${name}] .mapboxgl-ctrl-geocoder--input`)
    .type('Fátima, Santarém, Portugal')

    // get 1st (and only) suggestion
    .get('ul.suggestions > li > a')
    .first()
    .click()

    .wait('@mapFetchAddressDetails', { timeout: 10000 });
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

function writePrimeReactEditor(name: string, value: string) {
  cy.get(`div[data-cy=editor-${name}] .ql-editor[contenteditable="true"]`)
    .clear()
    .type(value);
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
    .request({ method: 'GET', url: Cypress.env('MAILGUN_ENDPOINT') })
    .then(({ body }) => {
      console.log('body:', body)
      const url = extractUrl(body.text);
      const start = url.search('/magic');

      return url.substring(start);
    });
}

function assertValueCopiedToClipboard(value: string) {
  cy.window().then((win) => {
    return win.navigator.clipboard.readText().then((text) => {
      expect(text).to.eq(Cypress.config().baseUrl + value);
    });
  });
}

Cypress.Commands.add('login', login);
Cypress.Commands.add('logout', logout);
Cypress.Commands.add('loginAdmin', loginAdmin);
Cypress.Commands.add('loginOrganizer', loginOrganizer);
Cypress.Commands.add('pickOptionFromSelect', pickOptionFromSelect);
Cypress.Commands.add('pickDate', pickDate);
Cypress.Commands.add('inputMaskWorkaround', inputMaskWorkaround);
Cypress.Commands.add('pickLocationInMap', pickLocationInMap);
Cypress.Commands.add('pickLocationInInlinedMap', pickLocationInInlinedMap);
Cypress.Commands.add('wasImageLoaded', wasImageLoaded);
Cypress.Commands.add('visitAndWaitForHydration', visitAndWaitForHydration);
Cypress.Commands.add('waitForHydration', waitForHydration);
Cypress.Commands.add('getRecoverPasswordUrl', getRecoverPasswordUrl);
Cypress.Commands.add(
  'assertValueCopiedToClipboard',
  assertValueCopiedToClipboard
);
Cypress.Commands.add('write', writePrimeReactEditor);

export {};

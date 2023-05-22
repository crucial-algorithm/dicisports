function form() {
  const header = document.createElement('h4');
  header.className = 'leading-tight text-xl mb-2 text-black dark:text-white'
  header.innerHTML = 'Payment method development mock';

  const subHeader = document.createElement('h6');
  subHeader.className = 'leading-tight text-l text-black dark:text-white'
  subHeader.innerHTML = 'Click to simulate payment';

  const ring = document.createElement('div');
  ring.className = 'focus-ring absolute inset-0 rounded-full opacity-100 disabled:opacity-50 transform transition bg-inverse';

  const content = document.createElement('div');
  content.className = 'relative flex items-center justify-center w-full h-full whitespace-nowrap text-inverse px-8 py-4 space-x-3';
  content.innerHTML = 'Pay'

  const button = document.createElement('button')
  button.className = 'group relative inline-flex transition opacity-100 text-lg font-medium focus:outline-none disabled:opacity-50 mt-4 w-48';
  button.type = 'submit';
  button.name = 'pay';

  button.appendChild(ring);
  button.appendChild(content);


  const form = document.querySelector('form[spg-context]');
  const context = JSON.parse(form.getAttribute('spg-context'));
  const payload = {
    returnStatus: { statusMsg: 'Success', statusCode: '000' },
    paymentStatus: 'Success',
    paymentMethod: 'CARD',
    transactionID: context.transactionId,
    amount: { currency: 'EUR', value: 10 },
    merchant: { terminalId: 1000000, transactionId: context.transactionId },
    paymentType: 'PURS',
    notificationID: UUIDGenerator()
  };

  // for locl dev, we will use this secret which needs to be setup in .env file
  const secret = 'O0Bur9uhZkS54NkwFhVyeutED6DhLbOQUBDt3i3W/C4=';
  encryptMessage(
    secret,
    JSON.stringify(payload)
  ).then(({iv, at, message}) => {

    // add hidden fields with values for to be used to call our webhook:
    // - Header[X-Authentication-Tag]    = authTag hidden field (name=at)
    // - Header[X-Initialization-Vector] = initializationVector hidden field (name=iv)
    // - Response body                   = body hidden field (name=message)
    //
    // Look at the ENDPOINTS passed to our docker service http-catcher to see the settings that glue this thing together

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'transactionId'
    input.value = context.transactionId;

    const initializationVector = document.createElement('input');
    initializationVector.type = 'hidden';
    initializationVector.name = 'iv'
    initializationVector.value = iv;

    const authTag = document.createElement('input');
    authTag.type = 'hidden';
    authTag.name = 'at'
    authTag.value = at;

    const body = document.createElement('input');
    body.type = 'hidden';
    body.name = 'message'
    body.value = message;

    form.innerHTML = '';
    form.method = 'post';
    form.action = 'http://127.0.0.1:3001/sibs-mock-form-submit'
    form.appendChild(header);
    form.appendChild(subHeader);
    form.appendChild(button);
    form.appendChild(input);

    // fields for the side effect that will call our webhook
    form.appendChild(initializationVector);
    form.appendChild(authTag);
    form.appendChild(body);
  });


}

async function encryptMessage(secret, value) {

  const key = await window.crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(secret),
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );

  let encoded = new TextEncoder().encode(value);
  // The iv must never be reused with a given key.
  const iv = window.crypto.getRandomValues(new Uint8Array(6));
  const additionalData = new TextEncoder().encode(UUIDGenerator().split('-')[0]);
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData // believe this is not being used for anything, but...
    },
    key,
    encoded
  );

  return {
    at: arrayBufferToBase64(additionalData),
    iv: arrayBufferToBase64(iv),
    message: arrayBufferToBase64(
      ciphertext.slice(0, ciphertext.byteLength - 16)
    )
  };
}

// https://stackoverflow.com/a/21797381/9014097
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function UUIDGenerator() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

form();




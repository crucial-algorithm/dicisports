function form() {
  const btnRingClasses =
    'focus-ring absolute inset-0 rounded-full opacity-100 disabled:opacity-50 transform transition bg-inverse';
  const btnOuterClasses =
    'group relative inline-flex transition opacity-100 text-lg font-medium focus:outline-none disabled:opacity-50 mt-4 mr-2 w-48';
  const btnInnerClasses =
    'relative flex items-center justify-center w-full h-full whitespace-nowrap text-inverse px-8 py-4 space-x-3';

  const header = document.createElement('h4');

  header.className =
    'leading-tight text-xl mb-2 mt-8 text-black dark:text-white';
  header.innerHTML = 'Submitting mokc payment form to SIBS...';

  const ccRing = document.createElement('div');
  const referenceRing = document.createElement('div');
  const mbwayRing = document.createElement('div');
  const declineRing = document.createElement('div');

  ccRing.className = btnRingClasses;
  referenceRing.className = btnRingClasses;
  mbwayRing.className = btnRingClasses;
  declineRing.className = btnRingClasses;

  const referenceContent = document.createElement('div');
  const mbwayContent = document.createElement('div');
  const ccContent = document.createElement('div');
  const declineContent = document.createElement('div');

  referenceContent.className = btnInnerClasses;
  referenceContent.innerHTML = 'Multibanco';
  mbwayContent.className = btnInnerClasses;
  mbwayContent.innerHTML = 'MB Way';
  ccContent.className = btnInnerClasses;
  ccContent.innerHTML = 'Credit Card';
  declineContent.className = btnInnerClasses;
  declineContent.innerHTML = 'Decline';

  const form = document.querySelector('form[spg-context]');
  const context = JSON.parse(form.getAttribute('spg-context'));

  form.innerHTML = '';

  const referenceButton = document.createElement('button');

  referenceButton.className = btnOuterClasses;
  referenceButton.type = 'button';
  referenceButton.name = 'pay-reference';
  referenceButton.onclick = async () => {
    const { amount, merchantTransactionId } = gatherTransactionData();

    await generateFormContent('REFERENCE', amount);
    await pushPaymentStatus(
      context.transactionID,
      amount,
      merchantTransactionId,
      'REFERENCE'
    );

    form.action = 'http://127.0.0.1:3001/sibs-mock-form-submit';
    form.submit();
  };

  const mbwayButton = document.createElement('button');

  mbwayButton.className = btnOuterClasses;
  mbwayButton.type = 'button';
  mbwayButton.name = 'pay-mbway';
  mbwayButton.onclick = async () => {
    const { amount, merchantTransactionId } = gatherTransactionData();

    await generateFormContent('MBWAY', amount);
    await pushPaymentStatus(
      context.transactionID,
      amount,
      merchantTransactionId,
      'MBWAY'
    );

    form.action = 'http://127.0.0.1:3001/sibs-mock-form-submit';
    form.submit();
  };

  const ccButton = document.createElement('button');

  ccButton.className = btnOuterClasses;
  ccButton.type = 'button';
  ccButton.name = 'pay-cc';
  ccButton.onclick = async () => {
    const { amount, merchantTransactionId } = gatherTransactionData();

    await generateFormContent('CARD', amount, true);
    await pushPaymentStatus(
      context.transactionID,
      amount,
      merchantTransactionId,
      'CARD'
    );

    form.action = 'http://127.0.0.1:3001/sibs-mock-form-submit/cc';
    form.submit();
  };

  const declineButton = document.createElement('button');

  declineButton.className = btnOuterClasses;
  declineButton.type = 'button';
  declineButton.name = 'decline';
  declineButton.onclick = async () => {

    const { amount, merchantTransactionId } = gatherTransactionData();

    await generateFormContent('CARD', amount, false);
    await pushPaymentStatus(
      context.transactionID,
      amount,
      merchantTransactionId,
      'CARD'
    );

    form.action = 'http://127.0.0.1:3001/sibs-mock-form-submit/';
    form.submit();
  };

  referenceButton.appendChild(referenceRing);
  referenceButton.appendChild(referenceContent);
  form.appendChild(referenceButton);

  mbwayButton.appendChild(mbwayRing);
  mbwayButton.appendChild(mbwayContent);
  form.appendChild(mbwayButton);

  ccButton.appendChild(ccRing);
  ccButton.appendChild(ccContent);
  form.appendChild(ccButton);

  declineButton.appendChild(declineRing);
  declineButton.appendChild(declineContent);
  form.appendChild(declineButton);

  async function generateFormContent(method, amount, success = true) {
    const payload = {
      returnStatus: success
        ? { statusMsg: 'Success', statusCode: '000' }
        : {
            statusMsg: 'Declined',
            statusCode: '01.106.0004',
            statusDescription:
              'Card holder abandoned the transaction (push notification not accepted nor refused)'
          },
      paymentStatus: success ? 'Success' : 'Declined',
      paymentMethod: method,
      transactionID: context.transactionId,
      amount: { currency: 'EUR', value: amount },
      merchant: { terminalId: 1000000, transactionId: context.transactionId },
      paymentType: 'PURS',
      notificationID: UUIDGenerator()
    };

    // for local dev, we will use this secret which needs to be setup in .env file
    const secret = 'O0Bur9uhZkS54NkwFhVyeutED6DhLbOQUBDt3i3W/C4=';

    await encryptMessage(secret, JSON.stringify(payload)).then(
      ({ iv, at, message }) => {
        // add hidden fields with values for to be used to call our webhook:
        // - Header[X-Authentication-Tag]    = authTag hidden field (name=at)
        // - Header[X-Initialization-Vector] = initializationVector hidden field (name=iv)
        // - Response body                   = body hidden field (name=message)
        //
        // Look at the ENDPOINTS passed to our docker service http-catcher to see the settings that glue this thing together

        const input = document.createElement('input');

        input.type = 'hidden';
        input.name = 'transactionId';
        input.value = context.transactionId;

        const initializationVector = document.createElement('input');

        initializationVector.type = 'hidden';
        initializationVector.name = 'iv';
        initializationVector.value = iv;

        const authTag = document.createElement('input');

        authTag.type = 'hidden';
        authTag.name = 'at';
        authTag.value = at;

        const body = document.createElement('input');

        body.type = 'hidden';
        body.name = 'message';
        body.value = message;

        form.method = 'post';
        //form.action = 'http://127.0.0.1:5001/sibs-mock-form-submit';
        form.appendChild(header);
        form.appendChild(input);

        // fields for the side effect that will call our webhook
        form.appendChild(initializationVector);
        form.appendChild(authTag);
        form.appendChild(body);
      }
    );
  }
}

async function encryptMessage(secret, value) {
  const key = await window.crypto.subtle.importKey(
    'raw',
    base64ToArrayBuffer(secret),
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );

  const encoded = new TextEncoder().encode(value);
  // The iv must never be reused with a given key.
  const iv = window.crypto.getRandomValues(new Uint8Array(6));
  const additionalData = new TextEncoder().encode(
    UUIDGenerator().split('-')[0]
  );
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
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
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

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

async function pushPaymentStatus(
  transactionID,
  amount,
  merchantTransactionId,
  paymentMethod
) {

  const body = {
    merchant: {
      terminalId: '57677',
      merchantTransactionId
    },
    transactionID,
    amount: {
      currency: 'EUR',
      value: amount
    },
    paymentType: 'PREF',
    paymentStatus: 'Pending',
    paymentMethod,
    execution: {
      endTime: new Date().toISOString(),
      startTime: new Date().toISOString()
    },
    returnStatus: {
      statusCode: '000',
      statusMsg: 'Success',
      statusDescription: 'Success'
    }
  };

  if (paymentMethod === 'REFERENCE') {
    body.paymentReference = {
      entity: '24000',
      reference: '883960846',
      paymentEntity: '24000',
      amount: {
        value: '46.0',
        currency: 'EUR'
      },
      status: 'PARTPAIDCLS',
      expireDate: '2070-01-01T00:00:00.000+01:00'
    };
  }

  const response = await fetch('http://127.0.0.1:3001/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (response.ok) {
    console.log('Payment status pushed successfully');
  } else {
    console.error('Failed to push payment status');
  }
}

function gatherTransactionData() {
  const amount = Number(
    document.querySelector('[data-cy="total-price"]').textContent.replace('€', '')
  );

  const url = new URL(window.location.href);
  const merchantTransactionId = url.pathname.split('/').pop();

  console.log({ amount, merchantTransactionId });

  return { amount, merchantTransactionId };
}

form();

const contractSource = `
  contract Paey =

    record payment =
      { companyAddress : address,
        clientAddress  : address,
        companyName    : string,
        clientName     : string,
        clientEmail    : string,
        payingFor      : string,
        amount         : int }

    record charge =
      {
        paeyAddress   : address,
        clientAddress : address,
        companyName   : string,
        clientName    : string,
        amountPaid    : int,
        paeyCharge    : int }

    record buy =
      {
        paeyAddress   : address,
        buyerAddress  : address,
        transRef      : string,
        rate          : string,
        fiatSent      : string,
        aeEquivalent  : int,
        completed     : bool }

    record sell =
      { paeyAddress    : address,
        sellerAddress  : address,
        transRef       : string,
        rate           : string,
        aeSent         : int,
        fiatEquivalent : string,
        completed      : bool }

    record state =
      { payments        : map(int, payment),
        paymentsLength  : int,
        charges         : map(int, charge),
        chargesLength   : int,
        buys            : map(int, buy),
        buysLength      : int,
        sells           : map(int, sell),
        sellsLength     : int }

    entrypoint init() =
      { payments = {},
        paymentsLength = 0,
        charges = {},
        chargesLength = 0,
        buys = {},
        buysLength = 0,
        sells = {},
        sellsLength = 0 }

    entrypoint payments_length() : int =
      state.paymentsLength

    entrypoint charges_length() : int =
      state.chargesLength

    entrypoint buys_length() : int =
      state.buysLength

    entrypoint sells_length() : int =
      state.sellsLength

    public stateful entrypoint payment(companyAddress' : address, companyName' : string, clientName' : string, clientEmail' : string, payingFor' : string, amount' : int) =
      let payment = { companyAddress = companyAddress', clientAddress = Call.caller, companyName = companyName', clientName = clientName', clientEmail = clientEmail', payingFor = payingFor', amount = amount' }
      let paymentIndex = payments_length() + 1
      Chain.spend(payment.companyAddress, Call.value)
      put(state{ payments[paymentIndex] = payment, paymentsLength = paymentIndex })

    public stateful entrypoint charge(companyName' : string, clientName' : string, amountPaid' : int, paeyCharge' : int) =
      let charge = { paeyAddress = ak_s3Qt2boW7eqP2o1maYoKXnbPovjjJGDcSYc4csyJqsZzVKc26, clientAddress = Call.caller, companyName = companyName', clientName = clientName', amountPaid = amountPaid', paeyCharge = paeyCharge' }
      let chargeIndex = charges_length() + 1
      Chain.spend(charge.paeyAddress, Call.value)
      put(state{ charges[chargeIndex] = charge, chargesLength = chargeIndex })

    public stateful entrypoint buy(transRef' : string,rate' : string, fiatSent' : string, aeEquivalent' : int) =
      let buy = { paeyAddress = ak_s3Qt2boW7eqP2o1maYoKXnbPovjjJGDcSYc4csyJqsZzVKc26, buyerAddress = Call.caller, transRef = transRef', rate = rate', fiatSent = fiatSent', aeEquivalent = aeEquivalent', completed = false }
      let buyIndex = buys_length() + 1
      put(state{ buys[buyIndex] = buy, buysLength = buyIndex })

    public stateful entrypoint sell(transRef' : string, rate' : string, aeSent' : int, fiatEquivalent' : string) =
      let sell = { paeyAddress = ak_s3Qt2boW7eqP2o1maYoKXnbPovjjJGDcSYc4csyJqsZzVKc26, sellerAddress = Call.caller, transRef = transRef', rate = rate', aeSent = aeSent', fiatEquivalent = fiatEquivalent', completed = false }
      let sellIndex = sells_length() + 1
      Chain.spend(sell.paeyAddress, Call.value)
      put(state{ sells[sellIndex] = sell, sellsLength = sellIndex })

    stateful entrypoint completeBuy(index : int) =
      let buyer = get_buy(index)
      Chain.spend(buyer.buyerAddress, Call.value)
      let updatedPaeyAddress = Call.caller
      let updatedCompleted = true
      let updatedBuyAddress = state.buys{ [index].paeyAddress = updatedPaeyAddress }
      let updatedBuyCompleted = state.buys{ [index].completed = updatedCompleted }
      put(state{ buys = updatedBuyAddress })
      put(state{ buys = updatedBuyCompleted })

    stateful entrypoint completeSell(index : int) =
      let updatedCompleted = true
      let updatedSells = state.sells{ [index].completed = updatedCompleted }
      put(state{ sells = updatedSells })

    entrypoint get_payment(paymentIndex : int) : payment =
      switch(Map.lookup(paymentIndex, state.payments))
        None    => abort("There was no payment with this index registered.")
        Some(x) => x

    entrypoint get_charge(chargeIndex : int) : charge =
      switch(Map.lookup(chargeIndex, state.charges))
        None    => abort("There was no charge with this index registerd.")
        Some(x) => x

    entrypoint get_buy(buyIndex : int) : buy =
      switch(Map.lookup(buyIndex, state.buys))
        None    => abort("There was no buy with this index registered.")
        Some(x) => x

    entrypoint get_sell(sellIndex : int) : sell =
      switch(Map.lookup(sellIndex, state.sells))
        None    => abort("There was no sell with this index registered.")
        Some(x) => x
`;

const contractAddress = 'ct_TvzbFmazQg5m84NRFkcNJP9g5Mjymbr7UFxx9VZfHBor9gkPT';
var paymentsClient = null;
var paymentsContractInstance = null;
var paymentArray = [];
var paymentsLength = 0;

function renderPayments() {
  let paymentTemplate = $('#paymentTemplate').html();
  Mustache.parse(paymentTemplate);
  let paymentRendered = Mustache.render(paymentTemplate, {paymentArray});
  $('#paymentBody').html(paymentRendered);
}

window.addEventListener('load', async () => {
  $("#loading").show();

  paymentsClient = await Ae.Aepp();
  paymentsContractInstance = await paymentsClient.getContractInstance(contractSource, {contractAddress});

  paymentsLength = (await paymentsContractInstance.methods.payments_length()).decodedResult;

  for (let i = 1; i <= paymentsLength; i++) {
    const payment = (await paymentsContractInstance.methods.get_payment(i)).decodedResult;

    paymentArray.push({
      companyName: payment.companyName,
      clientName: payment.clientName,
      paidFor: payment.payingFor,
      amount: payment.amount / 1000000000000000000 + 'æ',
    })
  }

  renderPayments();

  $("#loading").hide();
});

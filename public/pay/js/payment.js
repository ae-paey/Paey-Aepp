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
var client = null;
var contractInstance = null;
var companyName;
var companyAddress;

//Execute main function
window.addEventListener('load', async () => {
  client = await Ae.Aepp();
  contractInstance = await client.getContractInstance(contractSource, {contractAddress});
});

$('#confirmPaymentBtn').click(function(){
  $("#confirmation").show();

  var inputCompanyName = ($("#inputCompanyName").val());
  var clientEmail = ($("#inputClientEmail").val());
  var clientName = ($("#inputClientName").val());
  var payingFor = ($("#inputPayingFor").val());
  var amount = ($("#InputCryptoAmount").val());
  var paeyCharges = 0.1 * amount;

  var db = firebase.firestore();

  db.collection("Companies").doc(inputCompanyName).get().then(function(doc) {
    if (doc.exists) {
      companyName = doc.data().companyName;
      document.getElementById("companyName").innerHTML = companyName;
    } else {
      console.log("No such document!");
    }
  }).catch(function(error) {
    console.log("Error getting document:", error);
  });

  document.getElementById("companyName").innerHTML = companyName;
  document.getElementById("clientEmail").innerHTML = clientEmail;
  document.getElementById("clientName").innerHTML = clientName;
  document.getElementById("payingFor").innerHTML = payingFor;
  document.getElementById("cryptoAmount").innerHTML = amount + ' AE';
  document.getElementById("paeyCharges").innerHTML = paeyCharges + ' AE';
});

$("#paymentForm").validator().on("submit", function (event) {
  if (event.isDefaultPrevented()) {
    $("#confirmation").hide();
    formError();
    submitMSG(false, "Did you fill in the form properly?");
  } else {
    event.preventDefault();
    submitForm();
  }
});

function submitForm(){
  $("#confirmation").hide();
  $("#loading").show();

  const inputCompanyName = ($("#inputCompanyName").val());
  var db = firebase.firestore();

  db.collection("Companies").doc(inputCompanyName).get().then(async function(doc) {
    if (doc.exists) {
      companyName = doc.data().companyName;
      companyAddress = doc.data().companyAddress;

      const clientEmail = ($("#inputClientEmail").val()),
            clientName = ($("#inputClientName").val()),
            payingFor = ($("#inputPayingFor").val()),
            cryptoType = ($("#inputCryptoType").val()),
            amount = $("#InputCryptoAmount").val(),
            cryptoAmount = amount * 1000000000000000000,
            chargesAmount = 0.1 * amount,
            paeyCharges = 0.1 * cryptoAmount;
            date = new Date();

      await contractInstance.methods.charge(companyName, clientName, cryptoAmount, paeyCharges, { amount: paeyCharges })
      .catch(function(error) {
        formError();
        submitMSG(false,error);
        stop();
      })
      .then(async function() {
        await contractInstance.methods.payment(companyAddress, companyName, clientName, clientEmail, payingFor, cryptoAmount, { amount: cryptoAmount })
        .catch(function(error) {
          formError();
          submitMSG(false,error);
          stop();
        })
        .then(function() {
          db.collection(companyName + ' Payment').add({
            clientEmail: clientEmail,
            clientName: clientName,
            paidFor: payingFor,
            cryptoType: cryptoType,
            cryptoAmount: amount + ' ' + cryptoType,
            paeyCharges: chargesAmount + ' ' + cryptoType,
            date: date,
          })
          .catch(function(error) {
            formError();
            submitMSG(false,error);
            stop();
          })
          .then(function() {
            formSuccess();
          })
        });
      });
    } else {
      formError();
      submitMSG(false, "Company Not Registered. Visit https://paey.herokuapp.com now to register your company");
    }
  }).catch(function(error) {
    var messsage = "Error getting Company: " + error;
    formError();
    submitMSG(false, messsage);
  });

  $("#loading").hide(); 
}

function formSuccess(){
  $("#paymentForm")[0].reset();
  submitMSG(true, "Your payment was sent successfully");
}

function formError(){
  $("#paymentForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
    $(this).removeClass();
  });
}

function stop(){
  break;
}

function submitMSG(valid, msg){
  if(valid){
    var msgClasses = "h3 text-left tada animated text-success";
  } else {
    var msgClasses = "h3 text-left text-danger";
  }
  $("#paymentSubmit").removeClass().addClass(msgClasses).text(msg);
}
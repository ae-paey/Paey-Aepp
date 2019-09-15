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
var tradeClient = null;
var tradeContractInstance = null;
var NGNBuyRate;
var USDBuyRate;
var NGNSellRate;
var USDSellRate;
var payStackBuyRef;
const date = new Date(); 

//Execute main function
window.addEventListener('load', () => {
  var db = firebase.firestore();

  db.collection("Settings").doc("Rate").get().then(function(doc) {
    if (doc.exists) {
      const aeRate = doc.data().aeRate;
      const USDRate = doc.data().USDRate;
      const NGNRate = aeRate * USDRate;

      NGNBuyRate = Math.round(NGNRate + (NGNRate * 0.5));
      USDBuyRate = Math.round((aeRate + (aeRate *0.55)) * 100) / 100;

      NGNSellRate = Math.round(NGNRate * 0.7);
      USDSellRate = Math.round((aeRate * 0.65) * 100) / 100;

      document.getElementById("USDBuyRate").innerHTML = USDBuyRate;
      document.getElementById("NGNBuyRate").innerHTML = NGNBuyRate;
      document.getElementById("USDSellRate").innerHTML = USDSellRate;
      document.getElementById("NGNSellRate").innerHTML = NGNSellRate;
    } else {
      console.log("Rate not found!");
    }
  }).catch(function(error) {
    console.log("Error getting document:", error);
  });
});

$('#confirmBuyBtn').click(function(){
  $("#buy-confirmation").show();

  var inputBuyFiatType = ($("#inputBuyFiatType").val());
  var buyerEmail = ($("#inputBuyerEmail").val());
  var inputBuyFiatAmount = ($("#inputBuyFiatAmount").val());

  if (inputBuyFiatType === 'NGN') {
    var buyFiatType = "Naira (₦)";
    var buyFiatAmount = '₦' + inputBuyFiatAmount;
    var buyAeEquivalent = Math.round(inputBuyFiatAmount / NGNBuyRate) + 'æ';
  } else {
    var buyFiatType = "Dollar ($)";
    var buyFiatAmount = '$' + inputBuyFiatAmount;
    var buyAeEquivalent = Math.round(inputBuyFiatAmount / USDBuyRate) + 'æ';
  }

  document.getElementById("buyFiatType").innerHTML = buyFiatType;
  document.getElementById("buyBuyerEmail").innerHTML = buyerEmail;
  document.getElementById("buyFiatAmount").innerHTML = buyFiatAmount;
  document.getElementById("buyAeEquivalent").innerHTML = buyAeEquivalent;
});

$('#confirmSellBtn').click(function(){
  $("#sell-confirmation").show();

  var inputSellAeAmount = ($("#inputSellAeAmount").val());
  var inputSellFiatType = ($("#inputSellFiatType").val());
  var bankName = ($("#inputBankName").val());
  var accountNumber = ($("#inputAccountNumber").val());
  var accountName = ($("#inputAccountName").val());

  if (inputSellFiatType === 'NGN') {
    var sellFiatType = "Naira (₦)";
    var sellAeAmount = inputSellAeAmount + 'æ';
    var sellFiatEquivalent = '₦' + Math.round(inputSellAeAmount * NGNSellRate);
  } else {
    var sellFiatType = "Dollar ($)";
    var sellAeAmount = inputSellAeAmount + 'æ';
    var sellFiatEquivalent = '$' + Math.round(inputSellAeAmount * USDSellRate);
  }

  document.getElementById("sellAeAmount").innerHTML = sellAeAmount;
  document.getElementById("sellFiatType").innerHTML = sellFiatType;
  document.getElementById("sellFiatEquivalent").innerHTML = sellFiatEquivalent;
  document.getElementById("bankName").innerHTML = bankName;
  document.getElementById("accountNumber").innerHTML = accountNumber;
  document.getElementById("accountName").innerHTML = accountName;
});

$("#buyForm").validator().on("submit", function (event) {
  if (event.isDefaultPrevented()) {
    $("#buy-confirmation").hide();
    $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      $(this).removeClass();
    });
    submitBuyMSG(false, "Did you fill in the form properly?");
  } else {
    event.preventDefault();
    submitBuyForm();
  }
});

$("#sellForm").validator().on("submit", function (event) {
  if (event.isDefaultPrevented()) {
    $("#sell-confirmation").hide();
    $("#sellForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      $(this).removeClass();
    });
    submitSellMSG(false, "Did you fill in the form properly?");
  } else {
    event.preventDefault();
    submitSellForm();
  }
});

function submitBuyForm(){
  $("#buy-confirmation").hide();
  $("#loading").show();

  var db = firebase.firestore();

  db.collection("Settings").doc("PayStack").get().then(function(doc) {
    if (doc.exists) {
      const payStackKey = doc.data().testPublicKey,
            buyFiatType = ($("#inputBuyFiatType").val()),
            buyerEmail = ($("#inputBuyerEmail").val()),
            buyFiatAmount = ($("#inputBuyFiatAmount").val());

      if (buyFiatType === 'NGN') {
        var buyRate = '₦' + NGNBuyRate + '/æ';
        var fiatSent = '₦' + buyFiatAmount;
        var buyAeEquivalent = Math.round(buyFiatAmount / NGNBuyRate);
      } else {
        var buyRate = '$' + USDBuyRate + '/æ';
        var fiatSent = '$' + buyFiatAmount;
        var buyAeEquivalent = Math.round(buyFiatAmount / USDBuyRate);
      }

      var handler = PaystackPop.setup({
        key: payStackKey,
        email: buyerEmail,
        amount: buyFiatAmount * 100,
        currency: buyFiatType,
        ref: 'Paey-Buy'+Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
            custom_fields: [
              {
                  display_name: "Ae Equivalent",
                  variable_name: "ae_equivalent",
                  value: buyAeEquivalent + 'æ'
              }
            ]
        },
        callback: function(response){
          payStackBuyRef = response.reference;
          aeBuy()
        },
        onClose: function(){
          $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass();
          });
          submitBuyMSG(false,"Window Closed");
          $("#loading").hide();
          stop();
        }
      });
      handler.openIframe();

      async function aeBuy() {
        tradeClient = await Ae.Aepp();
        tradeContractInstance = await tradeClient.getContractInstance(contractSource, {contractAddress});
    
        await tradeContractInstance.methods.buy(payStackBuyRef, buyRate, fiatSent, buyAeEquivalent)
        .catch(function(error) {
          $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass();
          });
          submitBuyMSG(false,error);
        })
        .then(function() {
          db.collection("Buys").doc(payStackBuyRef).set({
            fiatType: buyFiatType,
            buyerEmail: buyerEmail,
            rate: buyRate,
            fiatSent: fiatSent,
            aeEquivalent: buyAeEquivalent,
            date: date,
          })
          .catch(function(error) {
            $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
              $(this).removeClass();
            });
            submitBuyMSG(false,error);
          })
          .then(function() {
            $("#buyForm")[0].reset();
            var message = 'Success. Your transaction ref is ' + payStackBuyRef + '. Your wallet will be credited with '+  buyAeEquivalent + 'æ soon. Check the List of Transaction at https://aepp-paey.web.app/trade/trans.html to see the status of your transaction';
            submitBuyMSG(true, message);
          })
        })
      }
    } else {
      $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
        $(this).removeClass();
      });
      submitBuyMSG(false, "PayStack Key Not Found");
    }
  }).catch(function(error) {
    $("#buyForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      $(this).removeClass();
    });
    submitBuyMSG(false, error);
  });

  $("#loading").hide(); 
}

async function submitSellForm(){
  $("#sell-confirmation").hide();
  $("#loading").show();

  const sellAeAmount = ($("#inputSellAeAmount").val()),
        sellFiatType = ($("#inputSellFiatType").val()),
        bankName = ($("#inputBankName").val()),
        accountNumber = ($("#inputAccountNumber").val()),
        accountName = ($("#inputAccountName").val()),
        payStackSellRef = 'Paey-Sell'+Math.floor((Math.random() * 1000000000) + 1),
        aeValue = sellAeAmount * 1000000000000000000;

  var db = firebase.firestore();

  if (sellFiatType === 'NGN') {
    var sellRate = '₦' + NGNSellRate + '/æ';
    var sellFiatEquivalent = '₦' + Math.round(sellAeAmount * NGNSellRate);
  } else {
    var sellRate = '$' + USDSellRate + '/æ';
    var sellFiatEquivalent = '$' + Math.round(sellAeAmount * USDSellRate);
  }

  tradeClient = await Ae.Aepp();
  tradeContractInstance = await tradeClient.getContractInstance(contractSource, {contractAddress});

  await tradeContractInstance.methods.sell(payStackSellRef, sellRate, sellAeAmount, sellFiatEquivalent, {amount: aeValue})
  .catch(function(error) {
    $("#sellForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      $(this).removeClass();
    });
    submitSellMSG(false,error);
  })
  .then(function() {
    db.collection("Sells").doc(payStackSellRef).set({
      fiatType: sellFiatType,
      rate: sellRate,
      aeSent: sellAeAmount + 'æ',
      fiatEquivalent: sellFiatEquivalent,
      bankName: bankName,
      accountName: accountName,
      accountNumber: accountNumber,
      date: date,
    })
    .catch(function(error) {
      $("#sellForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
        $(this).removeClass();
      });
      submitSellMSG(false,error);
    })
    .then(function() {
      $("#sellForm")[0].reset();
      var message = 'Success. Your transaction ref is ' + payStackSellRef + '. Your ' + bankName + ' account will be credited with '+  sellFiatEquivalent + ' soon. Check the List of Transaction at https://aepp-paey.web.app/trade/trans.html to see the status of your transaction';
      submitSellMSG(true, message);
    })
  })

  $("#loading").hide(); 
}

function stop(){
  break;
}

function submitBuyMSG(valid, msg){
  if(valid){
    var msgClasses = "h3 text-left tada animated text-success";
  } else {
    var msgClasses = "h3 text-left text-danger";
  }
  $("#buySubmit").removeClass().addClass(msgClasses).text(msg);
}

function submitSellMSG(valid, msg){
  if(valid){
    var msgClasses = "h3 text-left tada animated text-success";
  } else {
    var msgClasses = "h3 text-left text-danger";
  }
  $("#sellSubmit").removeClass().addClass(msgClasses).text(msg);
}
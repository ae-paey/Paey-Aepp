const contractSource = `
  contract PaeyPay =

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
      paeyCharge   : int }

  record state =
    { payments        : map(int, payment),
      paymentsLength  : int,
      charges         : map(int, charge),
      chargesLength   : int }

  entrypoint init() =
    { payments = {},
      paymentsLength = 0,
      charges = {},
      chargesLength = 0 }

  entrypoint get_payments_length() : int =
    state.paymentsLength

  entrypoint get_charges_length() : int =
    state.chargesLength

  public stateful entrypoint make_payment(companyAddress' : address, companyName' : string, clientName' : string, clientEmail' : string, payingFor' : string, amount' : int) =
    let payment = { companyAddress = companyAddress', clientAddress = Call.caller, companyName = companyName', clientName = clientName', clientEmail = clientEmail', payingFor = payingFor', amount = amount' }
    let index = get_payments_length() + 1
    Chain.spend(payment.companyAddress, Call.value)
    put(state{ payments[index] = payment, paymentsLength = index })

  public stateful entrypoint pay_charge(companyName' : string, clientName' : string, amountPaid' : int, paeyCharge' : int) =
    let charge = { paeyAddress = ak_s3Qt2boW7eqP2o1maYoKXnbPovjjJGDcSYc4csyJqsZzVKc26, clientAddress = Call.caller, companyName = companyName', clientName = clientName', amountPaid = amountPaid', paeyCharge = paeyCharge' }
    let chargeIndex = get_charges_length() + 1
    Chain.spend(charge.paeyAddress, Call.value)
    put(state{ charges[chargeIndex] = charge, chargesLength = chargeIndex})

  entrypoint get_payment(index : int) : payment =
    switch(Map.lookup(index, state.payments))
      None    => abort("There was no payment with this index registered.")
      Some(x) => x

  entrypoint get_charges(chargeIndex : int) : charge =
    switch(Map.lookup(chargeIndex, state.charges))
      None    => abort("There was no charge with this index registerd.")
      Some(x) => x
`;

const contractAddress = 'ct_664M8eXuMPWW6PFHpQpXifW7QfQE6Dps3VvyQqLFcQKMD1uPB';
var client = null;
var contractInstance = null;

window.addEventListener('load', async () => {
  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.
  client = await Ae.Aepp();
  contractInstance = await client.getContractInstance(contractSource, {contractAddress});
});

$('#confirmPaymentBtn').click(function(){
  $("#confirmation").show();

  var companyName = ($("#inputCompanyName").val());
  var clientEmail = ($("#inputClientEmail").val());
  var clientName = ($("#inputClientName").val());
  var payingFor = ($("#inputPayingFor").val());
  var amount = ($("#InputCryptoAmount").val());
  var paeyCharges = 0.1 * amount;

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
  }
});

$('#paymentsubmit').click(async function(){
  $("#confirmation").hide();
  $("#loading").show();

  var companyName = ($("#inputCompanyName").val());
  var companyAddress = ($("#inputCompanyAddress").val());
  var clientEmail = ($("#inputClientEmail").val());
  var clientName = ($("#inputClientName").val());
  var payingFor = ($("#inputPayingFor").val());
  var cryptoType = $("#inputCryptoType").val();
  var amount = ($("#InputCryptoAmount").val());
  var cryptoAmount = amount * 1000000000000000000;
  var chargesAmount = 0.1 * amount;
  var paeyCharges = 0.1 * cryptoAmount;
  var date = new Date();
  var db = firebase.firestore();

  await contractInstance.methods.pay_charge(companyName, clientName, cryptoAmount, paeyCharges, {amount: paeyCharges}).catch(console.error);
  await contractInstance.methods.make_payment(companyAddress, companyName, clientName, clientEmail, payingFor, cryptoAmount, {amount: cryptoAmount}).catch(console.error);

  db.collection(companyName + ' Payment').add({
    companyName: companyName,
    companyAddress: companyAddress,
    clientEmail: clientEmail,
    clientName: clientName,
    payingFor: payingFor,
    cryptoType: cryptoType,
    cryptoAmount: amount + ' AE',
    paeyCharges: chargesAmount + ' AE',
    date: date,
  })
  .then(function() {
    formSuccess();
  })
  .catch(function(error) {
    formError();
    submitMSG(false,error);
  });

  $("#loading").hide();  
});

function formSuccess(){
  $("#paymentForm")[0].reset();
  submitMSG(true, "Your payment was sent successfully")
}

function formError(){
  $("#paymentForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
    $(this).removeClass();
  });
}

function submitMSG(valid, msg){
  if(valid){
    var msgClasses = "h3 text-left tada animated text-success";
  } else {
    var msgClasses = "h3 text-left text-danger";
  }
  $("#paymentSubmit").removeClass().addClass(msgClasses).text(msg);
}
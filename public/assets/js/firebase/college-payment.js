(function() {
  $("#collegeForm").validator().on("submit", function (event) {
    if (event.isDefaultPrevented()) {
      formError();
      submitMSG(false, "Did you fill in the form properly?");
    } else {
      event.preventDefault();
      $("#loading").show();
      submitPayment();
      $("#loading").hide();
    }
  });

  const contractSource = `
    contract CollegePayment =

    record payment =
      { edupayAddress  : address,
        studentAddress : address,
        schoolName     : string,
        matricNumber   : string,
        paymentType    : string,
        amount         : int }

    record state =
      { payments        : map(int, payment),
        paymentsLength  : int }

    function init() =
      { payments = {},
        paymentsLength = 0 }

    public function getPaymentsLength() : int =
      state.paymentsLength

    public stateful function makePayment(schoolName' : string, matricNumber' : string, paymentType' : string, amount' : int) =
      let payment = { edupayAddress = ak_W7yGw6Z1WtGQ82crCZsoFpHJyr3dQsQNSxJDJAGTinrFC3gqy, studentAddress = Call.caller, schoolName = schoolName', matricNumber = matricNumber', paymentType = paymentType', amount = amount'}
      let index = getPaymentsLength() + 1
      Chain.spend(payment.edupayAddress, Call.value)
      put(state{ payments[index] = payment, paymentsLength = index })

    public function getPayment(index : int) : payment =
      switch(Map.lookup(index, state.payments))
        None    => abort("There was no payment with this index registered.")
        Some(x) => x
  `;

  const contractAddress = 'ct_ZJ7EGkRCDQ2Ru4AgKYSXQ2Ne2rwBvhFRExpydQdRuBkAPu9k7';

  async function contractCall(func, args, value) {
    const contract = await client.getContractInstance(contractSource, {contractAddress});
    const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

    return calledSet;
  }

  function submitPayment(){
    var matric = $("#CSMatric").val();
    var email = $("#CSEmail").val();
    var school = $("#CSSchool").val();
    var location = $("#CSAddress").val();
    var date = new Date();
    var time = new TimeRanges();
    var fee = $("#CSFeeType").val();
    var amountAET = $("#CSAmount").val();
    var amount = amountAET * 1000000000000000000;
    var db = firebase.firestore();
    var docID = Math.random().toString(36).substring(7);

    db.collection(school).doc(docID).set({
      StudentNo: matric,
      StudentEmail: email,
      StudentSchool: school,
      SchoolLocation: location,
      DateOfPayment: date,
      TimeOfPayment: time,
      FeeType: fee,
      AmountPaid: amount,
    })
    .then(async function() {
      await contractCall('makePayment', [school, matric, fee, amount], amount);
      formSuccess();
    })
    .catch(function(error) {
      formError();
      submitMSG(false,error);
    });
  }

  function formSuccess(){
    $("#collegeForm")[0].reset();
    submitMSG(true, "Your payment was sent successfully. Thanks!")
  }

  function formError(){
    $("#collegeForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
      $(this).removeClass();
    });
  }

  function submitMSG(valid, msg){
    if(valid){
      var msgClasses = "h3 text-left tada animated text-success";
    } else {
      var msgClasses = "h3 text-left text-danger";
    }
    $("#collegeSubmit").removeClass().addClass(msgClasses).text(msg);
  }
});
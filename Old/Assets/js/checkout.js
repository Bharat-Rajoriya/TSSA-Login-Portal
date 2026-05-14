$(document).ready(function(){

    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const portalId = getUrlParameter("id");

    if(!portalId){
        window.location.href = "../../index.html";
        return;
    }

    const portalSession = sessionStorage.getItem(portalId);

    if(!portalSession){
        window.location.href = "../../index.html";
        return;
    }

    const customerData = JSON.parse(portalSession);

    if(!customerData.serviceDetails){
        window.location.href = "service-details.html?id=" + portalId;
        return;
    }

    sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalId);

    initializeCheckoutPage(customerData, portalId);

});


// URL PARAMETER
function getUrlParameter(name){
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}


// INITIALIZE CHECKOUT PAGE
function initializeCheckoutPage(customerData, portalId){

    const totalFees = customerData.serviceDetails.totalFees || customerData.serviceDetails.authorizationFee || "$0.00";

    const formattedTotal = formatCurrency(totalFees);

    $("#checkoutPrepayment").text(formattedTotal);
    $("#checkoutSubtotal").text(formattedTotal);
    $("#checkoutTotal").text(formattedTotal);


    // Remove error state on typing
    $("input").on("input change", function(){
        $(this).removeClass("input-error");
    });


    // Card formatting
    $("#cardNumber").on("input", function(){
        $(this).val(formatCardNumber($(this).val()));
    });

    $("#expiryDate").on("input", function(){
        $(this).val(formatExpiryDate($(this).val()));
    });

    $("#cvd").on("input", function(){
        $(this).val($(this).val().replace(/\D/g, "").slice(0, 4));
    });


    // Submit payment
    $("#checkoutForm").on("submit", async function(e){

        e.preventDefault();

        await processPayment(portalId, formattedTotal);

    });
}


// PROCESS PAYMENT
async function processPayment(portalId, totalAmount){

    clearCheckoutErrors();

    const errors = [];

    const cardholderName = $("#cardholderName").val().trim();
    const cardNumber = $("#cardNumber").val().replace(/\D/g, "");
    const expiryDate = $("#expiryDate").val().trim();
    const cvd = $("#cvd").val().trim();


    // VALIDATIONS

    if(cardholderName === ""){
        errors.push("Please enter the Card holder name.");
        $("#cardholderName").addClass("input-error");
    }

    if(cardNumber.length < 13 || cardNumber.length > 16){
        errors.push("Please enter a valid Card Number.");
        $("#cardNumber").addClass("input-error");
    }

    if(!isValidExpiryDate(expiryDate)){
        errors.push("Please enter a valid Expiry Date in MM/YY format.");
        $("#expiryDate").addClass("input-error");
    }

    if(!/^\d{3,4}$/.test(cvd)){
        errors.push("Please enter a valid CVD.");
        $("#cvd").addClass("input-error");
    }


    // Stop if validation errors exist
    if(errors.length > 0){
        showCheckoutErrors(errors);
        return;
    }


    // PAYMENT SUCCESS MOCK
    // Replace later with Moneris callback success

    const sessionData = JSON.parse(sessionStorage.getItem(portalId));

    const paidAt = new Date().toISOString();

    const invoiceNumber = "INV-" + portalId.slice(0, 8).toUpperCase();


    sessionData.payment = {
        status: "paid",
        amount: totalAmount,
        paidAt: paidAt,
        cardLastFour: cardNumber.slice(-4),
        invoiceNumber: invoiceNumber,
        invoiceEmail: sessionData.serviceDetails.emailAddress
    };


    sessionStorage.setItem(portalId, JSON.stringify(sessionData));


    // SEND EMAIL USING POWER AUTOMATE

    try{

        await sendInvoiceEmail(sessionData);

        alert("Payment completed successfully. Invoice email has been sent.");

        // future redirect
        // window.location.href = "receipt.html?id=" + portalId;

    }catch(error){

        console.error(error);

        showCheckoutErrors([
            "Payment completed successfully but invoice email could not be sent. Please contact support."
        ]);
    }
}


// SEND EMAIL VIA POWER AUTOMATE
async function sendInvoiceEmail(sessionData){

    // Power Automate Flow URL
    const flowUrl = "POWER_AUTOMATE_HTTP_FLOW_URL_HERE";


    const payload = {

        customerName: sessionData.companyName || "",

        emailAddress: sessionData.serviceDetails.emailAddress || "",

        invoiceNumber: sessionData.payment.invoiceNumber || "",

        amountPaid: sessionData.payment.amount || "$0.00",

        paymentDate: new Date(sessionData.payment.paidAt).toLocaleString(),

        cardLastFour: sessionData.payment.cardLastFour || "",

        customerNumber: sessionData.customerNumber || "",

        programArea: sessionData.programArea || "",

        applicationForm: sessionData.applicationFormTitle || sessionData.applicationFormNumber || "",

        referenceId: sessionData.id || ""
    };


    const response = await fetch(flowUrl, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(payload)
    });


    if(!response.ok){
        throw new Error("Power Automate email request failed.");
    }

    return await response.text();
}


// FORMAT CARD NUMBER
function formatCardNumber(cardNumber){

    return cardNumber
        .replace(/\D/g, "")
        .slice(0, 16)
        .replace(/(.{4})/g, "$1 ")
        .trim();
}


// FORMAT EXPIRY DATE
function formatExpiryDate(expiryDate){

    const digits = expiryDate.replace(/\D/g, "").slice(0, 4);

    if(digits.length > 2){
        return digits.slice(0, 2) + "/" + digits.slice(2);
    }

    return digits;
}


// VALIDATE EXPIRY DATE
function isValidExpiryDate(expiryDate){

    if(!/^\d{2}\/\d{2}$/.test(expiryDate)){
        return false;
    }

    const parts = expiryDate.split("/");

    const month = parseInt(parts[0], 10);
    const year = parseInt("20" + parts[1], 10);

    if(month < 1 || month > 12){
        return false;
    }

    const expiry = new Date(year, month, 0, 23, 59, 59);

    return expiry >= new Date();
}


// FORMAT CURRENCY
function formatCurrency(amount){

    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));

    if(isNaN(numericAmount) || numericAmount <= 0){
        return "$0.00";
    }

    return "$" + numericAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}


// ERROR SUMMARY UI
function showCheckoutErrors(errors){

    $("#checkoutErrorList").empty();

    errors.forEach(function(error){
        $("#checkoutErrorList").append("<li>" + error + "</li>");
    });

    $("#checkoutErrorBox").slideDown();

    $("html, body").animate({
        scrollTop: $("#checkoutErrorBox").offset().top - 40
    }, 500);
}


function clearCheckoutErrors(){

    $("#checkoutErrorBox").hide();

    $("#checkoutErrorList").empty();

    $("input").removeClass("input-error");
}
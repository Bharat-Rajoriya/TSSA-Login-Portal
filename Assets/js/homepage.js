const MOCK_CUSTOMERS_STORAGE_KEY = "mockCustomers";
const defaultMockCustomers = [
    {
        customerNumber: "12345",
        postalCode: "B2B 2B2",
        customerName: "Unikove Pvt Ltd",
        streetAddress: "South Delhi",
        city: "Delhi",
        province: "Delhi"
    },
    {
        customerNumber: "55555",
        postalCode: "A1A 1A1",
        customerName: "ABC Industries",
        streetAddress: "Toronto Street",
        city: "Toronto",
        province: "Ontario"
    }
];

let mockCustomers = loadMockCustomers();

$(document).ready(function () {

    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const portalIdFromUrl = getPortalIdFromUrl();
    const $newCustomer = $('#newCustomer');
    const $existingCustomer = $('#existingCustomer');
    const $newCustomerForm = $('#newCustomerForm');
    const $oldCustomerForm = $('#oldCustomerForm');
    const $programAreaBox = $('#programAreaSection');
    const $continueBtn = $('#customerInfoForm .continue-btn');

//    radio btn  for existing and new user 
    function updateCustomerForm() {

        if ($newCustomer.is(':checked')) {
            $existingCustomer.prop('checked', false);
            $newCustomerForm.slideDown();
            $oldCustomerForm.hide();
            $programAreaBox.slideDown();
            return;
        }

        if ($existingCustomer.is(':checked')) {
            $newCustomer.prop('checked', false);
            $newCustomerForm.hide();
            $oldCustomerForm.slideDown();
            $programAreaBox.slideDown();
            return;
        }

        $newCustomerForm.hide();
        $oldCustomerForm.hide();
        $programAreaBox.hide();
    }

    $newCustomer.on('change', updateCustomerForm);
    $existingCustomer.on('change', updateCustomerForm);
    if (portalIdFromUrl) {
        sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalIdFromUrl);
    }
    restoreActivePortalSession();
    updateCustomerForm();
    restorePortalStepFromSession();



    $("input, select").on("input change", function () {
        $(this).removeClass("input-error");
    });

    $("#postalCode, #existingPostalCode").on("input", function () {
        $(this).val(formatCanadianPostalCode($(this).val()));
    });


    // Button Function Code 
    $continueBtn.on('click', function (e) {
        e.preventDefault();

        clearValidationErrors();

        let errors = [];

        const customerType = $("input[name='customerType']:checked").val();
        const programArea = $("#programAreaSelect").val();

    //    Existing or New customer Error box 
        if (!customerType) {
            addValidationError(errors, "newCustomer", "Please indicate if you are a New or Existing Customer.");
        }

        if (!programArea) {
            addValidationError(errors, "programAreaSelect", "Please select a Program Area.");
        }


        // New Customer 
        if (customerType === "New Customer") {

            const companyName = $("#companyOrIndividualName").val().trim();
            const streetAddress = $("#streetAddress").val().trim();
            const city = $("#city").val().trim();
            const province = $("#provinceState").val().trim();
            const postalCode = $("#postalCode").val().trim();

            if (companyName === "") {
                addValidationError(errors, "companyOrIndividualName", "Please enter the Company Name or Individual Name.");
            }

            if (streetAddress === "") {
                addValidationError(errors, "streetAddress", "Please enter the Street Address.");
            }

            if (city === "") {
                addValidationError(errors, "city", "Please enter the City.");
            }

            if (province === "") {
                addValidationError(errors, "provinceState", "Please enter the Province or State.");
            }

            if (postalCode === "") {
                addValidationError(errors, "postalCode", "Please enter the Postal Code.");

            } else if (!isValidCanadianPostalCode(postalCode)) {

                addValidationError(errors, "postalCode", "Please enter a valid Postal Code (Example: A1A 1A1).");
            }

            if (errors.length > 0) {
                showValidationErrors(errors);
                return;
            }

            const portalSessionId = getOrCreateActivePortalSessionId();

            const newMockCustomer = saveNewCustomerToMockCustomers({
                id: portalSessionId,
                companyName: companyName,
                streetAddress: streetAddress,
                city: city,
                province: province,
                postalCode: postalCode
            });

            const customerData = {
                id: portalSessionId,
                customerType: customerType,
                companyName: companyName,
                streetAddress: streetAddress,
                city: city,
                province: province,
                postalCode: postalCode,
                customerNumber: newMockCustomer.customerNumber,
                programArea: programArea
            };

            sessionStorage.setItem(portalSessionId, JSON.stringify(customerData));
            sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalSessionId);
            showFormSelectionStep(portalSessionId);
        }


        // Existing Customer 
        if (customerType === "Existing Customer") {

            const customerNumber = $("#customerNumber").val().trim();
            const existingPostalCode = $("#existingPostalCode").val().trim();

            if (customerNumber === "") {
                addValidationError(errors, "customerNumber", "Please enter the Customer Number.");
            }

            if (existingPostalCode === "") {
                addValidationError(errors, "existingPostalCode", "Please enter the Postal Code.");

            } else if (!isValidCanadianPostalCode(existingPostalCode)) {
                addValidationError(errors, "existingPostalCode", "Please enter a valid Postal Code (Example: A1A 1A1).");
            }

            if (errors.length > 0) {
                showValidationErrors(errors);
                return;
            }

            $continueBtn.prop("disabled", true);

            verifyExistingCustomer(customerNumber, existingPostalCode, function (verificationResult) {

                if (!verificationResult.status) {
                    $("#customerNumber").addClass("input-error");
                    $("#existingPostalCode").addClass("input-error");

                    showValidationErrors([{fieldId: "customerNumber", message: "Customer verification failed. Please check Customer Number and Postal Code."}]);
                    $continueBtn.text("Continue").prop("disabled", false);
                    return;
                }

                const portalSessionId = getOrCreateActivePortalSessionId();

                const customerData = {
                    id: portalSessionId,
                    customerType: customerType,
                    companyName: verificationResult.customerName,
                    streetAddress: verificationResult.streetAddress,
                    city: verificationResult.city,
                    province: verificationResult.province,
                    postalCode: existingPostalCode,
                    customerNumber: customerNumber,
                    programArea: programArea,
                    existingCustomerInfoReviewed: false
                };

                sessionStorage.setItem(portalSessionId, JSON.stringify(customerData));
                sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalSessionId);
                $continueBtn.text("Continue").prop("disabled", false);
                showExistingCustomerReviewStep(portalSessionId);
            });
        }

    });

    window.showPortalHomeStep = function () {
        showPortalStep("home");
        updateCustomerForm();
    };

    window.showExistingCustomerReviewStep = function (portalSessionId) {
        showExistingCustomerReviewStep(portalSessionId);
    };



    function restorePortalStepFromSession() {
        const portalSessionId = sessionStorage.getItem(ACTIVE_PORTAL_SESSION_KEY);

        if (!portalSessionId) {
            showPortalStep("home");
            return;
        }

        const portalSession = sessionStorage.getItem(portalSessionId);

        if (!portalSession) {
            showPortalStep("home");
            return;
        }

        const customerData = JSON.parse(portalSession);

        if (customerData.applicationFormNumber) {
            showServiceDetailsStep(portalSessionId);
            return;
        }

        if (customerData.customerType === "Existing Customer" && customerData.programArea && !customerData.existingCustomerInfoReviewed) {
            showExistingCustomerReviewStep(portalSessionId);
            return;
        }

        if (customerData.programArea) {
            showFormSelectionStep(portalSessionId);
            return;
        }

        showPortalStep("home");
    }

    function restoreActivePortalSession() {
        const portalSessionId = sessionStorage.getItem(ACTIVE_PORTAL_SESSION_KEY);

        if (!portalSessionId) {
            return;
        }

        const portalSession = sessionStorage.getItem(portalSessionId);

        if (!portalSession) {
            sessionStorage.removeItem(ACTIVE_PORTAL_SESSION_KEY);
            return;
        }

        const customerData = JSON.parse(portalSession);

        if (customerData.customerType === "New Customer") {
            $newCustomer.prop("checked", true);
            $("#companyOrIndividualName").val(customerData.companyName);
            $("#streetAddress").val(customerData.streetAddress);
            $("#city").val(customerData.city);
            $("#provinceState").val(customerData.province);
            $("#postalCode").val(customerData.postalCode);
        }

        if (customerData.customerType === "Existing Customer") {
            $existingCustomer.prop("checked", true);
            $("#customerNumber").val(customerData.customerNumber);
            $("#existingPostalCode").val(customerData.postalCode);
        }

        $("#programAreaSelect").val(customerData.programArea);
    }

    function getOrCreateActivePortalSessionId() {
        const activePortalSessionId = sessionStorage.getItem(ACTIVE_PORTAL_SESSION_KEY);

        if (activePortalSessionId && sessionStorage.getItem(activePortalSessionId)) {
            return activePortalSessionId;
        }

        return generateUUID();
    }

    function getPortalIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get("id") || urlParams.get("Id") || "";
    }

    // Portal Session Id commmenting for now--

    function updateHomepageUrl(portalSessionId) {
        return portalSessionId;
    }

});

function showPortalStep(stepName) {
    $(".portal-step").hide();

    if (stepName === "form-selection") {
        $("#formSelectionStep").show();
    } else if (stepName === "existing-customer-review") {
        $("#existingCustomerReviewStep").show();
    } else if (stepName === "service-details") {
        $("#serviceDetailsStep").show();
    } else {
        $("#homepageStep").show();
    }

    $("html, body").animate({
        scrollTop: 0
    }, 250);
}

function showExistingCustomerReviewStep(portalSessionId) {
    const portalSession = sessionStorage.getItem(portalSessionId);

    if (!portalSession) {
        showPortalStep("home");
        return;
    }

    const customerData = JSON.parse(portalSession);

    $("#reviewCustomerName").text(customerData.companyName || "");
    $("#reviewStreetAddress").text(customerData.streetAddress || "");
    $("#reviewCity").text(customerData.city || "");
    $("#reviewProvince").text(customerData.province || "");

    $(".existing-review-back-btn").off("click.existingReview").on("click.existingReview", function () {
        showPortalStep("home");
    });

    $(".existing-review-continue-btn").off("click.existingReview").on("click.existingReview", function () {
        const latestPortalSession = sessionStorage.getItem(portalSessionId);

        if (!latestPortalSession) {
            showPortalStep("home");
            return;
        }

        const latestCustomerData = JSON.parse(latestPortalSession);
        latestCustomerData.existingCustomerInfoReviewed = true;

        sessionStorage.setItem(portalSessionId, JSON.stringify(latestCustomerData));
        showFormSelectionStep(portalSessionId);
        
    });

    showPortalStep("existing-customer-review");
}

function showFormSelectionStep(portalSessionId) {
    const portalSession = sessionStorage.getItem(portalSessionId);

    if (!portalSession) {
        showPortalStep("home");
        return;
    }

    showPortalStep("form-selection");
    initializeDynamicFormPage(JSON.parse(portalSession), portalSessionId);
}

function showServiceDetailsStep(portalSessionId) {
    const portalSession = sessionStorage.getItem(portalSessionId);

    if (!portalSession) {
        showPortalStep("home");
        return;
    }

    showPortalStep("service-details");
    initializeServiceDetailsPage(JSON.parse(portalSession), portalSessionId);
}

// Validation for Postal Code...
function formatCanadianPostalCode(value) {

    value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (value.length > 3) {
        value = value.substring(0, 3) + ' ' + value.substring(3, 6);
    }

    return value.substring(0, 7);
}

function isValidCanadianPostalCode(postalCode) {

    postalCode = postalCode
        .toUpperCase()
        .replace(/\s/g, '');

    const canadianPostalRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

    return canadianPostalRegex.test(postalCode);
}

// Validation Error Box 
function showValidationErrors(errors) {

    $("#formErrorList").empty();

    errors.forEach(function (error) {
        const validationError = normalizeValidationError(error);
        const $listItem = $("<li></li>");

        if (validationError.fieldId) {
            const $errorLink = $("<a></a>")
                .attr("href", "#" + validationError.fieldId)
                .attr("data-field-id", validationError.fieldId)
                .text(validationError.message);

            $listItem.append($errorLink);
        } else {
            $listItem.text(validationError.message);
        }

        $("#formErrorList").append($listItem);
    });

    $("#formErrorList a").off("click").on("click", function (e) {
        e.preventDefault();
        focusFieldFromError($(this).data("field-id"));
    });

    $("#formErrorBox").slideDown();

    $('html, body').animate({
        scrollTop: $("#formErrorBox").offset().top - 40
    }, 500);
}

function addValidationError(errors, fieldId, message) {
    errors.push({
        fieldId: fieldId,
        message: message
    });

    $("#" + fieldId).addClass("input-error");
}

function normalizeValidationError(error) {
    if (typeof error === "string") {
        return {
            fieldId: "",
            message: error
        };
    }

    return {
        fieldId: error.fieldId || "",
        message: error.message || ""
    };
}

function focusFieldFromError(fieldId) {
    const $field = $("#" + fieldId);

    if (!$field.length) {
        return;
    }

    $("html, body").animate({
        scrollTop: Math.max(0, $field.offset().top - 120)
    }, 400, function () {
        $field.trigger("focus");
    });
}

function clearValidationErrors() {
    $("#formErrorBox").hide();
    $("#formErrorList").empty();
    $("input, select").removeClass("input-error");
}


function loadMockCustomers() {
    const savedCustomers = localStorage.getItem(MOCK_CUSTOMERS_STORAGE_KEY);

    if (!savedCustomers) {
        return defaultMockCustomers.slice();
    }

    try {
        const parsedCustomers = JSON.parse(savedCustomers);

        if (!Array.isArray(parsedCustomers)) {
            return defaultMockCustomers.slice();
        }

        const customers = defaultMockCustomers.slice();

        parsedCustomers.forEach(function (customer) {
            const alreadyExists = customers.some(function (existingCustomer) {
                return existingCustomer.customerNumber === customer.customerNumber;
            });

            if (!alreadyExists) {
                customers.push(customer);
            }
        });

        return customers;
    } catch (error) {
        return defaultMockCustomers.slice();
    }
}

function saveMockCustomers() {
    localStorage.setItem(MOCK_CUSTOMERS_STORAGE_KEY, JSON.stringify(mockCustomers));
}

function saveNewCustomerToMockCustomers(customerData) {
    const existingCustomerIndex = mockCustomers.findIndex(function (customer) {
        return customer.id === customerData.id;
    });

    const customerRecord = {
        id: customerData.id,
        customerNumber: existingCustomerIndex >= 0
            ? mockCustomers[existingCustomerIndex].customerNumber
            : generateMockCustomerNumber(),
        postalCode: customerData.postalCode,
        customerName: customerData.companyName,
        streetAddress: customerData.streetAddress,
        city: customerData.city,
        province: customerData.province
    };

    if (existingCustomerIndex >= 0) {
        mockCustomers[existingCustomerIndex] = customerRecord;
    } else {
        mockCustomers.push(customerRecord);
    }

    saveMockCustomers();

    return customerRecord;
}

function generateMockCustomerNumber() {
    let customerNumber = "";

    do {
        customerNumber = "NEW-" + Math.floor(100000 + Math.random() * 900000);
    } while (mockCustomers.some(function (customer) {
        return customer.customerNumber === customerNumber;
    }));

    return customerNumber;
}


// Future implementation:

// $.ajax({
//      url: dynamicsApiUrl,
//      method: "GET",
//      headers: {
//          Authorization: "Bearer " + token,
//          Accept: "application/json"
//      }
// });



function verifyExistingCustomer(customerNumber, postalCode, callback) {

    console.log("Customer Number:", customerNumber);
    console.log("Postal Code:", postalCode);

    const normalizedPostalCode = postalCode
        .toUpperCase()
        .replace(/\s/g, '');

    if (typeof appAjax !== "function") {
        console.error("Customer Validation Error: appAjax is not available. Confirm the Power Pages safeAjax/appAjax wrapper is loaded before homepage.js.");

        callback({
            status: false
        });
        return;
    }

    const escapedCustomerNumber = customerNumber.replace(/'/g, "''");

    const filter =
        "accountnumber eq '" + escapedCustomerNumber + "'" +
        " and statecode eq 0";

    appAjax(
        "Validating Customer",
        {
            type: "GET",
            url:
                "/_api/accounts" +
                "?$select=name,accountnumber,address1_postalcode" +
                "&$filter=" + encodeURIComponent(filter)
        }
    )
    .done(function(response) {

        console.log("Customer Validation Response:", response);

        if (
            response &&
            response.value &&
            response.value.length > 0
        ) {

            const customer = response.value[0];
            const customerPostalCode = (customer.address1_postalcode || "")
                .toUpperCase()
                .replace(/\s/g, '');

            if (customerPostalCode !== normalizedPostalCode) {
                console.log("Customer Postal Code Mismatch:", customer.address1_postalcode);

                callback({
                    status: false
                });
                return;
            }

            callback({
                status: true,
                customerName: customer.name || "",
                customerNumber: customer.accountnumber || "",
                postalCode: customer.address1_postalcode || "",
                streetAddress: "",
                city: "",
                province: ""
            });

        } else {

            callback({
                status: false
            });

        }

    })
    .fail(function(error) {

        console.error(
            "Customer Validation Error:",
            error
        );

        callback({
            status: false
        });

    });
}

// console.log(defaultMockCustomers);


    // random id generate 
function generateUUID() {
    return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

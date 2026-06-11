

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
    initializeHomepageTables();



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

            const customerData = {
                id: portalSessionId,
                customerType: customerType,
                companyName: companyName,
                streetAddress: streetAddress,
                city: city,
                province: province,
                postalCode: postalCode,
                customerNumber: "",
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
            showLoadingOverlay("Validating existing customer details...");

            verifyExistingCustomer(customerNumber, existingPostalCode, function (verificationResult) {

                hideLoadingOverlay();

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
        if (typeof window.showPortalHomeStep === "function") {
            window.showPortalHomeStep();
            return;
        }

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

window.showExistingCustomerReviewStep = showExistingCustomerReviewStep;

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


function verifyExistingCustomer(customerNumber, postalCode, callback) {

    console.log("Customer Number:", customerNumber);
    console.log("Postal Code:", postalCode);

    const normalizedPostalCode = postalCode
        .toUpperCase()
        .replace(/\s/g, '');

    const ajaxCall = getPortalAjax({
        type: "GET",
        url:
            "/_api/accounts" +
            "?$select=name,accountnumber,address1_postalcode,address1_line1,address1_line2,address1_line3,address1_city,address1_stateorprovince" +
            "&$filter=" + encodeURIComponent("accountnumber eq '" + customerNumber.replace(/'/g, "''") + "' and statecode eq 0")
    });

    if (!ajaxCall || typeof ajaxCall.done !== "function") {
        console.error("Customer Validation Error: No AJAX wrapper available. Confirm the Power Pages safeAjax/appAjax wrapper is loaded before homepage.js.");
        callback({
            status: false
        });
        return;
    }

    ajaxCall
        .done(function(response) {

            console.log("Customer Validation Response:", response);

            if (typeof response === "string") {
                try {
                    response = JSON.parse(response);
                } catch (error) {
                    console.error("Customer Validation Parse Error:", error);

                    callback({
                        status: false
                    });
                    return;
                }
            }

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

                const streetAddress = [
                    customer.address1_line1,
                    customer.address1_line2,
                    customer.address1_line3
                ].filter(function (addressLine) {
                    return addressLine;
                }).join(", ");

                callback({
                    status: true,
                    customerName: customer.name || "",
                    customerNumber: customer.accountnumber || "",
                    postalCode: customer.address1_postalcode || "",
                    streetAddress: streetAddress,
                    city: customer.address1_city || "",
                    province: customer.address1_stateorprovince || ""
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

    // random id generate 
function generateUUID() {
    return 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// FORM SELECTION JS 

$(document).ready(function(){

    if($("#formSelectionStep").length){
        return;
    }

    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const portalId = getUrlParameter('id');

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

    sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalId);

    initializeDynamicFormPage(customerData, portalId);

});

function getUrlParameter(name){
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}


function initializeDynamicFormPage(customerData, portalId){

    const programArea = customerData.programArea;

    const programTitles = {
        "amusement-devices" : "Please select the intended Amusement Devices application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "boilers-pressure-vessels" : "Please select the intended Boilers and Pressure Vessels application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "elevating-devices" : "Please select the intended Elevating Devices application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "fuels" : "Please select the intended Fuels application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "operating-engineers" : "Please select the intended Operating Engineers application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "public-information" : "Please select the intended Public Information application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre.",
        "ski-lifts" : "Please select the intended Ski Lifts application form number, and then click Continue. If the form you are requesting cannot be found, contact our Customer Service Centre."
    };

    $("#dynamicProgramInstruction").html(programTitles[programArea]);

    loadApplicationForms(programArea, portalId);

    const $backButtons = $("#formSelectionStep").length ? $("#formSelectionStep .back-btn") : $(".back-btn");

    $backButtons.off("click.formSelection").on("click.formSelection", function(){
        const latestPortalSession = sessionStorage.getItem(portalId);
        const latestCustomerData = latestPortalSession ? JSON.parse(latestPortalSession) : customerData;

        if(
            latestCustomerData.customerType === "Existing Customer" &&
            typeof window.showExistingCustomerReviewStep === "function"
        ){
            window.showExistingCustomerReviewStep(portalId);
            return;
        }

        if(typeof window.showPortalHomeStep === "function"){
            window.showPortalHomeStep();
            return;
        }

        window.location.href = "../../index.html?id=" + portalId;
    });
}



function loadApplicationForms(programArea, portalId){
    const visibleTableTitle = getProgramAreaVisibleTableTitle(programArea);
    const programCategory = getProgramAreaFormCategory(programArea);

    console.log("loadApplicationForms called - Program Area:", programArea, "Category:", programCategory, "Visible Title:", visibleTableTitle);

    if (!visibleTableTitle || !programCategory) {
        console.error("loadApplicationForms invalid configuration - Missing title or category");
        showFormSelectionErrors([{ message: "Unable to load application forms. Invalid program area selected." }]);
        return;
    }

    showLoadingOverlay("Loading application forms...");

    fetchPortalForms(programCategory)
        .done(function (forms) {
            console.log("loadApplicationForms: fetchPortalForms succeeded with", forms ? forms.length : 0, "forms");
            if (!forms || forms.length === 0) {
                console.warn("fetchPortalForms returned no forms for program area:", programArea);
                showFormSelectionErrors([{ message: "No application forms are available at this time." }]);
                renderEmptyFormSelection(visibleTableTitle);
                return;
            }

            renderApplicationForms(forms, portalId, visibleTableTitle);
        })
        .fail(function (error) {
            console.error("loadApplicationForms: fetchPortalForms failed for program area:", programArea, error);
            showFormSelectionErrors([{ message: "Unable to load application forms. Please try again later." }]);
            renderEmptyFormSelection(visibleTableTitle);
        });
}

function fetchPortalForms(programCategory) {
    const deferred = $.Deferred();

    let ajaxCall;

    console.log("fetchPortalForms called for category:", programCategory);
    
    try {
        const apiUrl = "https://tssadm40.crm3.dynamics.com/api/data/v9.2/cre04_tssa_formses?$select=cre04_tssa_formsid,cre04_field1,cre04_field2,cre04_title&$orderby=cre04_field1 asc";
        const ajaxOptions = {
            type: "GET",
            url: apiUrl,
            dataType: "json"
        };
        
        console.log("fetchPortalForms attempting to call API:", apiUrl);
        ajaxCall = getPortalAjax(ajaxOptions);
    } catch (error) {
        console.error("fetchPortalForms error creating AJAX call:", error);
        deferred.reject(error);
        return deferred.promise();
    }

    if (!ajaxCall || typeof ajaxCall.done !== "function") {
        console.error("fetchPortalForms error: AJAX wrapper returned invalid object.");
        console.warn("NOTE: This typically means the Power Pages framework (appAjax/portalSafeAjax) is not properly loaded.");
        deferred.reject({ message: "Invalid AJAX wrapper" });
        return deferred.promise();
    }

    ajaxCall
        .done(function (response) {
            console.log("fetchPortalForms AJAX response:", response);
            response = parseDataverseResponse(response);

            if (!response.value || !Array.isArray(response.value)) {
                console.warn("fetchPortalForms unexpected response structure:", response);
                deferred.reject(response);
                return;
            }

            console.log("fetchPortalForms parsed " + response.value.length + " forms for category:", programCategory);
            const normalizedCategory = normalizeString(programCategory);
            const codePrefixes = getProgramAreaCodePrefixes(programCategory);

            const forms = response.value
                .map(parsePortalFormRecord)
                .filter(function (form) {
                    if (!form) {
                        return false;
                    }

                    if (normalizeString(form.programCategory) === normalizedCategory) {
                        return true;
                    }

                    return codePrefixes.some(function (prefix) {
                        return form.code.toUpperCase().startsWith(prefix.toUpperCase());
                    });
                });

            console.log("fetchPortalForms filtered to " + forms.length + " forms");
            deferred.resolve(forms);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error("fetchPortalForms AJAX request failed");
            console.error("  Status Code:", jqXHR.status);
            console.error("  Status Text:", jqXHR.statusText);
            console.error("  Error Thrown:", errorThrown);
            console.error("  Text Status:", textStatus);
            console.error("  Response Text:", jqXHR.responseText);
            console.error("  Response JSON:", jqXHR.responseJSON);
            
            const errorMsg = {
                status: jqXHR.status,
                statusText: jqXHR.statusText,
                errorThrown: errorThrown,
                textStatus: textStatus,
                message: jqXHR.status === 0 ? "Unable to reach API endpoint (CORS or network error)" : (jqXHR.statusText || errorThrown)
            };
            deferred.reject(errorMsg);
        });

    return deferred.promise();
}

function parsePortalFormRecord(record) {
    const rawField1 = (record.cre04_field1 || "").toString();
    const code = extractFormCode(rawField1);
    const title = (record.cre04_field2 && record.cre04_field2.toString().trim()) || extractTitleFromField1(rawField1) || code;
    const programCategory = (record.cre04_title || "").toString().trim();

    if (!code) {
        return null;
    }

    return {
        code: code,
        title: title,
        programCategory: programCategory
    };
}

function extractFormCode(rawField1) {
    const match = rawField1.match(/^([A-Za-z0-9]+-[A-Za-z0-9]+-v\d+)/i);
    return match ? match[1] : rawField1.trim();
}

function extractTitleFromField1(rawField1) {
    const code = extractFormCode(rawField1);

    if (!code) {
        return rawField1.trim();
    }

    return rawField1.substring(code.length + 1).trim();
}

function getProgramAreaFormCategory(programArea) {
    const categories = {
        "amusement-devices": "Amusement Devices",
        "boilers-pressure-vessels": "Boilers & Pressure Vessels",
        "elevating-devices": "Elevating Devices",
        "fuels": "Fuels",
        "operating-engineers": "Operating Engineers",
        "public-information": "Public Information",
        "ski-lifts": "Ski Lifts"
    };

    return categories[programArea] || "";
}

function getProgramAreaCodePrefixes(programArea) {
    const prefixes = {
        "amusement-devices": ["AD-"],
        "boilers-pressure-vessels": ["BPV-"],
        "elevating-devices": ["ED-"],
        "fuels": ["FS-"],
        "operating-engineers": ["OE-", "TSSA-"],
        "public-information": ["PI-"],
        "ski-lifts": ["Ski-"]
    };

    return prefixes[programArea] || [];
}

function getPortalAjax(options) {
    if (typeof window.portalSafeAjax === "function") {
        return window.portalSafeAjax(options);
    }

    if (typeof appAjax === "function") {
        return appAjax(options);
    }

    if (typeof $.ajax === "function") {
        return $.ajax(options);
    }

    const deferred = $.Deferred();
    deferred.reject({ message: "No AJAX wrapper available" });
    return deferred.promise();
}

function parseDataverseResponse(response) {
    if (typeof response === "string") {
        try {
            response = JSON.parse(response);
        } catch (error) {
            console.error("Unable to parse Dataverse response string:", error, response);
            return { value: [] };
        }
    }

    if (response && typeof response === "object" && response.d && typeof response.d === "object") {
        response = response.d;
    }

    return response || { value: [] };
}

function normalizeString(value) {
    return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ").replace(/&/g, "and");
}

function initializeHomepageTables() {
    const homepageData = [
        "amusement-devices",
        "boilers-pressure-vessels",
        "elevating-devices",
        "fuels",
        "operating-engineers",
        "public-information",
        "ski-lifts"
    ];

    homepageData.forEach(function (programArea) {
        loadHomepageProgramTable(programArea);
    });
}

function loadHomepageProgramTable(programArea) {
    fetchPortalForms(getProgramAreaFormCategory(programArea))
        .done(function (forms) {
            if (!forms || forms.length === 0) {
                console.warn("fetchPortalForms returned no homepage forms for program area:", programArea);
                renderHomepageProgramTable(programArea, []);
                return;
            }

            renderHomepageProgramTable(programArea, forms);
        })
        .fail(function (error) {
            console.error("fetchPortalForms failed for homepage program area:", programArea, error);
            renderHomepageProgramTable(programArea, []);
        });
}

function renderHomepageProgramTable(programArea, forms) {
    const sectionId = programArea + "HomepageTable";
    const title = getProgramAreaVisibleTableTitle(programArea);
    const rows = (forms || []).map(function (form) {
        return '<tr><td>' + form.code + '</td><td>' + (form.title || "") + '</td></tr>';
    }).join("");

    const tableHtml = '<table class="program-form-table"><tr><th colspan="2">' + title + '</th></tr>' + (rows || '<tr><td colspan="2">No forms available.</td></tr>') + '</table>';

    var $container = $("#" + sectionId);

    if (!$container.length) {
        $container = $("<div></div>").attr("id", sectionId).addClass("homepage-program-table");
        $("#homepageStep").append($container);
    }

    $container.html(tableHtml);
}

function getProgramAreaVisibleTableTitle(programArea) {
    const titles = {
        "amusement-devices": "Amusement Devices Application Forms",
        "boilers-pressure-vessels": "Boilers & Pressure Vessels Application Forms",
        "elevating-devices": "Elevating Devices Application Forms",
        "fuels": "Fuels Application Forms",
        "operating-engineers": "Operating Engineers Application Forms",
        "public-information": "Public Information Application Forms",
        "ski-lifts": "Ski Application Forms"
    };

    return titles[programArea] || "";
}

function showLoadingOverlay(message) {
    const $overlay = $("#loadingOverlay");

    if (!$overlay.length) {
        return;
    }

    $overlay.find(".loading-overlay__text").text(message || "Loading...");
    $overlay.show();
}

function hideLoadingOverlay() {
    const $overlay = $("#loadingOverlay");

    if (!$overlay.length) {
        return;
    }

    $overlay.hide();
}

function renderEmptyFormSelection(visibleTableTitle) {
    $("#applicationFormSelect").empty();
    $("#applicationFormSelect").append('<option value="">Unable to load forms</option>');
    $("#applicationFormSelect").prop("disabled", true);
    $(".continue-form-btn").prop("disabled", true);

    const tableHtml = '<table class="program-form-table"><tr><th colspan="2">' + visibleTableTitle + '</th></tr><tr><td colspan="2">Unable to display form list at this time.</td></tr></table>';
    $("#formDescriptionTable").html(tableHtml);
    hideLoadingOverlay();
}

function renderApplicationForms(forms, portalId, visibleTableTitle) {
    $("#applicationFormSelect").empty();
    $("#applicationFormSelect").append('<option value="">Please select an Application Form.</option>');

    forms.forEach(function (form) {
        const optionText = form.title ? form.code + ' - ' + form.title : form.code;
        $("#applicationFormSelect").append('<option value="' + form.code + '">' + optionText + '</option>');
    });

    const sessionData = JSON.parse(sessionStorage.getItem(portalId) || "{}");

    if (sessionData && sessionData.applicationFormNumber) {
        $("#applicationFormSelect").val(sessionData.applicationFormNumber);
    }

    let tableHtml = '<table class="program-form-table">';
    tableHtml += '<tr><th colspan="2">' + visibleTableTitle + '</th></tr>';

    const visibleForms = getVisibleFormTableRows(forms);

    visibleForms.forEach(function (form) {
        tableHtml += '<tr><td>' + form.code + '</td><td>' + form.title + '</td></tr>';
    });

    tableHtml += '</table>';

    $("#formDescriptionTable").html(tableHtml);
    $("#applicationFormSelect").prop("disabled", false);
    $(".continue-form-btn").prop("disabled", false);
    hideLoadingOverlay();

    $(".continue-form-btn").off("click.formSelection").on("click.formSelection", function () {
        clearFormSelectionErrors();

        const selectedForm = $("#applicationFormSelect").val();

        if (selectedForm == "") {
            $("#applicationFormSelect").addClass("input-error");
            showFormSelectionErrors([{ fieldId: "applicationFormSelect", message: "Please select an Application Form Number." }]);
            return;
        }

        const sessionData = JSON.parse(sessionStorage.getItem(portalId));
        sessionData.applicationFormNumber = selectedForm;
        sessionData.applicationFormTitle = $("#applicationFormSelect option:selected").text();

        sessionStorage.setItem(portalId, JSON.stringify(sessionData));

        console.log("Step 2 completed:", sessionData);

        if (typeof window.showServiceDetailsStep === "function") {
            window.showServiceDetailsStep(portalId);
            return;
        }

        window.location.href = "service-details.html?id=" + portalId;
    });
}

function getVisibleFormTableRows(forms) {
    const visibleForms = [];
    const seenCodes = {};

    forms.forEach(function (form) {
        const shouldHide = form.title.toUpperCase().includes("TSSA USE ONLY") || form.code.toUpperCase().includes("-000-");
        const baseCode = getBaseFormCode(form.code);

        if (shouldHide || seenCodes[baseCode]) {
            return;
        }

        seenCodes[baseCode] = true;
        visibleForms.push({
            code: baseCode,
            title: form.title
        });
    });

    return visibleForms;
}

function getBaseFormCode(formCode) {
    return formCode.replace(/-v\d+$/i, "");
}

function showFormSelectionErrors(errors){

    $("#formSelectErrorList").empty();

    errors.forEach(function(error){
        const validationError = normalizeValidationError(error);
        const $listItem = $("<li></li>");

        if(validationError.fieldId){
            const $errorLink = $("<a></a>")
                .attr("href", "#" + validationError.fieldId)
                .attr("data-field-id", validationError.fieldId)
                .text(validationError.message);

            $listItem.append($errorLink);
        }else{
            $listItem.text(validationError.message);
        }

        $("#formSelectErrorList").append($listItem);
    });

    $("#formSelectErrorList a").off("click").on("click", function(e){
        e.preventDefault();
        focusFieldFromError($(this).data("field-id"));
    });

    $("#formSelectErrorBox").slideDown();

    $('html, body').animate({
        scrollTop: $("#formSelectErrorBox").offset().top - 40
    }, 500);
}

function focusFieldFromError(fieldId){
    const $field = $("#" + fieldId);

    if(!$field.length){
        return;
    }

    $("html, body").animate({
        scrollTop: Math.max(0, $field.offset().top - 120)
    }, 400, function(){
        $field.trigger("focus");
    });
}

function clearFormSelectionErrors(){
    $("#formSelectErrorBox").hide();
    $("#formSelectErrorList").empty();
    $("select").removeClass("input-error");
}

// SERVICE DETAILS JS 

const MAX_APPLICATION_FORM_FILES = 1;
const MAX_SUPPORTING_DOCUMENT_FILES = 15;
const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "7z", "zip"];
let applicationFormFiles = [];
let supportingDocumentFiles = [];

$(document).ready(function(){

    if($("#serviceDetailsStep").length){
        return;
    }

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

    if(!customerData.applicationFormNumber){
        window.location.href = "form-selection.html?id=" + portalId;
        return;
    }

    sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalId);

    initializeServiceDetailsPage(customerData, portalId);
});

function initializeServiceDetailsPage(customerData, portalId){
    const formDisplayName = getSelectedFormDisplayName(customerData);
    const usesHstFees = usesHstFeeLayout(customerData);
    const usesAdditionalAuthorizationFee = usesAdditionalAuthorizationFeeLayout(customerData);
    const usesRushServiceField = isOperatingEngineersProgram(customerData) || isPublicInformationProgram(customerData);
    const requiresExpeditedService = isPublicInformationProgram(customerData) || usesAdditionalAuthorizationFeeLayout(customerData);

    removeDuplicateDocumentsSections();

    $("#serviceDetailsInstruction").html(
        'To complete your request for the application form <strong>' + formDisplayName + '</strong>, please enter the following information, and then click Continue.'
    );

    configureFeesSection(usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService);
    restoreServiceDetails(customerData.serviceDetails);
    updateRushServiceField(usesRushServiceField);
    updateTotalFees($("#authorizationFee").val(), usesHstFees, usesAdditionalAuthorizationFee);

    const $backButtons = $("#serviceDetailsStep").length ? $("#serviceDetailsStep .back-btn") : $(".back-btn");

    $backButtons.off("click.serviceDetails").on("click.serviceDetails", function(){
        if(typeof window.showFormSelectionStep === "function"){
            window.showFormSelectionStep(portalId);
            return;
        }

        window.location.href = "form-selection.html?id=" + portalId;
    });

    $("#serviceDetailsForm input, #serviceDetailsForm select").off("input.serviceDetails change.serviceDetails").on("input.serviceDetails change.serviceDetails", function(){
        $(this).removeClass("input-error");
    });

    $("#phoneNumber").off("input.serviceDetails").on("input.serviceDetails", function(){
        $(this).val(formatPhoneNumber($(this).val()));
    });

    $("#applicationFormUpload").off("change.serviceDetails").on("change.serviceDetails", function(){
        handleApplicationFormUpload(this);
    });

    $("#supportingDocuments").off("change.serviceDetails").on("change.serviceDetails", function(){
        handleSupportingDocumentsUpload(this);
    });

    $(".upload-notice-close").off("click.serviceDetails").on("click.serviceDetails", function(){
        $(this).closest(".upload-notice").slideUp();
    });

    $("#authorizationFee").off("input.serviceDetails").on("input.serviceDetails", function(){
        updateTotalFees($(this).val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#authorizationFee").off("blur.serviceDetails").on("blur.serviceDetails", function(){
        $(this).val(formatCurrency($(this).val()));
        updateTotalFees($(this).val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#additionalAuthorizationFee").off("input.serviceDetails").on("input.serviceDetails", function(){
        updateTotalFees($("#authorizationFee").val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#additionalAuthorizationFee").off("blur.serviceDetails").on("blur.serviceDetails", function(){
        $(this).val(formatCurrency($(this).val()));
        updateTotalFees($("#authorizationFee").val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#expeditedService").off("change.serviceDetails").on("change.serviceDetails", function(){
        updateRushServiceField(usesRushServiceField);
    });

    $("#serviceDetailsForm").off("submit.serviceDetails").on("submit.serviceDetails", function(e){
        e.preventDefault();
        saveServiceDetails(portalId, usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService, usesRushServiceField);
    });
}

function removeDuplicateDocumentsSections(){
    const $documentSections = $("section").filter(function(){
        return $(this).find("h2").first().text().trim() === "Documents";
    });

    if($documentSections.length <= 1){
        return;
    }

    const $uploadSection = $("#documentsSection").length ? $("#documentsSection") : $documentSections.has("#applicationFormUpload").first();

    $documentSections.not($uploadSection).remove();
}

function usesHstFeeLayout(customerData){
    return customerData.programArea === "boilers-pressure-vessels" || customerData.programArea === "public-information" || usesAdditionalAuthorizationFeeLayout(customerData);
}

function isPublicInformationProgram(customerData){
    return customerData.programArea === "public-information";
}

function usesAdditionalAuthorizationFeeLayout(customerData){
    return customerData.programArea === "operating-engineers";
}

function isOperatingEngineersProgram(customerData){
    return customerData.programArea === "operating-engineers";
}

function configureFeesSection(usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService){
    $(".service-fee-grid").removeClass("service-fee-grid-hst");
    $("label[for='authorizationFee']").html('Authorization Fee (Licence/Registration/Certificate/Permit) - Box "2" from application form <span>*</span>');

    if(!usesHstFees){
        $(".service-hst-field").hide();
        $("#hstFee").val("$0.00");
    }else{
        $(".service-fee-grid").addClass("service-fee-grid-hst");
        $(".service-hst-field").show();
        $("label[for='authorizationFee']").html('Service Fee (Engineering/Inspection/Other) - Box "1" from application form <span>*</span>');
    }

    if(usesAdditionalAuthorizationFee){
        $(".additional-authorization-field").show();
    }else{
        $(".additional-authorization-field").hide();
        $("#additionalAuthorizationFee").val("");
    }

    if(requiresExpeditedService){
        $(".expedited-service-field").show();
    }else{
        $(".expedited-service-field").hide();
        $("#expeditedService").val("");
    }
}

function updateRushServiceField(usesRushServiceField){
    const showRushService = usesRushServiceField && $("#expeditedService").val() === "Yes";

    if(showRushService){
        $("#rushService").val("RUSH -");
        $(".rush-service-field").show();
    }else{
        $("#rushService").val("");
        $(".rush-service-field").hide();
    }
}

function handleApplicationFormUpload(input){
    const selectedFiles = Array.from(input.files);

    if(selectedFiles.length === 0){
        syncInputFiles(input, applicationFormFiles);
        return;
    }

    if(hasInvalidUploadFileType(selectedFiles)){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "applicationFormUpload", message: "Only files of type pdf, doc, docx, xls, xlsx, 7z, and zip are allowed."}]);
        syncInputFiles(input, applicationFormFiles);
        return;
    }

    if(applicationFormFiles.length >= MAX_APPLICATION_FORM_FILES || selectedFiles.length > MAX_APPLICATION_FORM_FILES){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "applicationFormUpload", message: "The maximum number of Application Form file uploads is 1."}]);
        syncInputFiles(input, applicationFormFiles);
        renderSelectedFiles(applicationFormFiles, "#applicationFormFileList", "#applicationFormUploadNotice", function(fileIndex){
            applicationFormFiles.splice(fileIndex, 1);
            syncInputFiles(input, applicationFormFiles);
        });
        return;
    }

    if(selectedFiles[0].size > MAX_UPLOAD_FILE_SIZE){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "applicationFormUpload", message: "Application Form Upload cannot exceed 50MB."}]);
        syncInputFiles(input, applicationFormFiles);
        return;
    }

    applicationFormFiles = selectedFiles;
    syncInputFiles(input, applicationFormFiles);
    renderSelectedFiles(applicationFormFiles, "#applicationFormFileList", "#applicationFormUploadNotice", function(fileIndex){
        applicationFormFiles.splice(fileIndex, 1);
        syncInputFiles(input, applicationFormFiles);
    });
}

function handleSupportingDocumentsUpload(input){
    const selectedFiles = Array.from(input.files);

    if(selectedFiles.length === 0){
        syncInputFiles(input, supportingDocumentFiles);
        return;
    }

    if(hasInvalidUploadFileType(selectedFiles)){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "supportingDocuments", message: "Only files of type pdf, doc, docx, xls, xlsx, 7z, and zip are allowed."}]);
        syncInputFiles(input, supportingDocumentFiles);
        renderSelectedFiles(supportingDocumentFiles, "#supportingDocumentsFileList", "#supportingDocumentsUploadNotice", function(fileIndex){
            supportingDocumentFiles.splice(fileIndex, 1);
            syncInputFiles(input, supportingDocumentFiles);
        });
        return;
    }

    const mergedSupportingFiles = replaceDuplicateFiles(supportingDocumentFiles, selectedFiles);

    if(mergedSupportingFiles.length > MAX_SUPPORTING_DOCUMENT_FILES){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "supportingDocuments", message: "Supporting Documents can include a maximum of 15 files."}]);
        syncInputFiles(input, supportingDocumentFiles);
        renderSelectedFiles(supportingDocumentFiles, "#supportingDocumentsFileList", "#supportingDocumentsUploadNotice", function(fileIndex){
            supportingDocumentFiles.splice(fileIndex, 1);
            syncInputFiles(input, supportingDocumentFiles);
        });
        return;
    }

    const oversizedFile = selectedFiles.find(function(file){
        return file.size > MAX_UPLOAD_FILE_SIZE;
    });

    if(oversizedFile){
        $(input).addClass("input-error");
        showServiceDetailsErrors([{fieldId: "supportingDocuments", message: 'Supporting Documents cannot exceed 50MB per file. "' + oversizedFile.name + '" is too large.'}]);
        syncInputFiles(input, supportingDocumentFiles);
        return;
    }

    supportingDocumentFiles = mergedSupportingFiles;
    syncInputFiles(input, supportingDocumentFiles);
    renderSelectedFiles(supportingDocumentFiles, "#supportingDocumentsFileList", "#supportingDocumentsUploadNotice", function(fileIndex){
        supportingDocumentFiles.splice(fileIndex, 1);
        syncInputFiles(input, supportingDocumentFiles);
    });
}

function syncInputFiles(input, files){
    const dataTransfer = new DataTransfer();

    files.forEach(function(file){
        dataTransfer.items.add(file);
    });

    input.files = dataTransfer.files;
}

function hasInvalidUploadFileType(files){
    return files.some(function(file){
        return !hasAllowedExtension(file.name, ALLOWED_UPLOAD_EXTENSIONS);
    });
}

function replaceDuplicateFiles(existingFiles, selectedFiles){
    const mergedFiles = existingFiles.slice();

    selectedFiles.forEach(function(selectedFile){
        const duplicateIndex = mergedFiles.findIndex(function(existingFile){
            return existingFile.name.toLowerCase() === selectedFile.name.toLowerCase();
        });

        if(duplicateIndex === -1){
            mergedFiles.push(selectedFile);
        }else{
            mergedFiles[duplicateIndex] = selectedFile;
        }
    });

    return mergedFiles;
}

function renderSelectedFiles(files, listSelector, noticeSelector, removeCallback){
    const $list = $(listSelector);

    $list.empty();

    if(files.length === 0){
        $(noticeSelector).hide();
        return;
    }

    $list.append('<div class="uploaded-file-heading"><span>File Name</span><span></span></div>');

    files.forEach(function(file, index){
        const fileUrl = URL.createObjectURL(file);
        const $row = $('<div class="uploaded-file-row"></div>');
        const $details = $('<div class="uploaded-file-details"></div>');
        const $text = $('<div class="uploaded-file-text"></div>');
        const $actions = $('<div class="uploaded-file-actions"></div>');
        const $previewButton = $('<button type="button" class="uploaded-file-action" title="Preview file" aria-label="Preview file">⌕</button>');
        const $removeButton = $('<button type="button" class="uploaded-file-action" title="Remove file" aria-label="Remove file">x</button>');
        const fileExtension = getFileExtension(file.name);

        $text.append($('<span class="uploaded-file-name"></span>').text(file.name));
        $text.append($('<span class="uploaded-file-size"></span>').text(formatFileSize(file.size)));

        $details.append($('<span class="uploaded-file-icon"></span>').addClass("uploaded-file-icon-" + getFileIconClass(fileExtension)).text(getFileIconLabel(fileExtension)));
        $details.append($text);

        $previewButton.on("click", function(){
            window.open(fileUrl, "_blank");
        });

        $removeButton.on("click", function(){
            removeCallback(index);
            renderSelectedFiles(files, listSelector, noticeSelector, removeCallback);
        });

        $actions.append($previewButton, $removeButton);
        $row.append($details, $actions);
        $list.append($row);
    });

    $(noticeSelector).slideDown();
}

function formatFileSize(bytes){
    const megabytes = bytes / (1024 * 1024);
    const kilobytes = bytes / 1024;

    if(megabytes >= 1){
        return megabytes.toFixed(2) + " MB";
    }

    return Math.max(0.1, kilobytes).toFixed(1) + " KB";
}

function getFileExtension(fileName){
    const extension = fileName.split(".").pop();

    if(!extension || extension === fileName){
        return "FILE";
    }

    return extension.toUpperCase().slice(0, 4);
}

function getFileIconLabel(fileExtension){
    const extension = fileExtension.toLowerCase();

    if(extension === "doc" || extension === "docx"){
        return "W";
    }

    if(extension === "xls" || extension === "xlsx"){
        return "X";
    }

    return fileExtension.toUpperCase().slice(0, 4);
}

function getFileIconClass(fileExtension){
    const extension = fileExtension.toLowerCase();

    if(extension === "doc" || extension === "docx"){
        return "doc";
    }

    if(extension === "xls" || extension === "xlsx"){
        return "xls";
    }

    if(extension === "zip" || extension === "7z"){
        return "zip";
    }

    if(extension === "pdf"){
        return "pdf";
    }

    return "file";
}

function getSelectedFormDisplayName(customerData){
    const selectedFormNames = {
        "AD-000-v1": "AD-000-v1-TSSA USE ONLY Amusement Devices Request for Services - TSSA Internal Use Only",
        "AD-000-v2": "AD-000-v2-TSSA USE ONLY Amusement Devices Request for Services - TSSA Internal Use Only",
        "AD-003-v5": "AD-003-v5-Application for New Amusement Business License",
        "AD-008-v4": "AD-008-v4-TSSA Bulk Exam Request",
        "BPV-000-v1": "BPV-000-v1-TSSA USE ONLY",
        "BPV-000-v2": "BPV-000-v2-TSSA USE ONLY",
        "BPV-006-v4": "BPV-006-v4-Seminar Registration Form",
        "BPV-007-v6": "BPV-007-v6-Application for Non-Nuclear Ontario Certificate of Authorization",
        "BPV-008-v5": "BPV-008-v5-Application for an Ontario Certificate of Authorization For Ontario based businesses CSA N285.0 Metallic Material Organizations",
        "BPV-009-v5": "BPV-009-v5-Application for an Ontario Certificate of Authorization For Ontario based businesses CSA N285.0 Nuclear Components",
        "BPV-015-v1": "BPV-015-v1-Boilers and Pressure Vessels - Safety TSSA Regulatory Requirements Training (Module 1)",
        "BPV-016-v1": "BPV-016-v1-Request for Extension of Ontario Certificate of Authorization",
        "ED-000-v1": "ED-000-v1-TSSA USE ONLY",
        "ED-000-v2": "ED-000-v2-TSSA USE ONLY",
        "ED-004-v9": "ED-004-v9-Application for Reinstatement of an Elevating Device License",
        "ED-006-v7": "ED-006-v7-Elevating Device General Contractor Registration",
        "ED-007-v7": "ED-007-v7-Application for Reinstatement as an Elevating Devices Contractor",
        "ED-008-v7": "ED-008-v7-Consultant Contractor Registration Form and Renewal Package",
        "ED-009-v7": "ED-009-v7-Application for Reinstatement as an Elevating Devices Consultant (Contractor)",
        "ED-010-v7": "ED-010-v7-Elevating Devices Evacuation Contractor Registration",
        "ED-011-v7": "ED-011-v7-Application for Reinstatement as an Elevating Devices Evacuation Contractor",
        "ED-012-v7": "ED-012-v7-Elevating Devices Owner Contractor Registration",
        "ED-013-v7": "ED-013-v7-Application for Reinstatement as an Elevating Devices Owner Contractor",
        "ED-017-v4": "ED-017-v4-TSSA Bulk Exam Request",
        "ED-018-v4": "ED-018-v4-Reactivate Application for an Elevating Device",
        "TSSA-999-v2": "TSSA-999-v2",
        "FS-000-v1": "FS-000-v1-TSSA USE ONLY",
        "FS-000-v2": "FS-000-v2-TSSA USE ONLY",
        "FS-025-v5": "FS-025-v5-Vehicle Label Order Form",
        "FS-026-v4": "FS-026-v4-Red Tag/Pressure Test Tag Order Form",
        "FS-029-v5": "FS-029-v5-TSSA Training Provider Bulk Exam Request",
        "FS-035-v5": "FS-035-v5-Application for Modification or Change of Steel - Propane Container Refill Centre or a Filling Plant",
        "FS-036-v6": "FS-036-v6-Application for an Ontario Licence to Operate Propane Cylinder Exchange- New",
        "FS-037-v5": "FS-037-v5-Application for an Ontario Licence to Operate a Propane Cylinder Handling Facility - Change of License Holder",
        "FS-039-v5": "FS-039-v5-Application for an Ontario Licence to Operate a Compressed Gas Refuelling Station - Change of License Holder",
        "FS-041-v6": "FS-041-v6-Application for Reinstatement in Ontario as a Fuels Contractor",
        "FS-042-v6": "FS-042-v6-Application for Reinstatement of an Ontario Licence to Operate a Propane Container Refill Centre or a Filling Plant",
        "FS-043-v5": "FS-043-v5-Application for Reinstatement of an Ontario Licence to Operate a Propane Cylinder Handling Facility",
        "FS-044-v5": "FS-044-v5-Application for Reinstatement of an Ontario Licence to Operate as a Conversion Centre",
        "FS-045-v6": "FS-045-v6-Application for Reinstatement of an Ontario Licence to Operate Propane Cylinder Exchange",
        "FS-047-v6": "FS-047-v6-Application for Reinstatement of an Ontario Licence to Transmit Natural Gas by Pipeline",
        "FS-048-v6": "FS-048-v6-Application for Reinstatement of an Ontario Licence to Distribute Gas",
        "FS-049-v6": "FS-049-v6-Application for Reinstatement of an Ontario Licence to Operate a Compressed Gas Refuelling Station",
        "FS-051-v6": "FS-051-v6-Application for Reinstatement of an Ontario Licence to Transmit Oil by Pipeline",
        "FS-052-v6": "FS-052-v6-Application for Reinstatement of an Ontario Licence to Operate a Retail Outlet or a Bulk Storage Plant",
        "FS-056-v2": "FS-056-v2-Application for an Ontario Licence to Operate as a Conversion Center - Change of Ownership",
        "OE-000-v1": "OE-000-v1-TSSA USE ONLY",
        "OE-000-v2": "OE-000-v2-TSSA USE ONLY",
        "OE-001-v6": "OE-001-v6-Application for Certificate of Registration of a Plant",
        "OE-002-v6": "OE-002-v6-Application for Alternate Rules and Changes to Previous Submissions",
        "OE-005-v5": "OE-005-v5-Application for Duplicate Certificate of Registration or Name Change of a Plant",
        "TSSA-999-v8": "TSSA-999-v8",
        "TSSA-999-v9": "TSSA-999-v9",
        "OE-006-v4": "OE-006-v4-TSSA Bulk Exam Request",
        "PI-096-v4": "PI-096-v4-Application for Database Product",
        "Ski-000-v1": "Ski-000-v1-TSSA USE ONLY",
        "Ski-000-v2": "Ski-000-v2-TSSA USE ONLY",
        "Ski-009-v4": "Ski-009-v4-TSSA Bulk Exam Request",
        "Ski-010-v5": "Ski-010-v5-Ski Passenger Ropeway Contractor",
        "Ski-011-v5": "Ski-011-v5-Ski Passenger Ropeway Owner Contractor",
        "Ski-012-v5": "Ski-012-v5-Ski Passenger Ropeway Consultant Contractor",
        "Ski-013-v5": "Ski-013-v5-Reinstatement as a Ski Passenger Ropeway General Contractor",
        "Ski-014-v5": "Ski-014-v5-Reinstatement as a Ski Passenger Ropeway Owner Contractor",
        "Ski-015-v4": "Ski-015-v4-Reinstatement as a Ski Passenger Ropeway Consultant Contractor",
        "TSSA-Ski-999-v1": "TSSA-Ski-999-v1"
    };

    return selectedFormNames[customerData.applicationFormNumber] || customerData.applicationFormTitle || customerData.applicationFormNumber;
}

function restoreServiceDetails(serviceDetails){
    if(!serviceDetails){
        return;
    }

    $("#contactName").val(serviceDetails.contactName);
    $("#emailAddress").val(serviceDetails.emailAddress);
    $("#phoneNumber").val(serviceDetails.phoneNumber);
    $("#secondaryEmailAddress").val(serviceDetails.secondaryEmailAddress);
    $("#tertiaryEmailAddress").val(serviceDetails.tertiaryEmailAddress);
    $("#customerReference").val(serviceDetails.customerReference);
    $("#authorizationFee").val(serviceDetails.authorizationFee);
    $("#hstFee").val(serviceDetails.hstFee || "$0.00");
    $("#additionalAuthorizationFee").val(serviceDetails.additionalAuthorizationFee || "");
    $("#totalFees").val(serviceDetails.totalFees);
    $("#expeditedService").val(serviceDetails.expeditedService || "");
    $("#rushService").val(serviceDetails.rushService || "RUSH -");
}

function saveServiceDetails(portalId, usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService, usesRushServiceField){
    clearServiceDetailsErrors();

    const errors = [];
    const applicationFormFile = $("#applicationFormUpload")[0].files[0];
    const supportingFiles = Array.from($("#supportingDocuments")[0].files);

    const serviceDetails = {
        contactName: $("#contactName").val().trim(),
        emailAddress: $("#emailAddress").val().trim(),
        phoneNumber: $("#phoneNumber").val().trim(),
        secondaryEmailAddress: $("#secondaryEmailAddress").val().trim(),
        tertiaryEmailAddress: $("#tertiaryEmailAddress").val().trim(),
        customerReference: $("#customerReference").val().trim(),
        authorizationFee: formatCurrency($("#authorizationFee").val()),
        hstFee: usesHstFees ? $("#hstFee").val() : "$0.00",
        additionalAuthorizationFee: usesAdditionalAuthorizationFee ? formatCurrency($("#additionalAuthorizationFee").val()) : "$0.00",
        totalFees: $("#totalFees").val(),
        expeditedService: requiresExpeditedService ? $("#expeditedService").val() : "",
        rushService: usesRushServiceField && $("#expeditedService").val() === "Yes" ? $("#rushService").val() : "",
        applicationFormFileName: applicationFormFile ? applicationFormFile.name : "",
        supportingDocumentFileNames: supportingFiles.map(function(file){
            return file.name;
        })
    };

    validateServiceDetails(serviceDetails, applicationFormFile, supportingFiles, errors, usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService);

    if(errors.length > 0){
        showServiceDetailsErrors(errors);
        return;
    }

    const sessionData = JSON.parse(sessionStorage.getItem(portalId));
    sessionData.serviceDetails = serviceDetails;

    sessionStorage.setItem(portalId, JSON.stringify(sessionData));

    console.log("Step 3 completed:", sessionData);

    // commenting below line for now!!
    // window.location.href = "checkout.html?id=" + portalId;
}

function validateServiceDetails(serviceDetails, applicationFormFile, supportingFiles, errors, usesHstFees, usesAdditionalAuthorizationFee, requiresExpeditedService){
    if(serviceDetails.contactName === ""){
        addServiceDetailsError(errors, "contactName", "Please enter the Contact Name or Name of Submitter.");
    }

    if(serviceDetails.emailAddress === "" || !isValidEmail(serviceDetails.emailAddress)){
        addServiceDetailsError(errors, "emailAddress", "Please enter a valid Email Address.");
    }

    if(!isValidPhoneNumber(serviceDetails.phoneNumber)){
        addServiceDetailsError(errors, "phoneNumber", "Please enter a valid Phone Number in XXX-XXX-XXXX format.");
    }

    if(serviceDetails.secondaryEmailAddress !== "" && !isValidEmail(serviceDetails.secondaryEmailAddress)){
        addServiceDetailsError(errors, "secondaryEmailAddress", "Please enter a valid Optional Secondary Email Address.");
    }

    if(serviceDetails.tertiaryEmailAddress !== "" && !isValidEmail(serviceDetails.tertiaryEmailAddress)){
        addServiceDetailsError(errors, "tertiaryEmailAddress", "Please enter a valid Optional Tertiary Email Address.");
    }

    if(getCurrencyNumber(serviceDetails.authorizationFee) <= 0){
        addServiceDetailsError(errors, "authorizationFee", usesHstFees ? "Please enter the Service Fee." : "Please enter the Authorization Fee.");
    }

    if(usesAdditionalAuthorizationFee && getCurrencyNumber(serviceDetails.additionalAuthorizationFee) <= 0){
        addServiceDetailsError(errors, "additionalAuthorizationFee", "Please enter the Authorization Fee.");
    }

    if(requiresExpeditedService && serviceDetails.expeditedService === ""){
        addServiceDetailsError(errors, "expeditedService", "Please indicate if you are paying for an Expedited (Rush) service.");
    }

    if(!applicationFormFile){
        addServiceDetailsError(errors, "applicationFormUpload", "Please upload the Application Form.");
    }

    if(applicationFormFile && !hasAllowedExtension(applicationFormFile.name, ALLOWED_UPLOAD_EXTENSIONS)){
        addServiceDetailsError(errors, "applicationFormUpload", "Only files of type pdf, doc, docx, xls, xlsx, 7z, and zip are allowed.");
    }

    if(applicationFormFile && applicationFormFile.size > MAX_UPLOAD_FILE_SIZE){
        addServiceDetailsError(errors, "applicationFormUpload", "Application Form Upload cannot exceed 50MB.");
    }

    if(supportingFiles.length > MAX_SUPPORTING_DOCUMENT_FILES){
        addServiceDetailsError(errors, "supportingDocuments", "Supporting Documents can include a maximum of 15 files.");
    }

    supportingFiles.forEach(function(file){
        if(!hasAllowedExtension(file.name, ALLOWED_UPLOAD_EXTENSIONS)){
            addServiceDetailsError(errors, "supportingDocuments", "Only files of type pdf, doc, docx, xls, xlsx, 7z, and zip are allowed.");
        }

        if(file.size > MAX_UPLOAD_FILE_SIZE){
            addServiceDetailsError(errors, "supportingDocuments", 'Supporting Documents cannot exceed 50MB per file. "' + file.name + '" is too large.');
        }
    });
}

function addServiceDetailsError(errors, fieldId, message){
    errors.push({
        fieldId: fieldId,
        message: message
    });

    $("#" + fieldId).addClass("input-error");
}

function isValidEmail(emailAddress){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
}

function isValidPhoneNumber(phoneNumber){
    return /^\d{3}-\d{3}-\d{4}$/.test(phoneNumber);
}

function formatPhoneNumber(phoneNumber){
    const digits = String(phoneNumber).replace(/\D/g, "").slice(0, 10);
    const firstPart = digits.slice(0, 3);
    const secondPart = digits.slice(3, 6);
    const thirdPart = digits.slice(6, 10);

    if(digits.length > 6){
        return firstPart + "-" + secondPart + "-" + thirdPart;
    }

    if(digits.length > 3){
        return firstPart + "-" + secondPart;
    }

    return firstPart;
}

function hasAllowedExtension(fileName, allowedExtensions){
    const extension = fileName.split(".").pop().toLowerCase();
    return allowedExtensions.indexOf(extension) !== -1;
}

function updateTotalFees(amount, usesHstFees, usesAdditionalAuthorizationFee){
    const serviceFee = getCurrencyNumber(amount);
    const hstFee = usesHstFees ? serviceFee * 0.13 : 0;
    const additionalAuthorizationFee = usesAdditionalAuthorizationFee ? getCurrencyNumber($("#additionalAuthorizationFee").val()) : 0;
    const totalFees = serviceFee + hstFee + additionalAuthorizationFee;

    $("#hstFee").val(formatCurrency(hstFee));
    $("#totalFees").val(formatCurrency(totalFees));
}

function formatCurrency(amount){
    const numericAmount = getCurrencyNumber(amount);

    if(numericAmount <= 0){
        return "$0.00";
    }

    return "$" + numericAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getCurrencyNumber(amount){
    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, ""));
    return isNaN(numericAmount) ? 0 : numericAmount;
}

function showServiceDetailsErrors(errors){
    $("#serviceDetailsErrorList").empty();

    errors.forEach(function(error){
        const validationError = normalizeValidationError(error);
        const $listItem = $("<li></li>");

        if(validationError.fieldId){
            const $errorLink = $("<a></a>")
                .attr("href", "#" + validationError.fieldId)
                .attr("data-field-id", validationError.fieldId)
                .text(validationError.message);

            $listItem.append($errorLink);
        }else{
            $listItem.text(validationError.message);
        }

        $("#serviceDetailsErrorList").append($listItem);
    });

    $("#serviceDetailsErrorList a").off("click").on("click", function(e){
        e.preventDefault();
        focusFieldFromError($(this).data("field-id"));
    });

    $("#serviceDetailsErrorBox").slideDown();

    $("html, body").animate({
        scrollTop: $("#serviceDetailsErrorBox").offset().top - 40
    }, 500);
}

function focusFieldFromError(fieldId){
    const $field = $("#" + fieldId);

    if(!$field.length){
        return;
    }

    $("html, body").animate({
        scrollTop: Math.max(0, $field.offset().top - 120)
    }, 400, function(){
        $field.trigger("focus");
    });
}

function clearServiceDetailsErrors(){
    $("#serviceDetailsErrorBox").hide();
    $("#serviceDetailsErrorList").empty();
    $("input, select").removeClass("input-error");
}

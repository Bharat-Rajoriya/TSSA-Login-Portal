(function($) {
    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const $newCustomer = $("#newCustomer");
    const $existingCustomer = $("#existingCustomer");
    const $newCustomerForm = $("#newCustomerForm");
    const $oldCustomerForm = $("#oldCustomerForm");
    const $programAreaBox = $("#programAreaSection");
    const $continueBtn = $("#customerInfoForm .continue-btn");

    $(document).ready(function () {
        const portalIdFromUrl = getPortalIdFromUrl();

        if (portalIdFromUrl) {
            sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalIdFromUrl);
        }

        restoreActivePortalSession();
        updateCustomerForm();

        $("input, select").on("input change", function () {
            $(this).removeClass("input-error");
        });

        $("#postalCode, #existingPostalCode").on("input", function () {
            $(this).val(formatCanadianPostalCode($(this).val()));
        });

        $newCustomer.on("change", updateCustomerForm);
        $existingCustomer.on("change", updateCustomerForm);
        $continueBtn.on("click", handleContinue);
    });

    function updateCustomerForm() {
        if ($newCustomer.is(":checked")) {
            $existingCustomer.prop("checked", false);
            $newCustomerForm.slideDown();
            $oldCustomerForm.hide();
            $programAreaBox.slideDown();
            return;
        }

        if ($existingCustomer.is(":checked")) {
            $newCustomer.prop("checked", false);
            $newCustomerForm.hide();
            $oldCustomerForm.slideDown();
            $programAreaBox.slideDown();
            return;
        }

        $newCustomerForm.hide();
        $oldCustomerForm.hide();
        $programAreaBox.hide();
    }

    function handleContinue(event) {
        event.preventDefault();

        clearValidationErrors();

        const errors = [];
        const customerType = $("input[name='customerType']:checked").val();
        const programArea = $("#programAreaSelect").val();

        if (!customerType) {
            addValidationError(errors, "newCustomer", "Please indicate if you are a New or Existing Customer.");
        }

        if (!programArea) {
            addValidationError(errors, "programAreaSelect", "Please select a Program Area.");
        }

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

            alert("Customer details saved successfully.");
        }

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
                $continueBtn.prop("disabled", false);

                if (!verificationResult.status) {
                    $("#customerNumber").addClass("input-error");
                    $("#existingPostalCode").addClass("input-error");
                    showValidationErrors([{ fieldId: "customerNumber", message: "Customer verification failed. Please check Customer Number and Postal Code." }]);
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
                    programArea: programArea
                };

                sessionStorage.setItem(portalSessionId, JSON.stringify(customerData));
                sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalSessionId);

                alert("Existing customer verified successfully.");
            });
        }
    }

    function verifyExistingCustomer(customerNumber, postalCode, callback) {
        const normalizedPostalCode = postalCode.toUpperCase().replace(/\s/g, "");

        const ajaxCall = getPortalAjax({
            type: "GET",
            url:
                "/_api/accounts" +
                "?$select=name,accountnumber,address1_postalcode,address1_line1,address1_line2,address1_line3,address1_city,address1_stateorprovince" +
                "&$filter=" + encodeURIComponent("accountnumber eq '" + customerNumber.replace(/'/g, "''") + "' and statecode eq 0")
        });

        if (!ajaxCall || typeof ajaxCall.done !== "function") {
            console.error("Customer Validation Error: No AJAX wrapper available. Confirm the Power Pages safeAjax/appAjax wrapper is loaded before homepage.js.");
            callback({ status: false });
            return;
        }

        ajaxCall
            .done(function (response) {
                console.log("Customer Validation Response:", response);

                if (typeof response === "string") {
                    try {
                        response = JSON.parse(response);
                    } catch (error) {
                        console.error("Customer Validation Parse Error:", error);
                        callback({ status: false });
                        return;
                    }
                }

                if (response && response.value && response.value.length > 0) {
                    const customer = response.value[0];
                    const customerPostalCode = (customer.address1_postalcode || "").toUpperCase().replace(/\s/g, "");

                    if (customerPostalCode !== normalizedPostalCode) {
                        callback({ status: false });
                        return;
                    }

                    const streetAddress = [
                        customer.address1_line1,
                        customer.address1_line2,
                        customer.address1_line3
                    ]
                        .filter(function (addressLine) {
                            return addressLine;
                        })
                        .join(", ");

                    callback({
                        status: true,
                        customerName: customer.name || "",
                        customerNumber: customer.accountnumber || "",
                        postalCode: customer.address1_postalcode || "",
                        streetAddress: streetAddress,
                        city: customer.address1_city || "",
                        province: customer.address1_stateorprovince || ""
                    });
                    return;
                }

                callback({ status: false });
            })
            .fail(function (error) {
                console.error("Customer Validation Error:", error);
                callback({ status: false });
            });
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

        try {
            const customerData = JSON.parse(portalSession);

            if (customerData.customerType === "New Customer") {
                $newCustomer.prop("checked", true);
                $("#companyOrIndividualName").val(customerData.companyName || "");
                $("#streetAddress").val(customerData.streetAddress || "");
                $("#city").val(customerData.city || "");
                $("#provinceState").val(customerData.province || "");
                $("#postalCode").val(customerData.postalCode || "");
            }

            if (customerData.customerType === "Existing Customer") {
                $existingCustomer.prop("checked", true);
                $("#customerNumber").val(customerData.customerNumber || "");
                $("#existingPostalCode").val(customerData.postalCode || "");
            }

            $("#programAreaSelect").val(customerData.programArea || "");
        } catch (error) {
            console.error("Failed to restore portal session:", error);
            sessionStorage.removeItem(ACTIVE_PORTAL_SESSION_KEY);
        }
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

    function formatCanadianPostalCode(value) {
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

        if (value.length > 3) {
            value = value.substring(0, 3) + " " + value.substring(3, 6);
        }

        return value.substring(0, 7);
    }

    function isValidCanadianPostalCode(postalCode) {
        postalCode = postalCode.toUpperCase().replace(/\s/g, "");
        const canadianPostalRegex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
        return canadianPostalRegex.test(postalCode);
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

    function addValidationError(errors, fieldId, message) {
        errors.push({ fieldId: fieldId, message: message });
        $("#" + fieldId).addClass("input-error");
    }

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
        $("html, body").animate({ scrollTop: $("#formErrorBox").offset().top - 40 }, 500);
    }

    function normalizeValidationError(error) {
        if (typeof error === "string") {
            return { fieldId: "", message: error };
        }

        return { fieldId: error.fieldId || "", message: error.message || "" };
    }

    function focusFieldFromError(fieldId) {
        const $field = $("#" + fieldId);

        if (!$field.length) {
            return;
        }

        $("html, body").animate({ scrollTop: Math.max(0, $field.offset().top - 120) }, 400, function () {
            $field.trigger("focus");
        });
    }

    function clearValidationErrors() {
        $("#formErrorBox").hide();
        $("#formErrorList").empty();
        $("input, select").removeClass("input-error");
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
})(jQuery);

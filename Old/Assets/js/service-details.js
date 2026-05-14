const MAX_APPLICATION_FORM_FILES = 1;
const MAX_SUPPORTING_DOCUMENT_FILES = 15;
const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "7z", "zip"];
let applicationFormFiles = [];
let supportingDocumentFiles = [];

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

    if(!customerData.applicationFormNumber){
        window.location.href = "form-selection.html?id=" + portalId;
        return;
    }

    sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalId);

    initializeServiceDetailsPage(customerData, portalId);
});

function getUrlParameter(name){
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    var results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

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

    $(".back-btn").on("click", function(){
        window.location.href = "form-selection.html?id=" + portalId;
    });

    $("input, select").on("input change", function(){
        $(this).removeClass("input-error");
    });

    $("#phoneNumber").on("input", function(){
        $(this).val(formatPhoneNumber($(this).val()));
    });

    $("#applicationFormUpload").on("change", function(){
        handleApplicationFormUpload(this);
    });

    $("#supportingDocuments").on("change", function(){
        handleSupportingDocumentsUpload(this);
    });

    $(".upload-notice-close").on("click", function(){
        $(this).closest(".upload-notice").slideUp();
    });

    $("#authorizationFee").on("input", function(){
        updateTotalFees($(this).val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#authorizationFee").on("blur", function(){
        $(this).val(formatCurrency($(this).val()));
        updateTotalFees($(this).val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#additionalAuthorizationFee").on("input", function(){
        updateTotalFees($("#authorizationFee").val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#additionalAuthorizationFee").on("blur", function(){
        $(this).val(formatCurrency($(this).val()));
        updateTotalFees($("#authorizationFee").val(), usesHstFees, usesAdditionalAuthorizationFee);
    });

    $("#expeditedService").on("change", function(){
        updateRushServiceField(usesRushServiceField);
    });

    $("#serviceDetailsForm").on("submit", function(e){
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
        showServiceDetailsErrors([{fieldId: "applicationFormUpload", message: "The Application Form maximum file upload size is 50MB."}]);
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

function normalizeValidationError(error){
    if(typeof error === "string"){
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

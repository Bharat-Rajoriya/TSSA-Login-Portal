$(document).ready(function(){

    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const portalId = getUrlParameter('id');
    const isMergedPortal = $("#portalFormSelectionStep").length > 0;

    if(isPageReload()){
        clearPortalSession(portalId, ACTIVE_PORTAL_SESSION_KEY);
        if(isMergedPortal){
            return;
        }

        window.location.href = "../../index.html";
        return;
    }

    if(isMergedPortal){
        const activePortalId = portalId || sessionStorage.getItem(ACTIVE_PORTAL_SESSION_KEY);

        if(activePortalId && sessionStorage.getItem(activePortalId)){
            const customerData = JSON.parse(sessionStorage.getItem(activePortalId));

            if(!customerData.applicationFormNumber){
                showMergedFormSelectionStep(activePortalId);
            }
        }

        return;
    }

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

function showMergedFormSelectionStep(portalId){
    const ACTIVE_PORTAL_SESSION_KEY = "activePortalSessionId";
    const portalSession = sessionStorage.getItem(portalId);

    if(!portalSession){
        return;
    }

    const customerData = JSON.parse(portalSession);

    sessionStorage.setItem(ACTIVE_PORTAL_SESSION_KEY, portalId);
    updateMergedPortalUrl(portalId);
    showPortalStep("#portalFormSelectionStep");
    initializeDynamicFormPage(customerData, portalId);
}

function showPortalStep(stepSelector){
    $(".portal-step").hide();
    $(stepSelector).show();

    $("html, body").animate({
        scrollTop: $(".container").offset().top - 20
    }, 300);
}

function updateMergedPortalUrl(portalId){
    const url = new URL(window.location.href);
    url.searchParams.set("id", portalId);
    window.history.replaceState(null, "", url.toString());
}

function getUrlParameter(name){
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function clearPortalSession(portalId, activePortalSessionKey){
    const activePortalId = sessionStorage.getItem(activePortalSessionKey);

    if(portalId){
        sessionStorage.removeItem(portalId);
    }

    if(activePortalId){
        sessionStorage.removeItem(activePortalId);
    }

    sessionStorage.removeItem(activePortalSessionKey);
}

function isPageReload(){
    const navigationEntry = performance.getEntriesByType("navigation")[0];

    if(navigationEntry){
        return navigationEntry.type === "reload";
    }

    return performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;
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

    const $backButton = $("#formSelectionBackBtn").length ? $("#formSelectionBackBtn") : $(".form-selection-section .back-btn");

    $backButton.off("click").on("click", function(){
        if($("#portalHomeStep").length){
            showPortalStep("#portalHomeStep");
            return;
        }

        window.location.href = "../../index.html?id=" + portalId;
    });
}



function loadApplicationForms(programArea, portalId){

    const formsDatabase = {

        "amusement-devices": {
            dropdownOptions: [
                {code:"AD-000-v1", title:"TSSA USE ONLY"},
                {code:"AD-000-v2", title:"TSSA USE ONLY"},
                {code:"AD-003-v5", title:"Application for New Amusement Business License"},
                {code:"AD-008-v4", title:"TSSA Bulk Exam Request"}
            ],
            visibleTableTitle: "Amusement Devices Application Forms",
            visibleTable: [
                {code:"AD-003", title:"Application for New Amusement Business License"},
                {code:"AD-008", title:"TSSA Bulk Exam Request"}
            ]
        },

        "boilers-pressure-vessels": {
            dropdownOptions: [
                {code:"BPV-000-v1", title:"TSSA USE ONLY"},
                {code:"BPV-000-v2", title:"TSSA USE ONLY"},
                {code:"BPV-006-v4", title:""},
                {code:"BPV-007-v6", title:""},
                {code:"BPV-008-v5", title:""},
                {code:"BPV-009-v5", title:""},
                {code:"BPV-015-v1", title:""},
                {code:"BPV-016-v1", title:""}
            ],
            visibleTableTitle: "Boilers & Pressure Vessels Application Forms",
            visibleTable: [
                {code:"BPV-006", title:"Seminar Registration Form"},
                {code:"BPV-007", title:"Application for Non-Nuclear Ontario Certificate of Authorization"},
                {code:"BPV-008", title:"Application for an Ontario Certificate of Authorization For Ontario based businesses CSA N285.0 Metallic Material Organizations"},
                {code:"BPV-009", title:"Application for an Ontario Certificate of Authorization For Ontario based businesses CSA N285.0 Nuclear Components"},
                {code:"BPV-015", title:"Boilers and Pressure Vessels - Safety TSSA Regulatory Requirements Training (Module 1)"},
                {code:"BPV-016", title:"Request for Extension of Ontario Certificate of Authorization"}
            ]
        },

        "elevating-devices": {
            dropdownOptions: [
                {code:"ED-000-v1", title:"TSSA USE ONLY"},
                {code:"ED-000-v2", title:"TSSA USE ONLY"},
                {code:"ED-004-v9", title:""},
                {code:"ED-006-v7", title:""},
                {code:"ED-007-v7", title:""},
                {code:"ED-008-v7", title:""},
                {code:"ED-009-v7", title:""},
                {code:"ED-010-v7", title:""},
                {code:"ED-011-v7", title:""},
                {code:"ED-012-v7", title:""},
                {code:"ED-013-v7", title:""},
                {code:"ED-017-v4", title:""},
                {code:"ED-018-v4", title:""},
                {code:"TSSA-999-v2", title:""}
            ],
            visibleTableTitle: "Elevating Devices Application Forms",
            visibleTable: [
                {code:"ED-004", title:"Application for Reinstatement of an Elevating Device License"},
                {code:"ED-006", title:"Elevating Device General Contractor Registration"},
                {code:"ED-007", title:"Application for Reinstatement as an Elevating Devices Contractor"},
                {code:"ED-008", title:"Consultant Contractor Registration Form and Renewal Package"},
                {code:"ED-009", title:"Application for Reinstatement as an Elevating Devices Consultant (Contractor)"},
                {code:"ED-010", title:"Elevating Devices Evacuation Contractor Registration"},
                {code:"ED-011", title:"Application for Reinstatement as an Elevating Devices Evacuation Contractor"},
                {code:"ED-012", title:"Elevating Devices Owner Contractor Registration"},
                {code:"ED-013", title:"Application for Reinstatement as an Elevating Devices Owner Contractor"},
                {code:"ED-017", title:"TSSA Bulk Exam Request"},
                {code:"ED-018", title:"Reactivate Application for an Elevating Device"}
            ]
        },

        "fuels": {
            dropdownOptions: [
                {code:"FS-000-v1", title:"TSSA USE ONLY"},
                {code:"FS-000-v2", title:"TSSA USE ONLY"},
                {code:"FS-025-v5", title:""},
                {code:"FS-026-v4", title:""},
                {code:"FS-029-v5", title:""},
                {code:"FS-035-v5", title:""},
                {code:"FS-036-v6", title:""},
                {code:"FS-037-v5", title:""},
                {code:"FS-039-v5", title:""},
                {code:"FS-041-v6", title:""},
                {code:"FS-042-v6", title:""},
                {code:"FS-043-v5", title:""},
                {code:"FS-044-v5", title:""},
                {code:"FS-045-v6", title:""},
                {code:"FS-047-v6", title:""},
                {code:"FS-048-v6", title:""},
                {code:"FS-049-v6", title:""},
                {code:"FS-051-v6", title:""},
                {code:"FS-052-v6", title:""},
                {code:"FS-056-v2", title:""}
            ],
            visibleTableTitle: "Fuels Application Forms",
            visibleTable: [
                {code:"FS-025", title:"Vehicle Label Order Form"},
                {code:"FS-026", title:"Red Tag/Pressure Test Tag Order Form"},
                {code:"FS-029", title:"TSSA Training Provider Bulk Exam Request"},
                {code:"FS-035", title:"Application for Modification or Change of Steel - Propane Container Refill Centre or a Filling Plant"},
                {code:"FS-036", title:"Application for an Ontario Licence to Operate Propane Cylinder Exchange- New"},
                {code:"FS-037", title:"Application for an Ontario Licence to Operate a Propane Cylinder Handling Facility - Change of License Holder"},
                {code:"FS-039", title:"Application for an Ontario Licence to Operate a Compressed Gas Refuelling Station - Change of License Holder"},
                {code:"FS-041", title:"Application for Reinstatement in Ontario as a Fuels Contractor"},
                {code:"FS-042", title:"Application for Reinstatement of an Ontario Licence to Operate a Propane Container Refill Centre or a Filling Plant"},
                {code:"FS-043", title:"Application for Reinstatement of an Ontario Licence to Operate a Propane Cylinder Handling Facility"},
                {code:"FS-044", title:"Application for Reinstatement of an Ontario Licence to Operate as a Conversion Centre"},
                {code:"FS-045", title:"Application for Reinstatement of an Ontario Licence to Operate Propane Cylinder Exchange"},
                {code:"FS-047", title:"Application for Reinstatement of an Ontario Licence to Transmit Natural Gas by Pipeline"},
                {code:"FS-048", title:"Application for Reinstatement of an Ontario Licence to Distribute Gas"},
                {code:"FS-049", title:"Application for Reinstatement of an Ontario Licence to Operate a Compressed Gas Refuelling Station"},
                {code:"FS-051", title:"Application for Reinstatement of an Ontario Licence to Transmit Oil by Pipeline"},
                {code:"FS-052", title:"Application for Reinstatement of an Ontario Licence to Operate a Retail Outlet or a Bulk Storage Plant"},
                {code:"FS-056", title:"Application for an Ontario Licence to Operate as a Conversion Center - Change of Ownership"}
            ]
        },

        "operating-engineers": {
            dropdownOptions: [
                {code:"OE-000-v1", title:"TSSA USE ONLY"},
                {code:"OE-000-v2", title:"TSSA USE ONLY"},
                {code:"OE-001-v6", title:""},
                {code:"OE-002-v6", title:""},
                {code:"OE-005-v5", title:""},
                {code:"TSSA-999-v8", title:""},
                {code:"TSSA-999-v9", title:""},
                {code:"OE-006-v4", title:""}
            ],
            visibleTableTitle: "Operating Engineers Application Forms",
            visibleTable: [
                {code:"OE-001", title:"Application for Certificate of Registration of a Plant"},
                {code:"OE-002", title:"Application for Alternate Rules and Changes to Previous Submissions"},
                {code:"OE-005", title:"Application for Duplicate Certificate of Registration or Name Change of a Plant"},
                {code:"OE-006", title:"TSSA Bulk Exam Request"}
            ]
        },

        "public-information": {
            dropdownOptions: [
                {code:"PI-096-v4", title:""}
            ],
            visibleTableTitle: "Public Information Application Forms",
            visibleTable: [
                {code:"PI-096", title:"Application for Database Product"}
            ]
        },

        "ski-lifts": {
            dropdownOptions: [
                {code:"Ski-000-v1", title:"TSSA USE ONLY"},
                {code:"Ski-000-v2", title:"TSSA USE ONLY"},
                {code:"Ski-009-v4", title:""},
                {code:"Ski-010-v5", title:""},
                {code:"Ski-011-v5", title:""},
                {code:"Ski-012-v5", title:""},
                {code:"Ski-013-v5", title:""},
                {code:"Ski-014-v5", title:""},
                {code:"Ski-015-v4", title:""},
                {code:"TSSA-Ski-999-v1", title:""}
            ],
            visibleTableTitle: "Ski Application Forms",
            visibleTable: [
                {code:"Ski-009", title:"TSSA Bulk Exam Request"},
                {code:"Ski-010", title:"Ski Passenger Ropeway Contractor"},
                {code:"Ski-011", title:"Ski Passenger Ropeway Owner Contractor"},
                {code:"Ski-012", title:"Ski Passenger Ropeway Consultant Contractor"},
                {code:"Ski-013", title:"Reinstatement as a Ski Passenger Ropeway General Contractor"},
                {code:"Ski-014", title:"Reinstatement as a Ski Passenger Ropeway Owner Contractor"},
                {code:"Ski-015", title:"Reinstatement as a Ski Passenger Ropeway Consultant Contractor"}
            ]
        }
    };

    const currentForms = formsDatabase[programArea];

    if(!currentForms){
        return;
    }

    $("#applicationFormSelect").empty();
    $("#applicationFormSelect").append('<option value="">Please select an Application Form.</option>');

    currentForms.dropdownOptions.forEach(function(form){
        const optionText = form.title ? form.code + '-' + form.title : form.code;
        $("#applicationFormSelect").append('<option value="'+form.code+'">'+optionText+'</option>');
    });

    const sessionData = JSON.parse(sessionStorage.getItem(portalId));

    if(sessionData.applicationFormNumber){
        $("#applicationFormSelect").val(sessionData.applicationFormNumber);
    }

    let tableHtml = '<table class="program-form-table">';
    tableHtml += '<tr><th colspan="2">'+currentForms.visibleTableTitle+'</th></tr>';

    currentForms.visibleTable.forEach(function(form){
        tableHtml += '<tr><td>'+form.code+'</td><td>'+form.title+'</td></tr>';
    });

    tableHtml += '</table>';

    $("#formDescriptionTable").html(tableHtml);


    $(".continue-form-btn").off("click").on("click", function(){

        clearFormSelectionErrors();

        const selectedForm = $("#applicationFormSelect").val();

        if(selectedForm == ""){
            $("#applicationFormSelect").addClass("input-error");
            showFormSelectionErrors([{fieldId: "applicationFormSelect", message: "Please select an Application Form Number."}]);
            return;
        }

        const sessionData = JSON.parse(sessionStorage.getItem(portalId));
        sessionData.applicationFormNumber = selectedForm;
        sessionData.applicationFormTitle = $("#applicationFormSelect option:selected").text();

        sessionStorage.setItem(portalId, JSON.stringify(sessionData));

        console.log("Step 2 completed:", sessionData);

        if($("#portalServiceDetailsStep").length && typeof showMergedServiceDetailsStep === "function"){
            showMergedServiceDetailsStep(portalId);
            return;
        }

        window.location.href = "service-details.html?id=" + portalId;
    });
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

function clearFormSelectionErrors(){
    $("#formSelectErrorBox").hide();
    $("#formSelectErrorList").empty();
    $("select").removeClass("input-error");
}

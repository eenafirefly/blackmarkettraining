window.ax_debug_logging = false;

/**
 * Calls makes an ajax call to a backend page that will then handle communication with aXcelerate.
 * @param action - the action, how the function call is identified through the backend. Generally callResourceAX when using this function.
 * @param endpoint - axcelerate API endpoint to call
 * @param method - The method to call the axcelerate API endpoint ('GET', 'POST', 'PUT' etc)
 * @param params - The data/parameters of the API call.
 * @param callback - the function to call once the API call has completed.
 * @param axToken - a User AXtoken. This is used to perform user specific API Calls. For example retrieving contacts a client has access to.
 */
function callResourceAX(action, endpoint, method, params, callback, axToken) {
    var ajaxURL = enroller_default_vars.ajaxURL;
    params.action = action;
    params.method = method;
    params.endpoint = endpoint;
    params.AXTOKEN = axToken;

    if (window._wp_nonce != null) {
        params.ax_security = window._wp_nonce;
    }

    if (window.ax_session != null) {
        params.ax_session = window.ax_session.session_id;
    }

    jQuery.ajax({
        type: "POST",
        url: ajaxURL,
        dataType: "JSON",
        data: params,

        success: function (result) {
            if (result != null) {
                if (result.session != null) {
                    window.ax_session = result.session;
                    delete result.session;
                }
            }
            callback(result);
        }
    });
}

function s3Upload(xhrParams, file, callback, progressHandlingFunction) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", xhrParams.url, true);
    xhr.setRequestHeader("Content-Type", xhrParams.headers["Content-Type"]);
    xhr.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            if (this.status === 200) {
                callback({
                    success: true
                });
            } else {
                callback({
                    success: false
                });
            }
        }
    };
    xhr.upload.addEventListener("progress", progressHandlingFunction, false);
    xhr.send(file);
}

function storeEnrolData(params, callback) {
    var ajaxURL = enroller_default_vars.ajaxURL;
    params.action = "store_enrolment";
    if (window._wp_nonce != null) {
        params.ax_security = window._wp_nonce;
    }
    if (window.ax_session != null) {
        params.ax_session = window.ax_session.session_id;
    }
    jQuery.ajax({
        type: "POST",
        url: ajaxURL,
        dataType: "JSON",
        data: params,

        success: function (result) {
            callback(result.TOKEN);
        }
    });
}

function storePostEnrolData(params, callback) {
    var ajaxURL = enroller_default_vars.ajaxURL;
    params.action = "store_post_enrolment";
    if (window._wp_nonce != null) {
        params.ax_security = window._wp_nonce;
    }
    if (window.ax_session != null) {
        params.ax_session = window.ax_session.session_id;
    }
    jQuery.ajax({
        type: "POST",
        url: ajaxURL,
        dataType: "JSON",
        data: params,

        success: function (result) {
            callback(result);
        }
    });
}

function enrolmentComplete(params) {
    var ajaxURL = enroller_default_vars.ajaxURL;
    params.action = "enrolment_complete";
    if (window._wp_nonce != null) {
        params.ax_security = window._wp_nonce;
    }
    if (window.ax_session != null) {
        params.ax_session = window.ax_session.session_id;
    }
    jQuery.ajax({
        type: "POST",
        url: ajaxURL,
        dataType: "JSON",
        data: params,

        success: function (result) {
            if (result != null) {
                if (result.ACTION == "redirect") {
                    // if there are outstanding API calls, just hold off for a second.
                    if (jQuery.active > 0) {
                        if (window.ax_debug_logging) {
                            console.info("Blocked navigation due to ongoing call");
                        }
                        jQuery(document).one("ajaxStop", function () {
                            if (window.ax_debug_logging) {
                                console.info("Navigation now allowed");
                            }
                            window.location = result.REDIRECT_URL;
                        });
                    } else {
                        if (window.ax_debug_logging) {
                            console.info("Navigation allowed");
                        }
                        window.location = result.REDIRECT_URL;
                    }
                } else if (result.ACTION == "hide_and_display") {
                    jQuery("#enroller").hide();

                    jQuery("#enroller_success").show(100);
                    var position = jQuery("#enroller_success").offset();
                    if (position != null) {
                        jQuery("body,html")
                            .stop(true, true)
                            .animate({ scrollTop: position.top - 100 }, "slow");
                    }
                } else {
                }
            }
        }
    });
}

function standardAjax(params, callback) {
    var ajaxURL = enroller_default_vars.ajaxURL;
    if (window._wp_nonce != null) {
        params.ax_security = window._wp_nonce;
    }

    if (window.ax_session != null) {
        params.ax_session = window.ax_session.session_id;
    }

    jQuery.ajax({
        type: "POST",
        url: ajaxURL,
        dataType: "JSON",
        data: params,

        success: function (result) {
            if (result && !Array.isArray(result) && result.session != null) {
                window.ax_session = result.session;
                delete result.session;
            }

            callback(result);
        }
    });
}

function requestIdentityValidation(params, callback) {
    params.action = "request_validation_email";
    standardAjax(params, callback);
}

function ePayment(params, callback) {
    params.action = "epayment_process";
    standardAjax(params, callback);
}

function ePaymentCheckStatus(params, callback) {
    params.action = "epayment_check_status";
    standardAjax(params, callback);
}

function ePaymentNext(params, callback) {
    params.action = "epayment_next_step";
    standardAjax(params, callback);
}

function courseInstanceV2(params, callback) {
    params.action = "course_instance_v2";
    standardAjax(params, callback);
}

function courseInstanceItems(params, callback) {
    params.action = "instance_items_v2";
    standardAjax(params, callback);
}

function sendReminderByReference(params, callback) {
    params.action = "send_reminder_by_reference";
    standardAjax(params, callback);
}
function hasEnrolmentByReference(params, callback) {
    params.action = "has_enrolment_by_reference";
    standardAjax(params, callback);
}
function flagEnrolmentsAsRedundantByReference(params, callback) {
    params.action = "flag_others_redundant_by_reference";
    standardAjax(params, callback);
}

function validateUSI(params, callback) {
    params.action = "ax_verify_usi";
    standardAjax(params, callback);
}

function cognitoAccessToken(params, callback) {
    params.action = "ax_validate_access_token";
    standardAjax(params, callback);
}
function logout(params, callback) {
    params.action = "ax_logout";
    standardAjax(params, callback);
}

function paymentFlowForm(params, callback) {
    params.action = "ax_payment_flow_form";
    standardAjax(params, callback);
}
function paymentPlanForm(params, callback) {
    params.action = "ax_payment_plan_form";
    standardAjax(params, callback);
}

function beginPaymentFlow(params, callback) {
    params.action = "ax_payment_flow_begin";
    standardAjax(params, callback);
}

function beginEZFlow(params, callback) {
    params.action = "ax_select_plan";
    standardAjax(params, callback);
}

function triggerEnrolment(params, callback) {
    params.action = "ax_trigger_resumption";
    standardAjax(params, callback);
}

function retrieveABN(params, callback) {
    params.action = "ax_retrieve_abn_org";
    standardAjax(params, callback);
}

function updateABN(params, callback) {
    params.action = "ax_update_org_abn";
    standardAjax(params, callback);
}

function contactSearch(params, callback) {
    params.action = "cr_contact_search";
    standardAjax(params, callback);
}

function courseInstanceSearch(params, callback) {
    params.action = "cr_course_instance_search";
    standardAjax(params, callback);
}

function axPayment(params, callback) {
    params.action = "cr_payment";
    standardAjax(params, callback);
}
function axCourseEnrol(params, callback) {
    params.action = "cr_course_enrol";
    standardAjax(params, callback);
}
function axEnrolmentInfoCapture(params, callback) {
    params.action = "cr_enrolment_info_capture";
    standardAjax(params, callback);
}
function axCourseDetail(params, callback) {
    params.action = "cr_course_detail";
    standardAjax(params, callback);
}
function axDiscounts(params, callback) {
    params.action = "cr_discounts";
    standardAjax(params, callback);
}
function axCourseDiscounts(params, callback) {
    params.action = "cr_course_discounts";
    standardAjax(params, callback);
}

function axContactUpdate(params, callback) {
    params.action = "cr_contact_update";
    standardAjax(params, callback);
}

function axAddContact(params, callback) {
    params.action = "cr_contact_add";
    standardAjax(params, callback);
}

function axUserLogin(params, callback) {
    params.action = "cr_user_login";
    standardAjax(params, callback);
}
function axContactPortfolioUpdate(params, callback) {
    params.action = "cr_portfolio_update";
    standardAjax(params, callback);
}

function axContactPortfolioCreate(params, callback) {
    params.action = "cr_portfolio_create";
    standardAjax(params, callback);
}

function axGetPFile(params, callback) {
    params.action = "cr_portfolio_file";
    standardAjax(params, callback);
}

function axPortfolio(params, callback) {
    params.action = "cr_contact_portfolio";
    standardAjax(params, callback);
}

function axPortfolioChecklist(params, callback) {
    params.action = "cr_portfolio_check";
    standardAjax(params, callback);
}
function axCreateUser(params, callback) {
    params.action = "cr_create_user";
    standardAjax(params, callback);
}

function axForgotPassword(params, callback) {
    params.action = "cr_forgot_password";
    standardAjax(params, callback);
}

function axCourseEnquire(params, callback) {
    params.action = "cr_course_enquire";
    standardAjax(params, callback);
}

function axContactNote(params, callback) {
    params.action = "cr_contact_note";
    standardAjax(params, callback);
}

function axCourseEnrolments(params, callback) {
    params.action = "cr_course_enrolments";
    standardAjax(params, callback);
}

function axContactEnrolments(params, callback) {
    params.action = "cr_contact_enrolments";
    standardAjax(params, callback);
}

function axAgentInfo(params, callback) {
    params.action = "cr_agent_info";
    standardAjax(params, callback);
}

function axOrganisation(params, callback) {
    params.action = "cr_organisation";
    standardAjax(params, callback);
}

function axEPaymentRules(params, callback) {
    params.action = "cr_epayment_rules";
    standardAjax(params, callback);
}
function axEPaymentRulesEZ(params, callback) {
    params.action = "cr_epayment_rules_ez";
    standardAjax(params, callback);
}
function axEPaymentFeesEZ(params, callback) {
    params.action = "cr_epayment_ez_fees";
    standardAjax(params, callback);
}
function axGetInvoice(params, callback) {
    params.action = "cr_get_invoice";
    standardAjax(params, callback);
}

function axGetFieldList(params, callback) {
    params.action = "cr_field_list";
    standardAjax(params, callback);
}
function axGetCourses(params, callback) {
    params.action = "cr_get_courses";
    standardAjax(params, callback);
}

function axGetCustomFields(params, callback) {
    params.action = "cr_custom_fields";
    standardAjax(params, callback);
}

function axCourseLocations(params, callback) {
    params.action = "cr_course_locations";
    standardAjax(params, callback);
}

function axContactSources(params, callback) {
    params.action = "cr_contact_sources";
    standardAjax(params, callback);
}

function axPaymentUrl(params, callback) {
    params.action = "ax_payment_url";
    standardAjax(params, callback);
}

function axPortfolioUploadUrl(params, callback) {
    params.action = "cr_presigned_url";
    params.forceOverwrite = true;
    params.dir = "portfolio";
    standardAjax(params, callback);
}
function linkPortfolioToFile(params, callback) {
    params.action = "cr_portfolio_link";
    params.folder = "";
    standardAjax(params, callback);
}

function accountSelect(params, callback) {
    params.action = "cr_user_account_select";
    standardAjax(params, callback);
}

jQuery(function ($) {
    /*
     * By default data-role page will take the content of the page in with it - first split it out so that the JQM styling is not applied
     * */
    var holder = jQuery(".enroller-content");
    var content = holder.contents();
    content.insertAfter(jQuery(".enroller-content"));

    jQuery(".enroller-content").append($("#enroller"));

    var newWindow = null;

    var Cognito_CreateEnroller = null;
    var COGNITO = false;
    var SKIP_CHECK = false;
    function removeURLParameter(url, parameter) {
        //prefer to use l.search if you have a location/link object
        var urlparts = url.split("?");
        if (urlparts.length >= 2) {
            var prefix = encodeURIComponent(parameter) + "=";
            var pars = urlparts[1].split(/[&;]/g);

            //reverse iteration as may be destructive
            for (var i = pars.length; i-- > 0; ) {
                //idiom for string.startsWith
                if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                    pars.splice(i, 1);
                }
            }

            url = urlparts[0] + "?" + pars.join("&");
            return url;
        } else {
            return url;
        }
    }
    var cleanedUrl = removeURLParameter(window.location.href, "access_code");
    cleanedUrl = removeURLParameter(cleanedUrl, "uid");
    if (cleanedUrl[cleanedUrl.length - 1] === "?") {
        cleanedUrl = cleanedUrl.replace("?", "");
    }
    window.history.replaceState({}, document.title, cleanedUrl);
    function cognitoLoad(session) {
        if (session && session.idToken) {
            if (session.idToken.payload) {
                console.log(session.idToken.payload);
            }
        }

        if (newWindow && !newWindow.closed) {
            newWindow.close();
        }

        $("#cognito").remove();
        if (Cognito_CreateEnroller != null) {
            cognitoAccessToken({ access_token: session.accessToken }, function (response) {
                if (response.logged_in) {
                    if (response.session) {
                        window.ax_session = response.session;
                    }
                    after_init_vars.login_status = response;
                    Cognito_CreateEnroller();
                }
            });
        }
    }
    window.cognitoLoad = cognitoLoad;

    var enroller_steps = ENROLLER_STEP_DEFAULTS;
    var step_order = [
        "userLogin",
        "contactGeneral",
        "courses",
        "contactAvetmiss",
        "contactAddress",
        "emergencyContact",
        "review",
        "billing"
    ];
    enroller_steps["contactCRICOS"];
    var COUNTRY_LIST = null;

    var extraOptions = { country_list: null };
    if (after_init_vars.country_list !== null) {
        extraOptions.country_list = after_init_vars.country_list;
    }
    if (after_init_vars.language_list !== null) {
        extraOptions.language_list = after_init_vars.language_list;
    }
    var callsToComplete = { country: false };

    if (window.after_init_vars != null) {
        // set up for cognito:

        if (after_init_vars.cognito_enabled != null) {
            COGNITO = true;
        }

        /*
         * Initially there are some standard fields that need to be checked and the values retrieved via the API
         * */

        /*
         * Override for calls - not currently utilised
         * */
        if (after_init_vars.callsToComplete != null) {
            callsToComplete = after_init_vars.callsToComplete;
        }

        /*
         * Process the Configuration
         * */
        if (after_init_vars.config_id != null) {
            var configList = $.parseJSON(after_init_vars.config_settings);

            /*
             * Set the Enroller Steps - to be modified before creating the Widget
             * */
            enroller_steps = configList[after_init_vars.config_id].enroller_steps;
            step_order = configList[after_init_vars.config_id].step_order;

            /*
             * Check the Config for additional settings
             * */
            $.each(configList[after_init_vars.config_id], function (option, setting) {
                if (option != "enroller_steps" && option != "step_order") {
                    if (setting != null) {
                        extraOptions[option] = setting;
                    }
                }
            });

            /*
             * Look through the steps, add anything that is set against the defaults that is missing.
             * Determine which API calls are needed to populate all field values
             * */
            $.each(enroller_steps, function (key, step) {
                if (ENROLLER_STEP_DEFAULTS[key] != undefined) {
                    $.each(ENROLLER_STEP_DEFAULTS[key], function (stepKey, value) {
                        if (step[stepKey] == null) {
                            step[stepKey] = value;
                        }
                    });
                }

                /* Check if a value for STEP_TERMS exists and set it to display as TERMS*/
                if (step.STEP_TERMS != null && step.TERMS == null) {
                    step.TERMS = step.STEP_TERMS;
                }

                if (step.TERMS == "") {
                    delete step.TERMS;
                }

                var prefixes = ["", "payer_", "user_"];
                for (var i = 0; i < prefixes.length; i++) {
                    var prefix = prefixes[i];

                    if (
                        step.FIELDS != null &&
                        after_init_vars.country_list &&
                        after_init_vars.country_list.length > 0
                    ) {
                        if (step.FIELDS[prefix + "COUNTRYOFBIRTHID"] != null) {
                            step.FIELDS[prefix + "COUNTRYOFBIRTHID"].VALUES =
                                after_init_vars.country_list;
                        }
                        if (step.FIELDS[prefix + "COUNTRYOFCITIZENID"] != null) {
                            step.FIELDS[prefix + "COUNTRYOFCITIZENID"].VALUES =
                                after_init_vars.country_list;
                        }
                        if (step.FIELDS[prefix + "COUNTRYID"] != null) {
                            step.FIELDS[prefix + "COUNTRYID"].VALUES = after_init_vars.country_list;
                        }
                        if (step.FIELDS[prefix + "SCOUNTRYID"] != null) {
                            step.FIELDS[prefix + "SCOUNTRYID"].VALUES =
                                after_init_vars.country_list;
                        }
                    }

                    if (step.FIELDS != null) {
                        $.each(step.FIELDS, function (fieldKey, field) {
                            if (fieldKey == prefix + "SOURCECODEID") {
                                if (field.VALUES.length < 1) {
                                    callsToComplete.contactSources = false;
                                }
                            }

                            if (fieldKey == prefix + "MAINLANGUAGEID") {
                                field.VALUES = after_init_vars.language_list;
                            }

                            if (field.SYNC_TO_CUSTOM_FIELD) {
                                callsToComplete.customFields = false;
                            }
                        });
                    }
                }
            });
        }

        //Always run country call

        callsToComplete.country =
            after_init_vars.country_list && after_init_vars.country_list.length > 0;

        var ajaxURL = after_init_vars.ajaxURL;

        /*
         * Check to see if any API calls are needed, if they are then perform ASYNC calls to get the data.
         * Each call does a check to see if the others are completed, and if they are then creates the enroller.
         * Works by each call referencing and updating the same objects.
         */
        if (callsToComplete != null) {
            if (!$.isEmptyObject(callsToComplete)) {
                if (callsToComplete.country !== false) {
                    ENROLLER_FIELD_HELPERS.getListByReference(
                        ENROLLER_FIELD_HELPERS.COUNTRY_LIST,
                        function (countries) {
                            $.each(enroller_steps, function (step, stepData) {
                                if (stepData.FIELDS != null) {
                                    var prefixes = ["", "payer_", "user_"];
                                    for (var i = 0; i < prefixes.length; i++) {
                                        var prefix = prefixes[i];
                                        if (stepData.FIELDS[prefix + "COUNTRYOFBIRTHID"] != null) {
                                            stepData.FIELDS[prefix + "COUNTRYOFBIRTHID"].VALUES =
                                                countries;
                                        }
                                        if (
                                            stepData.FIELDS[prefix + "COUNTRYOFCITIZENID"] != null
                                        ) {
                                            stepData.FIELDS[prefix + "COUNTRYOFCITIZENID"].VALUES =
                                                countries;
                                        }
                                        if (stepData.FIELDS[prefix + "COUNTRYID"] != null) {
                                            stepData.FIELDS[prefix + "COUNTRYID"].VALUES =
                                                countries;
                                        }
                                        if (stepData.FIELDS[prefix + "SCOUNTRYID"] != null) {
                                            stepData.FIELDS[prefix + "SCOUNTRYID"].VALUES =
                                                countries;
                                        }
                                    }
                                }
                            });

                            extraOptions.country_list = countries;
                            callsToComplete.country = true;
                            createEnroller();
                        }
                    );
                }
                if (callsToComplete.language != null) {
                    ENROLLER_FIELD_HELPERS.getListByReference(
                        ENROLLER_FIELD_HELPERS.LANGUAGE_LIST,
                        function (languages) {
                            $.each(enroller_steps, function (step, stepData) {
                                if (stepData.FIELDS != null) {
                                    var prefixes = ["", "payer_", "user_"];
                                    for (var i = 0; i < prefixes.length; i++) {
                                        var prefix = prefixes[i];
                                        if (stepData.FIELDS[prefix + "MAINLANGUAGEID"] != null) {
                                            stepData.FIELDS[prefix + "MAINLANGUAGEID"].VALUES =
                                                languages;
                                        }
                                    }
                                }
                            });
                            callsToComplete.language = true;
                            createEnroller();
                        }
                    );
                }

                /*
                 * If Contact Source is required, make sure to process the data to the correct format
                 * */
                if (callsToComplete.contactSources != null) {
                    ENROLLER_FIELD_HELPERS.contactSources({}, function (contactSources) {
                        var convertedSources = {
                            DISPLAY: "Contact Source",
                            VALUES: [],
                            TYPE: "search-select"
                        };

                        if (contactSources[0] != null) {
                            $.each(contactSources, function (i, source) {
                                var temp = {
                                    DISPLAY: source.SOURCE,
                                    VALUE: source.SOURCECODEID
                                };
                                convertedSources.VALUES.push(temp);
                            });
                        }

                        if (convertedSources.VALUES.length > 0) {
                            contact_sources = convertedSources;
                        } else {
                            contact_sources = null;
                        }
                        var prefixes = ["", "payer_", "user_"];
                        $.each(enroller_steps, function (step, stepData) {
                            if (stepData.FIELDS != null) {
                                for (var i = 0; i < prefixes.length; i++) {
                                    var prefix = prefixes[i];
                                    if (stepData.FIELDS[prefix + "SOURCECODEID"] != null) {
                                        if (contact_sources != null) {
                                            stepData.FIELDS[prefix + "SOURCECODEID"].VALUES =
                                                contact_sources.VALUES;
                                        } else {
                                            delete stepData.FIELDS[prefix + "SOURCECODEID"];
                                        }
                                    }
                                }
                            }
                        });

                        callsToComplete.contactSources = true;
                        createEnroller();
                    });
                }

                if (callsToComplete.customFields != null) {
                    ENROLLER_FIELD_HELPERS.getCustomFields(function (customFields) {
                        $.each(enroller_steps, function (step, stepData) {
                            if (stepData.FIELDS != null) {
                                $.each(stepData.FIELDS, function (index, field) {
                                    var fieldID = index.replace("payer_", "").replace("user_", "");
                                    if (
                                        field.SYNC_TO_CUSTOM_FIELD &&
                                        customFields[fieldID] &&
                                        customFields[fieldID].VALUES
                                    ) {
                                        field.VALUES = customFields[fieldID].VALUES;
                                    }
                                });
                            }
                        });
                        callsToComplete.customFields = true;
                        createEnroller();
                    });
                }
            } else {
                createEnroller();
            }
        }
    }

    //	function getContact (params, callback){
    //		params.action = "axip_get_contact_action";
    //		$.ajax({
    //			type: "POST",
    //			url: ajaxURL,
    //			dataType: 'JSON',
    //			data: params,
    //			beforeSend: function( xhr ) {
    //				$("#axip_ajaxLoader").show();
    //			},
    //			success: function(result) {
    //				callback(result);
    //
    //			}
    //
    //		});
    //	}

    /*
     * Does a final check over the Settings then creates the Enrolment Widget
     * */
    function createEnroller() {
        /*
         * Check to see if all ajax calls have been completed
         * */
        var allComplete = true;
        if (!$.isEmptyObject(callsToComplete)) {
            $.each(callsToComplete, function (key, complete) {
                if (!complete) {
                    allComplete = false;
                }
            });
        }

        if (allComplete) {
            /*
             * Wrap everything in a Try Block - Not strictly needed
             */
            try {
                var course = {
                    INSTANCEID: 0,
                    ID: 0,
                    TYPE: "p"
                };

                /*
                 * Check for a Course ID from the Shortcode Variables
                 * */
                if (after_init_vars.course_id != null) {
                    if (after_init_vars.course_id > 0) {
                        course.ID = parseInt(after_init_vars.course_id, 10);
                        course.INSTANCEID = parseInt(after_init_vars.instance_id, 10);
                        if (after_init_vars.type != "") {
                            course.TYPE = after_init_vars.type;
                        }
                    }
                }

                /*
                 * Default Settings - Some may be overridden in the configuration
                 * */
                var enrollerOptions = {
                    config_id: after_init_vars.config_id,
                    get_contact: ENROLLER_FUNCTION_DEFAULTS.contactSearch,
                    update_contact: ENROLLER_FUNCTION_DEFAULTS.updateContact,
                    add_contact: ENROLLER_FUNCTION_DEFAULTS.addContact,

                    user_course_search: false,
                    user_contact_create: false,

                    login_or_create: true,
                    login_roles: { 1: { is_agent: false, is_payer: true, is_student: true } },
                    agent_multiple: false,

                    user_reset: ENROLLER_FUNCTION_DEFAULTS.resetPassword,
                    create_user: ENROLLER_FUNCTION_DEFAULTS.createUser,
                    user_login: ENROLLER_FUNCTION_DEFAULTS.userLogin,

                    course: course,
                    calculate_discount: ENROLLER_FUNCTION_DEFAULTS.calculateDiscounts,
                    search_courses: ENROLLER_FUNCTION_DEFAULTS.courseSearch,
                    get_course_detail: ENROLLER_FUNCTION_DEFAULTS.courseDetail,
                    course_enrol: ENROLLER_FUNCTION_DEFAULTS.courseEnrol,
                    disable_on_complete: true,

                    enroller_steps: enroller_steps,
                    step_order: step_order,
                    checklist_overwrite: after_init_vars.checklist_overwrite,

                    environment: "wordpress",
                    selects_as_chosens: true,
                    step_layout: "left",

                    /*Updates 23/11/16*/

                    enrolment_check: ENROLLER_FUNCTION_DEFAULTS.courseEnrolments,
                    enrol_invoice_check: ENROLLER_FUNCTION_DEFAULTS.contactEnrolments,
                    payment_only: ENROLLER_FUNCTION_DEFAULTS.paymentInvoice,
                    get_client_organisation: ENROLLER_FUNCTION_DEFAULTS.getClientOrganisation,
                    get_agent_detail: ENROLLER_FUNCTION_DEFAULTS.getAgentData,

                    search_contacts: ENROLLER_FUNCTION_DEFAULTS.contactSearch,
                    contact_note: ENROLLER_FUNCTION_DEFAULTS.contactNote,
                    course_enquire: ENROLLER_FUNCTION_DEFAULTS.courseEnquire,

                    get_portfolio_contact: ENROLLER_FUNCTION_DEFAULTS.getPortfolio,
                    get_portfolio_checklist: ENROLLER_FUNCTION_DEFAULTS.getPortfolioChecklist,
                    get_portfolio_file: ENROLLER_FUNCTION_DEFAULTS.getPortfolioFile,
                    add_update_portfolio: ENROLLER_FUNCTION_DEFAULTS.updatePortfolio,

                    /*enrolData store*/
                    store_enrol_data: storeEnrolData,
                    store_post_enrol_data: storePostEnrolData,

                    enrolment_complete: enrolmentComplete,

                    /*WP-304*/
                    request_email_validation: requestIdentityValidation,

                    payer_abn_retrieve: ENROLLER_FUNCTION_DEFAULTS.retrieveORGABN,
                    payer_abn_update: ENROLLER_FUNCTION_DEFAULTS.updateORGABN,

                    /*Enrolment Info Capture*/
                    enrol_info_capture: ENROLLER_FUNCTION_DEFAULTS.enrolmentInfoCapture,
                    mothership_domain: after_init_vars.ax_mothership_url
                };

                /*Load hash data*/
                if (after_init_vars.contact_id != null) {
                    enrollerOptions.contact_id = parseInt(after_init_vars.contact_id);
                }
                if (after_init_vars.user_contact_id != null) {
                    enrollerOptions.user_contact_id = parseInt(after_init_vars.user_contact_id);
                }
                if (after_init_vars.contact_list != null) {
                    if (enroller_steps.contactSearch != null) {
                        enroller_steps.contactSearch.contactList = after_init_vars.contact_list;
                    }
                }
                if (after_init_vars.payer_id != null) {
                    enrollerOptions.payer_id = parseInt(after_init_vars.payer_id);
                }
                if (after_init_vars.enrolment_hash != null) {
                    enrollerOptions.enrolment_hash = after_init_vars.enrolment_hash;
                }
                if (after_init_vars.multiple_courses != null) {
                    $.each(after_init_vars.multiple_courses, function (contactID, enrolment) {
                        $.each(enrolment, function (key, value) {
                            if (key != "CONTACT_NAME") {
                                value.cost = parseFloat(value.cost);
                                value.instanceID = parseInt(value.instanceID);
                                value.payerID = parseInt(value.payerID);
                                value.originalCost = parseFloat(value.originalCost);
                                value.generateInvoice = parseInt(value.generateInvoice);
                                value.contactID = parseInt(value.contactID);
                            }
                        });
                    });
                    enrollerOptions.multiple_courses = after_init_vars.multiple_courses;
                }
                if (after_init_vars.invoice_id != null) {
                    enrollerOptions.invoice_id = parseInt(after_init_vars.invoice_id);
                }
                if (after_init_vars.course != null) {
                    course.ID = parseInt(after_init_vars.course.ID);
                    course.INSTANCEID = parseInt(after_init_vars.course.INSTANCEID);
                    course.TYPE = after_init_vars.course.TYPE;
                    enrollerOptions.course = course;
                }
                if (after_init_vars.skip_to_step != null) {
                    enrollerOptions.skip_to_step = after_init_vars.skip_to_step;
                }
                if (after_init_vars.user_ip != null) {
                    enrollerOptions.user_ip = after_init_vars.user_ip;
                }

                if (after_init_vars.ezypay_plan_selected != null) {
                    enrollerOptions.ezypay_plan_selected = after_init_vars.ezypay_plan_selected;
                }

                /*Location/venue/DL*/
                if (
                    after_init_vars.venue_restriction != null &&
                    after_init_vars.venue_restriction != ""
                ) {
                    enrollerOptions.venue_restriction = after_init_vars.venue_restriction;
                }
                if (
                    after_init_vars.delivery_location_restriction != null &&
                    after_init_vars.delivery_location_restriction != ""
                ) {
                    enrollerOptions.delivery_location_restriction =
                        after_init_vars.delivery_location_restriction;
                }
                if (
                    after_init_vars.location_restriction != null &&
                    after_init_vars.location_restriction != ""
                ) {
                    enrollerOptions.location_restriction = after_init_vars.location_restriction;
                }

                if (after_init_vars.cc_surcharge != null) {
                    if (after_init_vars.cc_surcharge > 0) {
                        enrollerOptions.surcharge_on = { payment: after_init_vars.cc_surcharge };
                    }
                }

                /*
                 * Add Role Scope for Allowed User types
                 * Add/Update any other settings that were in the config
                 * */
                $.each(extraOptions, function (option, setting) {
                    if (option == "allow_clients" && setting) {
                        enrollerOptions.login_roles[4] = {
                            is_agent: false,
                            is_payer: true,
                            is_student: false
                        };
                    } else if (option == "allow_learners" && setting) {
                        enrollerOptions.login_roles[2] = {
                            is_agent: false,
                            is_payer: true,
                            is_student: true
                        };
                    } else if (option == "allow_agents" && setting) {
                        enrollerOptions.login_roles[5] = {
                            is_agent: true,
                            is_payer: false,
                            is_student: false
                        };
                    } else if (option == "allow_trainers" && setting) {
                        enrollerOptions.login_roles[3] = {
                            is_agent: false,
                            is_payer: false,
                            is_student: false
                        };
                    } else if (option == "discounts_available") {
                        if (setting) {
                            enrollerOptions.get_discounts = ENROLLER_FUNCTION_DEFAULTS.getDiscounts;
                        } else {
                            enrollerOptions.get_discounts = null;
                        }
                    } else {
                        enrollerOptions[option] = setting;
                    }
                });

                var toCheck = [
                    "resumption_type",
                    "lock_at_step",
                    "promo_code",
                    "cart_course_override",
                    "cart_course_override",
                    "advanced_params",
                    "promo_code_course",
                    "lock_payment_method",
                    "enrolment_info_capture_portfolio",
                    "enrolment_info_capture_template_p",
                    "enrolment_info_capture_template_w",
                    "custom_provider",
                    "requires_approval"
                ];
                for (var i = 0; i < toCheck.length; i++) {
                    var key = toCheck[i];
                    if (
                        key === "promo_code" &&
                        after_init_vars[key] != null &&
                        after_init_vars[key] !== ""
                    ) {
                        enrollerOptions[key] = after_init_vars[key];
                    } else if (after_init_vars[key] != null && after_init_vars[key] !== "") {
                        enrollerOptions[key] = after_init_vars[key];
                    }
                }

                var boolToCheck = [
                    "lock_promo_code",
                    "always_suppress_notifications",
                    "send_admin_notice_initial",
                    "enrolment_info_capture_enabled",
                    "auth_v2_bypassed",
                    "eway_surcharge",
                    "exclusive_cognito",
                    "request_signature",
                    "request_parent_signature",
                    "include_terms_in_note",
                    "show_enrol_details_alert"
                ];
                for (var i = 0; i < boolToCheck.length; i++) {
                    var key = boolToCheck[i];
                    if (after_init_vars[key] != null && after_init_vars[key] !== "") {
                        if (typeof after_init_vars[key] === "string") {
                            switch (after_init_vars[key].toLowerCase()) {
                                case "1":
                                case "true":
                                case "yes":
                                    enrollerOptions[key] = true;
                                    break;
                                default:
                                    enrollerOptions[key] = false;
                                    break;
                            }
                        } else if (typeof after_init_vars[key] === "boolean") {
                            enrollerOptions[key] = after_init_vars[key];
                        } else {
                            enrollerOptions[key] = after_init_vars[key];
                        }
                    }
                }

                if (extraOptions.allow_learners === undefined) {
                    enrollerOptions.login_roles[2] = {
                        is_agent: false,
                        is_payer: true,
                        is_student: true
                    };
                }
                /*
                 * Check to see if discounts were enabled and add the requisite function
                 * */

                //				/*
                //				 * Add Functions for Portfolio Uploading if present
                //				 * */
                //				$.each(enrollerOptions.enroller_steps, function(stepID, stepRecord){
                //
                //
                //				});

                enrollerOptions.epayment_begin = ENROLLER_FUNCTION_DEFAULTS.ePaymentInitiate;

                enrollerOptions.epayment_rules = ENROLLER_FUNCTION_DEFAULTS.ePaymentRules;
                enrollerOptions.epayment_rules_ds = ENROLLER_FUNCTION_DEFAULTS.ePaymentRules;
                enrollerOptions.epayment_rules_ez = ENROLLER_FUNCTION_DEFAULTS.ePaymentRulesEzyPay;
                enrollerOptions.epayment_fees_ez = ENROLLER_FUNCTION_DEFAULTS.ePaymentFeesEzypay;

                enrollerOptions.epayment_status = ENROLLER_FUNCTION_DEFAULTS.ePaymentStatus;
                enrollerOptions.epayment_next = ENROLLER_FUNCTION_DEFAULTS.ePaymentNextStep;

                enrollerOptions.check_for_enrolment_hash =
                    ENROLLER_FUNCTION_DEFAULTS.getHasEnrolmentHash;
                enrollerOptions.send_reminders_for_enrolment_hash =
                    ENROLLER_FUNCTION_DEFAULTS.sendRemindersForHashes;
                enrollerOptions.flag_others_redundant =
                    ENROLLER_FUNCTION_DEFAULTS.flagOthersAsRedundant;

                enrollerOptions.instance_extra_items = ENROLLER_FUNCTION_DEFAULTS.getInstanceItems;
                enrollerOptions.fetch_invoice = ENROLLER_FUNCTION_DEFAULTS.getInvoiceDetails;

                enrollerOptions.verify_usi = ENROLLER_FUNCTION_DEFAULTS.verifyUSI;

                enrollerOptions.check_for_user = ENROLLER_FUNCTION_DEFAULTS.checkForUser;

                enrollerOptions.payment_flow_form = ENROLLER_FUNCTION_DEFAULTS.getPaymentFlowForm;
                enrollerOptions.payment_plan_form = ENROLLER_FUNCTION_DEFAULTS.getPaymentPlanForm;
                enrollerOptions.begin_payment_flow = ENROLLER_FUNCTION_DEFAULTS.beginPaymentFlow;
                enrollerOptions.begin_ez_payment_flow = ENROLLER_FUNCTION_DEFAULTS.beginEZFlow;
                enrollerOptions.payment_flow_url = ENROLLER_FUNCTION_DEFAULTS.paymentFlowUrl;

                enrollerOptions.get_presigned_url = axPortfolioUploadUrl;
                enrollerOptions.upload_file = s3Upload;
                enrollerOptions.portfolio_link_file = linkPortfolioToFile;

                enrollerOptions.trigger_resume_link =
                    ENROLLER_FUNCTION_DEFAULTS.triggerEnrolmentResumption;

                if (after_init_vars.payment_flow != null) {
                    enrollerOptions.payment_flow = after_init_vars.payment_flow == 1;
                }

                /*
                 * Actually Create the Widget
                 * */
                if (
                    after_init_vars.contact_id != null ||
                    (after_init_vars.login_status && after_init_vars.login_status.logged_in)
                ) {
                    if (!$(".ui-loader:visible").length) {
                        $.mobile.loading("show", {
                            text: "Retrieving your User Details",
                            textVisible: true,
                            theme: "a",
                            textonly: false
                        });
                    }
                    if (!COGNITO) {
                        var cogLogoutHolder = $('<div id="cog_logout"></div>');
                        if ($("#cog_logout").length) {
                            $("#cog_logout").remove();
                        }
                        $(cogLogoutHolder).insertBefore($("#enroller"));
                        cogLogoutHolder.render_cognito_logout({
                            callLogout: function () {
                                cogLogoutHolder.hide();
                                $("#enroller").hide();
                                logout({}, function () {
                                    location.reload();
                                });
                            }
                        });
                    }

                    SKIP_CHECK = true;
                    $(".enroller-widget").addClass("ui-disabled");
                }
                if (after_init_vars.login_status && after_init_vars.login_status.account_choice) {
                    var cogLogoutHolder = $('<div id="cog_acct_choice"></div>');
                    if ($("#cog_acct_choice").length) {
                        $("#cog_acct_choice").remove();
                    }
                    $(cogLogoutHolder).insertBefore($("#enroller"));
                    cogLogoutHolder.render_account_choice({
                        accounts_list: after_init_vars.login_status.account_choice,
                        access_code: after_init_vars.login_status.access_code,
                        onSelect: function (selection) {
                            cogLogoutHolder.hide(100);
                            accountSelect(selection, function (response) {
                                after_init_vars.login_status = response;
                                cogLogoutHolder.remove();
                                createEnroller();
                            });
                        }
                    });
                    return;
                }

                function CognitoCreateEnroller() {
                    if (after_init_vars.login_status && after_init_vars.login_status.logged_in) {
                        $("#enroller").data("USER_AX_TOKEN", {
                            CONTACTID: after_init_vars.login_status.logged_in_contact,
                            AXTOKEN: after_init_vars.login_status.logged_in_token,
                            ROLETYPEID: after_init_vars.login_status.logged_in_role
                        });

                        if (
                            enrollerOptions.user_contact_id == 0 ||
                            enrollerOptions.user_contact_id == null
                        ) {
                            enrollerOptions.user_contact_id =
                                after_init_vars.login_status.logged_in_contact;
                        }
                        if (enrollerOptions.contact_id == 0 || enrollerOptions.contact_id == null) {
                            enrollerOptions.contact_id =
                                after_init_vars.login_status.logged_in_contact;
                        }
                        if (enrollerOptions.payer_id == 0 || enrollerOptions.payer_id == null) {
                            enrollerOptions.payer_id =
                                after_init_vars.login_status.logged_in_contact;
                        }
                    }
                    if (after_init_vars.item_list != null) {
                        $("#enroller").data("items_list", after_init_vars.item_list);
                    }

                    if (after_init_vars.enquiry_widget != null) {
                        $("#enroller").enquiry_widget(enrollerOptions);
                    } else {
                        $("#enroller").enroller(enrollerOptions);
                    }
                    if (after_init_vars.allow_public_inhouse != null) {
                        $("#enroller").data(
                            "allow_public_inhouse",
                            after_init_vars.allow_public_inhouse
                        );
                    }
                }

                // skip cognito if the enroller hash is populated!.
                if (
                    COGNITO &&
                    (enrollerOptions.enrolment_hash == null ||
                        enrollerOptions.enrolment_hash === "")
                ) {
                    var w = 600;
                    var h = 800;
                    var dualScreenLeft =
                        window.screenLeft != undefined ? window.screenLeft : window.screenX;
                    var dualScreenTop =
                        window.screenTop != undefined ? window.screenTop : window.screenY;

                    var width = window.innerWidth
                        ? window.innerWidth
                        : document.documentElement.clientWidth
                        ? document.documentElement.clientWidth
                        : screen.width;
                    var height = window.innerHeight
                        ? window.innerHeight
                        : document.documentElement.clientHeight
                        ? document.documentElement.clientHeight
                        : screen.height;
                    w = width < w ? width : w;
                    h = height < h ? height : h;
                    var left = width / 2 - w / 2 + dualScreenLeft;
                    var top = height / 2 - h / 2 + dualScreenTop;
                    var cognito_redir_url = after_init_vars.cognito_redir_url;

                    Cognito_CreateEnroller = CognitoCreateEnroller;
                    var ContinueButton = $('<button id="cognito">Enrol</button>');

                    ContinueButton.on("click", function () {
                        localStorage.cognito = null;

                        window.location =
                            cognito_redir_url + "?state_hash=" + after_init_vars.state_hash;
                        //TODO: -- replace popup
                        /*newWindow = window.open(cognito_redir_url, "", "width="+w+",height="+h+"top="+top+",left="+left+",menubar=no,location=no,resizable=no,scrollbars=no,status=no")
                        
                        $(newWindow).on('beforeunload', function(e){
                             // capture window close event.
                             console.log('window closed');
                        });*/
                    });

                    window.addEventListener("storage", function (e) {
                        if (e.key == "cognito") {
                            if (cognitoLoad && e.newValue != null && e.newValue !== "null") {
                                // this is probably redundant - as we can grab the session from localstorage already...
                                cognitoLoad(JSON.parse(e.newValue));
                            }
                        }
                    });

                    var signoutButton = $('<button id="cognito_out">Sign Out</button>');
                    signoutButton.on("click", function () {
                        newWindow = window.open(
                            cognito_redir_url + "?sign_out=1",
                            "",
                            "width=" +
                                w +
                                ",height=" +
                                h +
                                "top=" +
                                top +
                                ",left=" +
                                left +
                                ",menubar=no,location=no,resizable=no,scrollbars=no,status=no"
                        );
                        window.addEventListener("storage", function (e) {
                            var cognitoStorage =
                                "CognitoIdentityServiceProvider." + after_init_vars.cognito_client;

                            if (
                                e.key == cognitoStorage + ".LastAuthUser" &&
                                localStorage.cognito !== ""
                            ) {
                                this.setTimeout(function () {
                                    newWindow.close();
                                    logout({}, function () {
                                        location.reload();
                                    });
                                }, 1000);
                            }
                        });
                    });

                    var cognitoStorage =
                        "CognitoIdentityServiceProvider." + after_init_vars.cognito_client;
                    var authUser = localStorage[cognitoStorage + ".LastAuthUser"];
                    if (authUser !== "" && authUser != null) {
                        function parseJwt(token) {
                            var base64Url = token.split(".")[1];
                            var base64 = base64Url.replace("-", "+").replace("_", "/");
                            return JSON.parse(window.atob(base64));
                        }
                        var token = localStorage[cognitoStorage + "." + authUser + ".idToken"];

                        var authToken =
                            localStorage[cognitoStorage + "." + authUser + ".accessToken"];

                        if (token) {
                            var id = parseJwt(token);
                            if (id) {
                                signoutButton.append(": " + id.given_name + " " + id.family_name);
                            }
                        }

                        signoutButton.insertBefore($("#enroller"));
                        if (SKIP_CHECK) {
                            CognitoCreateEnroller();
                        } else {
                            cognitoAccessToken({ access_token: authToken }, function (response) {
                                after_init_vars.login_status = response;
                                if (response.logged_in) {
                                    if (response.session) {
                                        window.ax_session = response.session;
                                    }
                                    CognitoCreateEnroller();
                                } else {
                                    signoutButton.hide();
                                    if ($(".ui-loader:visible").length) {
                                        $.mobile.loading("hide");
                                    }
                                    ContinueButton.insertBefore($("#enroller"));
                                    ContinueButton.off().on("click", function () {
                                        localStorage.cognito = null;
                                        window.location =
                                            cognito_redir_url +
                                            "?state_hash=" +
                                            after_init_vars.state_hash;
                                        /* 
                                        newWindow = window.open(cognito_redir_url+"?sign_out=1&sign_in=1", "", "width="+w+",height="+h+"top="+top+",left="+left+",menubar=no,location=no,resizable=no,scrollbars=no,status=no")
                                        
                                        $(newWindow).on('beforeunload', function(e){
                                             // capture window close event.
                                             console.log('window closed');
                                        }); */
                                    });
                                }
                            });
                        }
                    } else {
                        ContinueButton.insertBefore($("#enroller"));
                    }
                } else {
                    CognitoCreateEnroller();
                }
            } finally {
                /*
                 * By default JQM will be the full height of the page - correct this issue
                 * */
                jQuery(".ui-page").css("min-height", "auto");

                /*
                 * Remove the extraneous classes from parent div
                 * */
                jQuery(".ui-mobile-viewport").removeClass("ui-mobile-viewport ui-overlay-a");
            }
        }
    }
});

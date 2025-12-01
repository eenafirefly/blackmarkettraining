jQuery(function ($) {
    var ua = window.navigator.userAgent;
    var isIE = /MSIE|Trident/.test(ua);

    if (isIE) {
        $("body").addClass("is-ie");
    }

    function PAGE_BUSY(text) {
        if (typeof ax_page != "undefined" && false) {
            ax_page.pageBusy();
            $(".enroller-widget").addClass("ui-disabled");
        } else {
            var textToDisplay = "Loading";
            if (text != null) {
                textToDisplay = text;
            }
            //TODO: JQM Replace
            if (!$(".ui-loader:visible").length) {
                $.mobile.loading("show", {
                    text: textToDisplay,
                    textVisible: true,
                    theme: "a",
                    textonly: false
                });
            }

            $(".enroller-widget").addClass("ui-disabled");
        }
    }

    function PAGE_READY() {
        if (typeof ax_page != "undefined" && false) {
            ax_page.pageReadyActive();
            $(".enroller-widget").removeClass("ui-disabled");
        } else {
            if (jQuery.active < 1) {
                //TODO: JQM Replace
                $.mobile.loading("hide");
                $(".enroller-widget").removeClass("ui-disabled");
                if (typeof ax_page != "undefined") {
                    ax_page.pageReadyActive();
                }
            } else {
                $(document).one("ajaxStop", function () {
                    PAGE_READY();
                });
            }
        }
    }

    $.axWidget("axcelerate.enrol_base", {
        /***** SHARED FUNCTIONS *****/

        /* CONTACT CREATE */
        options: {
            /* UI */

            stylesheet: "enroller.css",
            stylesheet_override: null,

            selects_as_chosens: true,
            required_complete_check: true,

            /* Steps */
            enroller_steps: null,
            step_order: null,

            /* Configuration Settings */
            must_complete_required: true,
            user_contact_create: false,
            disable_on_complete: true,
            invoice_on_tentative: false,
            login_or_create: false,
            contact_create_only: false,
            environment: null,

            /* General Variables */
            contact_id: 0,
            payer_id: 0,
            course: null,
            invoice_id: 0,
            cost: null,

            /* Agent Variables */
            agent_id: 0,
            agent_commission: 0,
            get_agent_detail: null,

            /* Multiple Course Support */
            multiple_courses: null,
            agent_multiple: false,
            group_booking: false,
            payment_only: null,

            /* Contact Functions */
            get_contact: null,
            update_contact: null,
            add_contact: null,
            search_contacts: null,

            /* User Functions */
            user_login: null,
            create_user: null,
            user_reset: null,
            get_client_organisation: null,

            /* User Variables */
            login_roles: null,
            user_contact_id: 0,

            /* Course Functions */
            get_course_detail: null,
            search_courses: null,
            course_enquire: null,
            course_enrol: null,

            /* Enrolment Config */
            enrolment_repsonse_text:
                "Enrolment was successfully completed. A confirmation will be sent to the student along with an invoice / receipt, if generated.",
            enquiry_on_tentative: true,
            legacy_enrolment_mode: false,
            surcharge_on: null,
            allow_mixed_inhouse_public: false,

            /* Enquiry Config */
            enquiry_response_text: "Your Enquiry was successfully submitted.",
            enquiry_requires_course: false,

            /* Contact Note Functions */

            contact_note: null,

            /* Contact Note Config */

            note_response_text: "Your data was successfully submitted.",

            /* Course Search Settings */
            add_course_selector: true,
            user_course_search: false,
            advanced_course_seach: false,
            training_category: null,
            location_filter: false,
            client_course_filter: false,

            /* Portfolio Functions */
            add_update_portfolio: null,
            upload_portfolio: null,
            get_portfolio_file: null,
            get_portfolio_checklist: null,
            get_portfolio_contact: null,

            /* Discounts Functions */
            get_discounts: null,
            calculate_discount: null,

            /* Discount Variables */
            discounts_selected: null,
            original_cost: null,

            round_to_dollar: false,
            allow_free_bookings: false,

            force_left: false,
            terminology_student: "Student",
            enrol_invoice_check: null,

            store_enrol_data: null,
            enrolment_complete: null,
            enrolment_hash: null,

            required_complete_text: "Mandatory Fields Complete",

            user_ip: null,
            /*WP-157*/

            post_enrolment_widget: false,
            post_enrol_hash: null,
            request_signature: false,
            request_parent_signature: false,
            include_terms_in_note: true,

            /***** Internal Settings Only *****/
            cost_terminology: "Fee",
            course_terminology: "Course",
            instance_terminology: "Course Instance",

            /***** Select Placeholders *****/
            use_display_select_placeholder: true,

            allow_inhouse_enrolment: false,
            let_babies_enrol: false,

            ignore_invisible_fields: false
        },

        /*
         * Constants
         * */

        /*
         * User Roles IDs
         * */
        ADMIN_ID: 1,
        TRAINER_ID: 3,
        LEARNER_ID: 2,
        CLIENT_ID: 4,
        AGENT_ID: 5,
        show: function () {
            enroller.element.css("display", "");
        },
        hide: function () {
            enroller.element.hide();
        },
        _create: function () {
            /*declare enroller as global var, fixes code folding for some reason*/
            enroller = this;
            enroller.element.hide();

            enroller._registerResize();

            enroller._registerEnrolmentEvents();
            /*set stylesheet*/
            if (
                enroller.options.stylesheet != null &&
                enroller.options.stylesheet_override == null
            ) {
                var stylesheetAlreadyPresent = false;
                $.each(document.styleSheets, function (i, css) {
                    if (css.href != null) {
                        if (css.href.indexOf(enroller.options.stylesheet) != -1) {
                            stylesheetAlreadyPresent = true;
                        }
                    }
                });
                if (!stylesheetAlreadyPresent) {
                    var jsFileLocation = $("script[src*=enrol-widget]").attr("src");
                    var index = jsFileLocation.indexOf("enrol-widget-base.js");
                    var cssLocation = jsFileLocation.slice(0, index);
                    cssLocation = cssLocation + "css/" + enroller.options.stylesheet;
                    $("<link>")
                        .appendTo("head")
                        .attr({
                            type: "text/css",
                            rel: "stylesheet",
                            href: cssLocation + "?v=" + new Date().getTime()
                        });
                } else {
                    enroller.show();
                    enroller.element.data("loaded", true);
                    $(window).trigger("resize");
                }
            } else if (enroller.options.stylesheet_override != null) {
                $("<link>")
                    .appendTo("head")
                    .attr({
                        type: "text/css",
                        rel: "stylesheet",
                        href: enroller.options.stylesheet_override + "?v=" + new Date().getTime()
                    });
            }
            var ti = setInterval(function () {
                $.each(document.styleSheets, function (i, css) {
                    if (css.href != null) {
                        if (enroller.options.stylesheet_override != null) {
                            if (css.href.indexOf(enroller.options.stylesheet_override) != -1) {
                                enroller.show();
                                enroller.element.data("loaded", true);
                                $(window).trigger("resize");
                                clearInterval(ti);
                            }
                        } else {
                            if (css.href.indexOf(enroller.options.stylesheet) != -1) {
                                enroller.show();
                                enroller.element.data("loaded", true);
                                $(window).trigger("resize");
                                clearInterval(ti);
                            }
                        }
                    }
                });
                if (ti > 1000) {
                    enroller.show();
                    enroller.element.data("loaded", true);
                    $(window).trigger("resize");
                    console.log("Could Not identify StyleSheet");
                }
            }, 10);

            enroller.element.addClass("enroller-widget");
            /*cannot use these in defaults as it will not update for arrays*/

            /*Add all the steps and build the widget*/
            enroller._refreshEnrolmentWizard();
            enroller._dateFixDatepickers();
            $(document)
                .ajaxStart(function () {
                    if (PAGE_BUSY() != null) {
                        PAGE_BUSY();
                    }
                })
                .ajaxStop(function () {
                    if (PAGE_READY() != null) {
                        PAGE_READY();
                    }
                    enroller._dateFixDatepickers();

                    if (enroller._loadSignatureFields != null) {
                        enroller._loadSignatureFields();
                    }
                });

            enroller.element.on("page_ready", function (e) {
                if (PAGE_READY() != null) {
                    PAGE_READY();
                }
                enroller._dateFixDatepickers();
            });

            enroller.element.on("page_busy", function (e, payload) {
                if (payload != null) {
                    if (PAGE_BUSY() != null) {
                        PAGE_BUSY(payload);
                    }
                } else {
                    if (PAGE_BUSY() != null) {
                        PAGE_BUSY();
                    }
                }
            });

            $(document).on("change", "select", function (e) {
                $("abbr.search-choice-close").addClass(
                    "ui-btn-icon-right ui-alt-icon ui-nodisc-icon ui-icon-delete ui-btn-icon-notext"
                );
                $("abbr.search-choice-close").css("background-image", "none");
            });
            $(document).on("chosen:updated", function (e) {
                $("abbr.search-choice-close").addClass(
                    "ui-btn-icon-right ui-alt-icon ui-nodisc-icon ui-icon-delete ui-btn-icon-notext"
                );
                $("abbr.search-choice-close")
                    .css("background-image", "none")
                    .css("background", "none");
            });

            /* Switch icons on chosen buttons on the hide/show triggers */
            $(document).on("chosen:hiding_dropdown", function (e) {
                var element = $(e.target);
                element
                    .closest("div")
                    .find("a.chosen-single")
                    .removeClass("ui-alt-icon ui-nodisc-icon ui-icon-carat-u")
                    .addClass("ui-alt-icon ui-nodisc-icon ui-icon-carat-d");
            });
            $(document).on("chosen:showing_dropdown", function (e) {
                var element = $(e.target);
                element
                    .closest("div")
                    .find("a.chosen-single")
                    .removeClass("ui-alt-icon ui-nodisc-icon ui-icon-carat-d")
                    .addClass("ui-alt-icon ui-nodisc-icon ui-icon-carat-u");
            });
        },
        _refreshEnrolmentWizard: function () {},

        _registerResize: function () {
            $(window).on("resize", function () {
                var width = enroller.element.outerWidth();
                if (enroller.element.data("loaded") == true && enroller.element.is(":visible")) {
                    if (width > 920) {
                        enroller.element.removeClass(
                            "outer-920 outer-800 outer-720 outer-600 outer-450 outer-400"
                        );
                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup").removeClass(
                                "outer-920 outer-800 outer-720 outer-600 outer-450 outer-400"
                            );
                        }
                    } else if (width <= 920 && width > 800) {
                        enroller.element.removeClass(
                            "outer-800 outer-720 outer-600 outer-450 outer-400"
                        );
                        enroller.element.addClass("outer-920");

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup")
                                .removeClass("outer-800 outer-720 outer-600 outer-450 outer-400")
                                .addClass("outer-920");
                        }
                    } else if (width <= 800 && width > 720) {
                        enroller.element.removeClass("outer-720 outer-600 outer-450 outer-400");
                        enroller.element.addClass("outer-800 outer-920");

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup")
                                .removeClass("outer-720 outer-600 outer-450 outer-400")
                                .addClass("outer-800 outer-920");
                        }
                    } else if (width <= 720 && width > 600) {
                        enroller.element.removeClass("outer-600 outer-450 outer-400");
                        enroller.element.addClass("outer-720 outer-920 outer-800");

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup")
                                .removeClass("outer-600 outer-450 outer-400")
                                .addClass("outer-720 outer-920 outer-800");
                        }
                    } else if (width <= 600 && width > 450) {
                        enroller.element.removeClass("outer-450 outer-400");
                        enroller.element.addClass("outer-600 outer-720 outer-920 outer-800");

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup")
                                .removeClass("outer-450 outer-400")
                                .addClass("outer-600 outer-720 outer-920 outer-800");
                        }
                    } else if (width <= 450 && width > 400) {
                        enroller.element.removeClass("outer-400");
                        enroller.element.addClass(
                            "outer-450 outer-600 outer-720 outer-920 outer-800"
                        );

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup")
                                .removeClass("outer-400")
                                .addClass("outer-450 outer-600 outer-720 outer-920 outer-800");
                        }
                    } else if (width <= 400) {
                        enroller.element.addClass(
                            "outer-400 outer-450 outer-600 outer-720 outer-920 outer-800"
                        );

                        if ($(".enroller-widget-popup").length) {
                            $(".enroller-widget-popup").addClass(
                                "outer-400 outer-450 outer-600 outer-720 outer-920 outer-800"
                            );
                        }
                    }

                    /*In the case of the courses step, to fix bad config scaling, add checks to determine if the size is appropreate*/
                    if (enroller.options.step_layout == "left") {
                        enroller.element.addClass("enroller-layout-left");
                        var stepMenuWidth = enroller.element
                            .find("#enroller_step_menu")
                            .outerWidth();
                        var remaining = width - stepMenuWidth;
                        if (enroller.element.find("#courseDataTableHolder").length) {
                            enroller._courseSearchScale(remaining, 4);
                        }
                    } else {
                        enroller.element.find(".enroller-step").css({
                            "max-width": "inherit"
                        });
                    }
                }
            });
        },

        /**
         * Recursive helper to set visibility of course columns, in case configuration is heavy on fields for the size.
         */
        _courseSearchScale: function (allowedSpace, priority) {
            if (priority >= 1) {
                var courseTableWidth = enroller.element.find("#courseDataTableHolder").outerWidth();
                if (courseTableWidth > allowedSpace) {
                    var style = $(
                        "<style>@media (max-width:" +
                            $(window).outerWidth() +
                            "px){div.enroller-layout-left div#courseDataTableHolder .priority-" +
                            priority +
                            "{display:none;}}</style>"
                    );
                    $("html > head").append(style);
                    enroller._courseSearchScale(allowedSpace, priority - 1);
                }
            }
        },
        _setOption: function (key, value) {
            this._super(key, value);
        },
        /*
         * Widget Creation, Init and Refresh/Destroy functions.
         * */

        _registerEnrolmentEvents: function () {
            enroller.element.on("enroller:enrolment_status_update", function (event, payload) {
                payload.page_url = window.location.href;
                if (
                    enroller.options.enroller_steps.billing == null ||
                    enroller.options.enroller_steps.review == null
                ) {
                    payload.is_enquiry = 1;
                }
                if (enroller.options.store_enrol_data != null) {
                    if (enroller.options.enrolment_hash != null) {
                        payload.enrolment_hash = enroller.options.enrolment_hash;
                    }
                    enroller.options.store_enrol_data(payload, function (enrolment_hash) {
                        enroller.options.enrolment_hash = enrolment_hash;
                    });
                }
            });

            enroller.element.on("enroller:enrolment_complete", function (event, payload) {
                if (payload == null) {
                    payload = {};
                }
                if (enroller.options.enrolment_complete != null) {
                    if (enroller.options.enrolment_hash != null) {
                        payload.enrolment_hash = enroller.options.enrolment_hash;
                    }
                    enroller.options.enrolment_complete(payload);
                }
            });

            /*When The user contact id is set, check if a course has already been selected*/
            enroller.element.on("enroller:user_contact_set", function (event, payload) {
                /*only action this if there is no existing hash*/
                if (enroller.options.enrolment_hash == null) {
                    /*if an instance is selected, fire off the status update*/
                    if (enroller.options.course.INSTANCEID != 0) {
                        enroller.element.trigger("enroller:enrolment_status_update", {
                            user_contact_id: enroller.options.user_contact_id,
                            payer_id: enroller.options.payer_id,
                            course: enroller.options.course
                        });
                    } else if (
                        enroller.options.enroller_steps.billing == null ||
                        enroller.options.enroller_steps.review == null
                    ) {
                        if (
                            enroller.options.course.ID != 0 &&
                            enroller.options.user_contact_id != 0
                        ) {
                            enroller.element.trigger("enroller:enrolment_status_update", {
                                user_contact_id: enroller.options.user_contact_id,
                                payer_id: enroller.options.payer_id,
                                course: enroller.options.course,
                                is_enquiry: true
                            });
                        }
                    }
                }
            });
        },

        destroy: function () {
            this.remove();
        },

        _update_contact: function (contactID, contactParams, callback) {
            if (enroller.options.update_contact != null) {
                enroller.options.update_contact(contactID, contactParams, callback);
            }
        },

        /***** Shared UI Components. SearchTag: ui_components *****/

        _createBlurb: function (blurb) {
            if (blurb == "") {
                return $("<div/>");
            }
            var blurbHolder = $(
                '<div class="enroller-blurb-holder ui-btn ui-btn-icon-left ui-icon-info"></div>'
            );
            blurbHolder.append(blurb);
            return blurbHolder;
        },
        _createTerms: function (terms, checkCallback) {
            var termsHolder = enroller
                ._createInformationField("Terms", terms)
                .addClass("enroller-terms-holder");
            termsHolder
                .find("div.enroller-field-label")
                .text("")
                .css("background", "transparent")
                .css("border", "none");
            var termsID = new Date().getMilliseconds() + "_terms";
            var termsInput = enroller._createInputField(termsID, {
                INFO_ONLY: true,
                TYPE: "flip-switch",
                DISPLAY: "Terms",
                FS_OFFTEXT: "Do you agree?",
                FS_ONTEXT: "I Agree"
            });
            termsInput
                .find("div.enroller-field-label")
                .text("")
                .css("background", "transparent")
                .css("border", "none");
            termsInput.addClass("terms-flip");

            termsInput.find("input").on("change", function (e) {
                var canEnable = true;
                if (checkCallback != null) {
                    canEnable = checkCallback();
                }
                var element = $(this);

                var step = element.closest("div.enroller-step");
                if (element.prop("checked")) {
                    if (canEnable) {
                        step.find(".enroller-save-button")
                            .removeClass("ui-disabled")
                            .prop("disabled", false);
                    }

                    step.data("terms_completed", true);
                } else {
                    step.find(".enroller-save-button")
                        .addClass("ui-disabled")
                        .prop("disabled", true);
                    step.data("terms_completed", false);
                }
            });

            return [termsHolder, termsInput];
        },

        _displayError: function (fieldID, message) {
            var field = null;
            if (fieldID.indexOf(".") > -1) {
                field = $(fieldID);
            } else {
                field = $("#" + fieldID);
            }
            var fieldHolder = field.closest(".enroller-field-holder");

            if (fieldHolder.find(".enroller-error-message").length) {
                fieldHolder.find(".enroller-error-message").remove();
            }

            message = enroller._messageReWrite(message);
            var messageHolder = $("<div></div>").append(message).addClass("enroller-error-message");
            fieldHolder.append(messageHolder);
        },

        /**
         * Check the validity of a field against a specified regex pattern.
         * Do in a try block to catch any invalid regex.
         */
        _regexIsValid: function (pattern, value) {
            try {
                var regex = new RegExp(pattern);
                return regex.test(value);
            } catch (error) {
                console.log("Bad Pattern: " + pattern);
                return true;
            }
        },

        /*process and display input fields*/
        _createInputField: function (key, field, index) {
            /*break out of logic for info fields*/
            if (
                field.TYPE == "information" ||
                field.TYPE == "divider" ||
                field.TYPE == "info_expandable"
            ) {
                return enroller._createInfoFieldDetailed(key, field);
            }
            var skipAppend = false;

            /* Event Listeners*/

            if (field.EVENTS != null) {
                enroller._registerEventListener(key, field);
            }
            if (field.TRIGGER_EVENTS != null) {
                enroller._registerEventTrigger(key, field);
            }

            var fieldHolder = $('<div class="enroller-field-holder" />');
            var displayName = $(
                '<div class="ui-btn enroller-field-label">' + field.DISPLAY + ":</div>"
            );

            fieldHolder.append(displayName);
            var inputField = $(
                '<input class="enroller-field-input" data-wrapper-class=" ui-btn" />'
            );
            if (field.AUTOCOMPLETE) {
                inputField.attr("autocomplete", field.AUTOCOMPLETE);
            }
            if (field.TYPE == "text-area") {
                inputField = $(
                    '<textarea class="enroller-field-input" data-wrapper-class=" ui-btn" />'
                );
            } else if (field.TYPE == "button") {
                inputField = $('<a class="enroller-field-input ui-btn-active ui-btn" />');
                if (field.DISPLAY != null) {
                    inputField.append(field.DISPLAY);
                }
                displayName.css("opacity", 0);
            }
            if (index != null) {
                inputField.attr("tabindex", index);
            }

            if (field.REQUIRED != null) {
                if (field.REQUIRED) {
                    displayName.addClass(
                        "ui-nodisc-icon ui-icon-required ui-btn-icon-right required-field"
                    );
                    displayName.attr("title", field.DISPLAY + " is required.");
                    inputField.attr("required", field.REQUIRED);
                }
            }

            if (field.PATTERN != null) {
                inputField.attr("pattern", field.PATTERN);
                if (field.TITLE != null) {
                    inputField.attr("title", field.TITLE);
                } else {
                    inputField.attr("title", field.DISPLAY + " is required.");
                }
            }
            if (field.MAXLENGTH != null) {
                inputField.attr("maxlength", field.MAXLENGTH);
            }
            // TODO: Make this a switch
            if (
                field.TYPE == "text" ||
                field.TYPE == "email" ||
                field.TYPE == "password" ||
                field.TYPE == "text-area" ||
                field.TYPE == "button"
            ) {
                inputField.attr("type", field.TYPE);
                inputField.attr("id", key);
                inputField.attr("name", key);

                if (field.TYPE == "email") {
                    inputField.on("input", function (e) {
                        var emailDat = inputField.val();
                        if (emailDat != "") {
                            if (!enroller._isEmail(emailDat)) {
                                enroller._displayError(key, "Email is not of a valid format.");
                            } else {
                                var fieldHoldObj = $(inputField).closest(".enroller-field-holder");
                                if (fieldHoldObj.find(".enroller-error-message").length) {
                                    fieldHoldObj.find(".enroller-error-message").remove();
                                }
                            }
                        }
                    });
                } else if (field.PATTERN != null && field.PATTERN != "") {
                    inputField.on("input", function (e) {
                        var dat = inputField.val();
                        if (dat != null && dat != "") {
                            if (!enroller._regexIsValid(field.PATTERN, dat)) {
                                enroller._displayError(key, field.TITLE);
                            } else {
                                var fieldHoldObj = $(inputField).closest(".enroller-field-holder");
                                if (fieldHoldObj.find(".enroller-error-message").length) {
                                    fieldHoldObj.find(".enroller-error-message").remove();
                                }
                            }
                        }
                    });
                }
            } else if (field.TYPE == "date") {
                inputField.attr("type", "text");

                inputField.addClass("enroller-date-field");
                inputField.attr("id", key);

                // WP-209 add simple validation to DOB field
                if (key == "DOB" || key == "usi_DOB" || key == "create_DOB") {
                    inputField.on("change", function (e) {
                        var currentValue = enroller._getInputValue(key, field);

                        var selDate = new Date(currentValue);
                        var curDate = new Date();

                        if (selDate - curDate >= 0) {
                            enroller.element.find(".enroller-error-message").remove();
                            enroller._displayError(key, "Date of Birth cannot be a future date");

                            $(inputField).val("");
                        } else if (
                            selDate - curDate >= -126125714989 &&
                            enroller.options.let_babies_enrol !== true
                        ) {
                            enroller._displayError(
                                key,
                                "Date of Birth cannot be within the last 4 years."
                            );
                            $(inputField).val("");
                        } else {
                            var fieldHoldObj = $(inputField).closest(".enroller-field-holder");

                            if (fieldHoldObj.find(".enroller-error-message").length) {
                                fieldHoldObj.find(".enroller-error-message").remove();
                            }
                        }
                    });
                }
            } else if (field.TYPE == "select") {
                if (enroller.options.selects_as_chosens) {
                    inputField = $(
                        '<select data-native-menu="false" data-role="none" class="enroller-field-input enroller-select-chosen" />'
                    );

                    inputField.attr({
                        "data-enhance": false,
                        "data-role": "none"
                    });
                    inputField.attr({ name: key });
                    fieldHolder.addClass("enroller-field-hasdropdown");
                    if (enroller.options.use_display_select_placeholder) {
                        inputField.attr("data-placeholder", field.DISPLAY);
                    }

                    inputField.append('<option value=""></option>');
                } else {
                    inputField = $(
                        '<select data-native-menu="false" class="enroller-field-input" />'
                    );
                    inputField.append('<option value="">' + field.DISPLAY + "</option>");
                }

                $.each(field.VALUES, function (i, option) {
                    var optionRow = $(
                        '<option value="' + option.VALUE + '">' + option.DISPLAY + "</option>"
                    );
                    inputField.append(optionRow);
                });
                if (field.REQUIRED != null) {
                    if (field.REQUIRED) {
                        displayName.addClass(
                            "ui-nodisc-icon ui-icon-required ui-btn-icon-right required-field"
                        );
                        displayName.attr("title", field.DISPLAY + " is required.");
                        inputField.attr("required", field.REQUIRED);
                    }
                }

                inputField.attr("id", key);
                fieldHolder.append($("<div></div>").addClass("select-wrap").append(inputField));
                skipAppend = true;
            } else if (field.TYPE == "multi-select") {
                inputField = $('<select data-native-menu="false"  class="enroller-field-input" />');
                if (enroller.options.use_display_select_placeholder) {
                    inputField.attr("data-placeholder", "Select " + field.DISPLAY);
                }
                $.each(field.VALUES, function (i, option) {
                    var optionRow = $(
                        '<option value="' + option.VALUE + '">' + option.DISPLAY + "</option>"
                    );
                    inputField.append(optionRow);
                });

                inputField.addClass("enroller-select-multi");
                inputField.attr({
                    multiple: "multiple",
                    "data-enhance": false,
                    "data-role": "none"
                });
                fieldHolder.addClass("enroller-field-hasdropdown");
                if (field.REQUIRED != null) {
                    if (field.REQUIRED) {
                        displayName.addClass(
                            "ui-nodisc-icon ui-icon-required ui-btn-icon-right required-field"
                        );
                        displayName.attr("title", field.DISPLAY + " is required.");
                        inputField.attr("required", field.REQUIRED);
                    }
                }

                inputField.attr("id", key);
                fieldHolder.append($("<div></div>").addClass("select-wrap").append(inputField));
                skipAppend = true;
                if (field.MAX_SELECTED) {
                    inputField.addClass("multi-max");
                    inputField.data("max", field.MAX_SELECTED);
                }
                if (key === "COMMENCINGPROGRAMCOHORTIDENTIFIERS") {
                    inputField.on("change", function (e) {
                        let values = inputField.val();

                        if (values.includes("NNNNNN") && values.length !== 1) {
                            enroller._updateInputValue(inputField, "NNNNNN");
                            enroller._displayError(
                                "COMMENCINGPROGRAMCOHORTIDENTIFIERS",
                                "No specific cohort is not compatible with other options"
                            );
                        } else if (!values.includes("NNNNNN")) {
                            if (fieldHolder.find(".enroller-error-message").length) {
                                fieldHolder.find(".enroller-error-message").remove();
                            }
                        }
                    });
                }
            } else if (field.TYPE == "search-select" || field.TYPE == "search-select-add") {
                inputField = $(
                    '<select data-native-menu="false" class="enroller-field-input enroller-select-chosen"/>'
                );
                if (enroller.options.use_display_select_placeholder) {
                    inputField.attr("data-placeholder", field.DISPLAY);
                }
                inputField.append('<option value=""></option>');
                if (field.VALUES != null) {
                    if (field.VALUES.length > 0) {
                        $.each(field.VALUES, function (i, option) {
                            var optionRow = $(
                                '<option value="' +
                                    option.VALUE +
                                    '">' +
                                    option.DISPLAY +
                                    "</option>"
                            );
                            inputField.append(optionRow);
                        });
                    }
                }

                inputField.addClass("enroller-select-multi");
                inputField.attr({
                    "data-enhance": false,
                    "data-role": "none"
                });
                if (field.TYPE == "search-select-add") {
                    if (field.ADD_TYPE != null) {
                        inputField.data("add_type", field.ADD_TYPE);
                    }
                    fieldHolder.addClass("enroller-search-add");
                }
                fieldHolder.addClass("enroller-field-hasdropdown");
                if (field.REQUIRED != null) {
                    if (field.REQUIRED) {
                        displayName.addClass(
                            "ui-nodisc-icon ui-icon-required ui-btn-icon-right required-field"
                        );
                        displayName.attr("title", field.DISPLAY + " is required.");
                        inputField.attr("required", field.REQUIRED);
                    }
                }
                inputField.attr("id", key);
                fieldHolder.append($("<div></div>").addClass("select-wrap").append(inputField));
                skipAppend = true;
            } else if (field.TYPE == "checkbox") {
                if (field.VALUES !== undefined) {
                    var innerFieldHolder = $('<div class="enroller-checkbox-holder" />');
                    $.each(field.VALUES, function (i, box) {
                        inputField = $('<input type="checkbox" />');
                        var cleanValue = (box.VALUE + "").replace(/ /g, "_");
                        inputField.attr("id", key + "_" + cleanValue);
                        inputField.addClass(key + "-checkbox enroller-field-input");
                        var inputLabel = $("<label>" + box.DISPLAY + "</label>");
                        inputLabel
                            .attr("for", key + "_" + cleanValue)
                            .addClass("enrol-checkbox-label ui-btn");
                        inputField.data("field-type", "checkbox");

                        innerFieldHolder.append(inputLabel.append(inputField));
                    });

                    fieldHolder.append(innerFieldHolder);
                    fieldHolder.addClass("enroller-checkboxes");

                    if (field.TOOLTIP != null) {
                        var tipButton = $(
                            '<a class="ui-icon-info ui-nodisc-icon enroller-tooltip ui-btn-icon-notext ui-btn">Info</a>'
                        ).css({
                            display: "inline-block"
                        });

                        tipButton.on("click", function (event) {
                            if (field.TYPE == "select") {
                                enroller._toolTip(
                                    inputField.closest("div").find(".chosen-container"),
                                    field.TOOLTIP,
                                    true
                                );
                            } else {
                                enroller._toolTip(inputField, field.TOOLTIP, true);
                            }
                        });
                        fieldHolder.append(tipButton);
                    }

                    fieldHolder.addClass(key);

                    if (field.HIDE_INITIALLY == "hidden") {
                        fieldHolder.css("display", "none");
                    }
                    if (index != null) {
                        innerFieldHolder.attr("tabindex", index);
                    }
                    return fieldHolder;
                }
            } else if (field.TYPE == "modifier-checkbox") {
                if (field.VALUES !== undefined) {
                    var innerFieldHolder = $('<div class="enroller-modifier-holder" />');
                    $.each(field.VALUES, function (i, box) {
                        var inputHolder = $('<div class="modifier-checkbox"/>');
                        inputField = $('<input type="checkbox" />');
                        inputField.attr("id", key + "_" + box.VALUE);
                        inputField.addClass(key + "-checkbox enroller-field-input");
                        inputField.data("field-type", "checkbox");
                        var inputLabel = $("<label>" + box.DISPLAY + "</label>").addClass(
                            "enrol-checkbox-label ui-btn"
                        );
                        inputLabel.attr("for", key + "_" + box.VALUE);
                        inputHolder.append(inputLabel.append(inputField));

                        var modifierField = $(
                            '<select data-native-menu="false" class="enroller-field-input" />'
                        );
                        modifierField.addClass(key + "-modifier");
                        if (enroller.options.selects_as_chosens) {
                            modifierField.attr("data-role", "none");
                            modifierField.attr("data-enhance", "none");
                            modifierField.addClass("enroller-select-chosen");
                        }
                        modifierField.attr("id", key + "_" + box.VALUE + "_modifier");
                        $.each(field.MODIFIERS, function (i, option) {
                            var optionRow = $(
                                '<option value="' +
                                    option.VALUE +
                                    '">' +
                                    option.DISPLAY +
                                    "</option>"
                            );
                            optionRow.attr("id", key + "_" + box.VALUE + option.VALUE);
                            optionRow.data("field-type", "modifier");
                            optionRow.data("checkbox-id", key + "_" + box.VALUE);
                            modifierField.append(optionRow);
                        });
                        inputHolder.append(modifierField);
                        modifierField.data("field-type", "modifier-select");

                        innerFieldHolder.append(inputHolder);
                    });
                    fieldHolder.append(innerFieldHolder);
                    fieldHolder.attr("data-type", "vertical");

                    if (field.TOOLTIP != null) {
                        var tipButton = $(
                            '<a class="ui-icon-info ui-nodisc-icon enroller-tooltip ui-btn-icon-notext ui-btn">Info</a>'
                        ).css({
                            display: "inline-block"
                        });

                        tipButton.on("click", function (event) {
                            enroller._toolTip(tipButton, field.TOOLTIP, true);
                        });
                        innerFieldHolder.prepend(tipButton);
                        fieldHolder.addClass("has-tooltip");
                    }
                    fieldHolder.addClass(key);
                    if (field.HIDE_INITIALLY == "hidden") {
                        fieldHolder.css("display", "none");
                    }

                    if (index != null) {
                        innerFieldHolder.attr("tabindex", index);
                    }
                    return fieldHolder;
                }
            } else if (field.TYPE == "flip-switch") {
                var inputField = $(
                    '<input type="checkbox" class="enroller-field-input" data-role="flipswitch" data-wrapper-class="enroller-terms-flip">'
                );
                if (field.FS_ONTEXT != null && field.FS_ONTEXT != "") {
                    inputField.attr("data-on-text", field.FS_ONTEXT);
                } else {
                    inputField.attr("data-on-text", "Yes");
                }
                if (field.FS_OFFTEXT != null && field.FS_OFFTEXT != "") {
                    inputField.attr("data-off-text", field.FS_OFFTEXT);
                } else {
                    inputField.attr("data-off-text", "No");
                }

                inputField.on("change", function (e) {
                    var element = $(this);
                    var link = element.closest(".terms-flip").find("a");
                    if (element.prop("checked")) {
                        link.addClass("ui-btn-icon-right ui-icon-check");
                    } else {
                        link.removeClass("ui-btn-icon-right ui-icon-check");
                    }
                });

                inputField.attr("tabindex", index);
                inputField.attr("id", key);
                inputField.addClass("ax-flip-switch");
            } else if (field.TYPE == "signature") {
                inputField = $("<div ></div>")
                    .addClass(
                        "enroller-field-signature enroller-field-input ui-input-text ui-body-inherit ui-corner-all ui-btn ui-shadow-inset"
                    )
                    .css({ height: "100px", display: "block" });
                inputField.attr("id", key);
                var sigControls = $(
                    '<div class="enroller-signature-controls ui-alt-icon"  style="display:inline-block;" />'
                );
                var undo = $(
                    '<a class="signature-undo-last ui-nodisc-icon ui-icon-back ui-btn-icon-notext ui-btn" style="clear:left" >Undo</a>'
                );
                var clear = $(
                    '<a class="signature-clear-all ui-nodisc-icon ui-icon-delete ui-btn-icon-notext ui-btn" style="clear:left">Clear</a>'
                );
                sigControls.append(undo);
                sigControls.append(clear);
                fieldHolder.append(inputField);
                fieldHolder.append(sigControls);
            }
            /*signatures already append the input field*/
            if (field.TYPE != "signature" && !skipAppend) {
                fieldHolder.append(inputField);
            } else if (fieldHolder.find(".select-wrap")) {
                fieldHolder.find("select").data("field-type", field.TYPE);
            }

            if (enroller.options.selects_as_chosens) {
                if (field.TYPE == "select") {
                    inputField.attr("data-role", "none");
                    inputField.attr("data-enhance", "none");
                    inputField.addClass("enroller-select-multi");
                }
            }
            inputField.data("field-type", field.TYPE);

            if (field.TOOLTIP != null) {
                var tipButton = $(
                    '<a class="ui-icon-info ui-nodisc-icon enroller-tooltip ui-btn-icon-notext ui-btn">Info</a>'
                ).css({
                    display: "inline-block"
                });

                tipButton.on("click", function (event) {
                    if (
                        field.TYPE == "select" ||
                        field.TYPE == "search-select" ||
                        field.TYPE == "search-select-add" ||
                        field.TYPE == "multi-select"
                    ) {
                        enroller._toolTip(
                            inputField.closest("div").find(".chosen-container"),
                            field.TOOLTIP,
                            true
                        );
                        inputField.closest("div").find(".chosen-container").addClass("has-tip");
                    } else {
                        enroller._toolTip(inputField, field.TOOLTIP, true);
                    }
                });
                fieldHolder.append(tipButton);
            }
            if (field.HIDE_INITIALLY == "hidden") {
                fieldHolder.css("display", "none");
            }

            if (index != null) {
                inputField.data("tabindex", index);
            }

            return fieldHolder;
        },

        /**
         * WP-146 - Information blocks
         */
        _createInfoFieldDetailed: function (key, field) {
            var holder = $("<div>");
            if (field.TYPE == "information") {
                holder.addClass("enroller-info-field-detailed");
                holder.append(field.DISPLAY);
            } else if (field.TYPE == "divider") {
                holder.addClass("enroller-divider-field");
                if (field.DISPLAY != null && field.DISPLAY != "") {
                    holder.append(field.DISPLAY);
                }
            } else if (field.TYPE == "header") {
                holder.addClass("enroller-info-field-detailed");
                holder.append(field.DISPLAY);
            } else if (field.TYPE === "info_expandable") {
                var fieldDisplay = $("<div/>").append(field.DISPLAY);
                fieldDisplay.css({
                    border: 0,
                    padding: "0.5em",
                    background: "transparent",
                    "text-align": "left"
                });
                var fieldContent = enroller._createBlurb(fieldDisplay).addClass("info_expandable");
                fieldContent.css({
                    "padding-top": "0",
                    "padding-bottom": "0"
                });
                if (field.TOOLTIP != null && field.TOOLTIP != "") {
                    fieldDisplay.addClass(
                        "ui-btn-icon-right ui-icon-carat-d ui-alt-icon ui-nodisc-icon ui-btn"
                    );
                    var expandableContent = $("<div></div>")
                        .append(field.TOOLTIP)
                        .addClass("info_expand_content")
                        .hide()
                        .css({ padding: ".5em" });
                    fieldContent.append(expandableContent);
                    fieldContent.addClass("closed");
                    fieldContent.on("click", function (e) {
                        if (expandableContent.is(":visible")) {
                            fieldContent.removeClass("open").addClass("closed");
                            fieldDisplay.removeClass("ui-icon-carat-u").addClass("ui-icon-carat-d");
                            expandableContent.hide();
                        } else {
                            fieldContent.removeClass("closed").addClass("open");
                            fieldDisplay.removeClass("ui-icon-carat-d").addClass("ui-icon-carat-u");
                            expandableContent.show();
                        }
                    });
                }

                holder.append(fieldContent);
            }
            if (field.HIDE_INITIALLY == "hidden") {
                holder.css("display", "none");
            }
            holder.addClass(key + "_" + field.TYPE);

            if (field.EVENTS != null) {
                enroller._registerEventListener(key, field, key + "_" + field.TYPE);
            }
            if (field.TRIGGER_EVENTS != null) {
                enroller._registerEventTrigger(key, field, key + "_" + field.TYPE);
            }
            return holder;
        },
        /***** WP-100 Input Field Events ****/

        _registerEventListener: function (key, field, targetClass) {
            if (field.EVENTS != null) {
                $.each(field.EVENTS, function (eventID, eventDetails) {
                    if (eventDetails.LISTENER != null) {
                        enroller.element.on(
                            "enroller:" + eventDetails.LISTENER,
                            function (event, payload) {
                                var inputField;
                                if (targetClass != null) {
                                    inputField = $("." + targetClass);
                                } else {
                                    inputField = $("#" + key);
                                }

                                /*Handle checkboxes*/
                                if (!inputField.length) {
                                    if ($("." + key).length) {
                                        inputField = $("." + key);
                                    }
                                }

                                if (
                                    eventDetails.EVENT_ACTION == "clone" &&
                                    eventDetails.TARGET_FIELD != null
                                ) {
                                    var target = $("#" + eventDetails.TARGET_FIELD);
                                    if (!target.length) {
                                        target = $("." + eventDetails.TARGET_FIELD);
                                    }
                                    var doCopy = true;
                                    if (payload != null) {
                                        if (payload.fs_checked == false) {
                                            doCopy = false;
                                        }
                                    }
                                    if (target.length && doCopy) {
                                        var step = target
                                            .closest(".enroller-step")
                                            .attr("id")
                                            .replace("_step", "");
                                        var targetField =
                                            enroller.options.enroller_steps[step].FIELDS[
                                                eventDetails.TARGET_FIELD
                                            ];
                                        if (targetField != null) {
                                            enroller._updateInputValue(
                                                inputField,
                                                enroller._getInputValue(
                                                    eventDetails.TARGET_FIELD,
                                                    targetField
                                                )
                                            );
                                        }
                                    }
                                } else if (eventDetails.EVENT_ACTION == "hide") {
                                    if (inputField.closest("div.enroller-field-holder").length) {
                                        inputField.closest("div.enroller-field-holder").hide();
                                    } else {
                                        inputField.hide();
                                    }
                                } else if (eventDetails.EVENT_ACTION == "show") {
                                    if (inputField.closest("div.enroller-field-holder").length) {
                                        inputField.closest("div.enroller-field-holder").show();
                                        if (field.TYPE === "signature") {
                                            enroller._loadSignatureFields();
                                        }
                                    } else {
                                        inputField.show();
                                    }
                                } else if (eventDetails.EVENT_ACTION == "toggle") {
                                    if (inputField.closest("div.enroller-field-holder").length) {
                                        inputField.closest("div.enroller-field-holder").toggle(300);
                                        if (field.TYPE === "signature") {
                                            enroller._loadSignatureFields();
                                        }
                                    } else {
                                        inputField.toggle(300);
                                    }
                                } else if (
                                    eventDetails.EVENT_ACTION == "toggle_on_bool" &&
                                    eventDetails.TARGET_FIELD != null
                                ) {
                                    var target = $("#" + eventDetails.TARGET_FIELD);
                                    if (!target.length) {
                                        target = $("." + eventDetails.TARGET_FIELD);
                                    }

                                    if (target.length) {
                                        var step = target
                                            .closest(".enroller-step")
                                            .attr("id")
                                            .replace("_step", "");
                                        var targetField =
                                            enroller.options.enroller_steps[step].FIELDS[
                                                eventDetails.TARGET_FIELD
                                            ];
                                        if (targetField != null) {
                                            var targetVal = enroller._getInputValue(
                                                eventDetails.TARGET_FIELD,
                                                targetField
                                            );

                                            if (
                                                targetVal === "yes" ||
                                                targetVal === "true" ||
                                                targetVal === 1 ||
                                                targetVal === true ||
                                                targetVal === "1"
                                            ) {
                                                if (
                                                    inputField.closest("div.enroller-field-holder")
                                                        .length
                                                ) {
                                                    inputField
                                                        .closest("div.enroller-field-holder")
                                                        .show();
                                                    if (field.TYPE === "signature") {
                                                        enroller._loadSignatureFields();
                                                    }
                                                } else {
                                                    inputField.show();
                                                }
                                            } else {
                                                if (
                                                    inputField.closest("div.enroller-field-holder")
                                                        .length
                                                ) {
                                                    inputField
                                                        .closest("div.enroller-field-holder")
                                                        .hide();
                                                } else {
                                                    inputField.hide();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        );
                    }
                });
            }
        },
        _registerEventTrigger: function (key, field, targetClass) {
            if (field.TRIGGER_EVENTS != null) {
                $.each(field.TRIGGER_EVENTS, function (eventID, eventDetails) {
                    if (eventDetails.TRIGGER_ON) {
                        var targetSelector = "#" + key;
                        if (targetClass != null) {
                            targetSelector = targetClass;
                        }
                        enroller.element.on(
                            eventDetails.TRIGGER_ON,
                            targetSelector,
                            function (event) {
                                var element = $(this);

                                var continueTrigger = true;
                                var val = enroller._getInputValue(key, field);
                                if (
                                    eventDetails.VALUE_RESTRICTION != null &&
                                    eventDetails.VALUE_RESTRICTION != ""
                                ) {
                                    if (val != eventDetails.VALUE_RESTRICTION) {
                                        continueTrigger = false;
                                    }
                                }
                                if (continueTrigger) {
                                    if (eventDetails.TRIGGER_ON == "change") {
                                        if (field.TYPE == "flip-switch") {
                                            enroller.element.trigger(
                                                "enroller:" + eventDetails.EVENT,
                                                {
                                                    fs_checked: element.is(":checked")
                                                }
                                            );
                                        } else {
                                            enroller.element.trigger(
                                                "enroller:" + eventDetails.EVENT
                                            );
                                        }
                                    } else {
                                        enroller.element.trigger("enroller:" + eventDetails.EVENT);
                                    }
                                }
                            }
                        );
                    }
                });
            }
        },

        _createInformationField: function (key, content, contentOnly) {
            var holder = $('<div  class="enroller-field-holder" />');
            holder.append('<div class="ui-btn enroller-field-label">' + key + ":</div>");
            holder.addClass("enroller-info-field enroller-info-field-" + key);
            var contentField = $(
                '<div class="ui-btn enroller-info-text enroller-text-field ui-text-left">' +
                    content +
                    "</div>"
            );

            if (contentOnly == true) {
                contentField = content;
            }
            holder.append(contentField);
            if (content == "Complete") {
                contentField.addClass("complete ui-btn-icon-right ui-nodisc-icon ui-icon-check");
            }
            if (content == "Incomplete") {
                contentField.addClass(
                    "incomplete ui-btn-icon-right  ui-nodisc-icon ui-icon-required"
                );
            }
            if (content == "Required Complete") {
                if (enroller.options.required_complete_text != null) {
                    contentField.empty();
                    contentField.append(enroller.options.required_complete_text);
                }
                contentField.addClass(
                    "required-complete ui-btn-icon-right  ui-nodisc-icon ui-icon-alert"
                );
            }
            return holder;
        },
        _createfileImportField: function (label, name) {
            var holder = $('<div class="enroller-field-holder" />');
            holder.append('<div class="ui-btn enroller-field-label">' + label + ":</div>");
            var contentField = $('<input type="file" name="' + name + '" class="ax-import-field">');
            contentField.addClass("ui-btn enroller-field-input");
            holder.append(contentField);
            var uploadButton = $(
                '<a class="enroller-file-attach ui-btn ui-btn-icon-notext ui-alt-icon ui-nodisc-icon ui-icon-tag ui-btn-icon-right ">Choose File</a>'
            );
            uploadButton.on("click", function () {
                contentField.trigger("click");
            });

            contentField.before(uploadButton);
            return holder;
        },
        _alert: function (message, overrideType, overrideTitle) {
            message = enroller._messageReWrite(message);
            if ($("#temporaryAlert").length) {
                $("#temporaryAlert").popup("destroy");
                $("#temporaryAlert").remove();
            }
            var popup = $('<div id="temporaryAlert"></div>');
            var list = $('<ul data-role="listview"/>');
            var header = $(
                '<li data-role="list-divider" class="ui-btn ui-btn-active ui-btn-icon-right ui-text-left ui-nodisc-icon ui-icon-alert">Warning:</li>'
            );
            if (overrideType != null) {
                if (overrideType == "info") {
                    header = $(
                        '<li data-role="list-divider" class="ui-btn ui-btn-active ui-btn-icon-right ui-text-left ui-nodisc-icon ui-icon-info"></li>'
                    );
                    header.append(overrideTitle != null ? overrideTitle : "Information");
                }
            }
            list.append(header);
            var messageHolder = $('<li style="padding:1em;" />');
            messageHolder.append(message);
            list.append(messageHolder);
            popup.append(list);
            enroller.element.append(popup);

            popup
                .popup({
                    closeButton: true
                })
                .popup("open");

            /*correct positioning of poup*/
            if ($(".ui-btn-active.enroller-save-button").length) {
                header.css(
                    "background-color",
                    $(".ui-btn-active.enroller-save-button").css("background-color")
                );
                header.css("border", "none");
            }
        },
        _messageReWrite: function (message) {
            if (message != null && typeof message === "string") {
                if (message.indexOf("DOB is not a valid date") > -1) {
                    message =
                        "Please enter your Date of Birth using the datepicker provided. <br/>";
                }
            }
            return message;
        },

        _setUserRoleAndAccess: function (userData) {
            var login_roles = enroller.options.login_roles;
            if (login_roles != null) {
                var accessLevel = login_roles[userData.ROLETYPEID];
                if (accessLevel != null) {
                    enroller._confirmContactIsInAccount(userData.CONTACTID, function (contactData) {
                        enroller._setOption("user_contact_id", contactData.CONTACTID);
                        enroller.element.trigger("enroller:user_contact_set", {
                            user_contact_id: enroller.options.user_contact_id
                        });
                        enroller._setOption("contact_id", userData.CONTACTID);
                        if (contactData.GIVENNAME == null) {
                            contactData.GIVENNAME = "";
                        }
                        if (contactData.SURNAME == null) {
                            contactData.SURNAME = "";
                        }
                        enroller.element.data(
                            "userReadableName",
                            contactData.GIVENNAME + " " + contactData.SURNAME
                        );
                        enroller.element.data("organisation", contactData.ORGANISATION);
                        enroller.element.data("user_contact_data", contactData);
                        if (enroller._contactAdded != null) {
                            enroller._contactAdded(contactData);
                        }
                        if (accessLevel.is_agent) {
                            enroller._setOption("agent_id", userData.CONTACTID);
                            if (userData.ROLETYPEID == enroller.AGENT_ID) {
                                if (enroller.options.get_agent_detail != null) {
                                    enroller.options.get_agent_detail(
                                        { contactID: contactData.CONTACTID },
                                        function (response) {
                                            if (response.ACTIVE == true) {
                                                enroller.options.agent_commission =
                                                    response.DEFAULTCOMMISSIONRATE / 100;
                                            }
                                        }
                                    );
                                }
                            }
                        }
                        if (accessLevel.is_payer) {
                            enroller._setOption("payer_id", userData.CONTACTID);

                            if (userData.ROLETYPEID == enroller.CLIENT_ID) {
                                if (contactData.ORGID != null) {
                                    enroller.options.get_client_organisation(
                                        contactData.ORGID,
                                        function (orgData) {
                                            if (orgData.PAYERCONTACTID != null) {
                                                if (parseInt(orgData.PAYERCONTACTID) > 0) {
                                                    enroller._setOption(
                                                        "payer_id",
                                                        orgData.PAYERCONTACTID
                                                    );
                                                }
                                            }
                                        }
                                    );
                                }
                            }
                        }
                        enroller._setOption("contact_id", userData.CONTACTID);

                        enroller.element.data("AX_TOKEN", {
                            CONTACTID: userData.CONTACTID,
                            AXTOKEN: userData.AXTOKEN,
                            ROLETYPEID: userData.ROLETYPEID
                        });
                        enroller.element.data("USER_AX_TOKEN", {
                            CONTACTID: userData.CONTACTID,
                            AXTOKEN: userData.AXTOKEN,
                            ROLETYPEID: userData.ROLETYPEID
                        });

                        if (enroller._getNextStep != null) {
                            enroller._changeStep(enroller._getNextStep("userLogin"));
                        }
                    });
                } else {
                    enroller._alert("Sorry you do not have access to this system.");
                }
            } else if (userData.ROLETYPEID == enroller.ADMIN_ID) {
                enroller._confirmContactIsInAccount(userData.CONTACTID, function (contactData) {
                    enroller._setOption("user_contact_id", contactData.CONTACTID);
                    enroller.element.trigger("enroller:user_contact_set", {
                        user_contact_id: enroller.options.user_contact_id
                    });
                    enroller._setOption("contact_id", userData.CONTACTID);
                    if (contactData.GIVENNAME == null) {
                        contactData.GIVENNAME = "";
                    }
                    if (contactData.SURNAME == null) {
                        contactData.SURNAME = "";
                    }
                    /*double check this just in case*/
                    if (enroller.options.enroller_steps.contactSearch == null) {
                        enroller._setOption("contact_id", userData.CONTACTID);
                    }
                    enroller.element.data(
                        "userReadableName",
                        contactData.GIVENNAME + " " + contactData.SURNAME
                    );
                    enroller.element.data("userOrganisation", contactData.ORGANISATION);

                    enroller.element.data("AX_TOKEN", {
                        CONTACTID: userData.CONTACTID,
                        AXTOKEN: userData.AXTOKEN,
                        ROLETYPEID: userData.ROLETYPEID
                    });
                    enroller.element.data("USER_AX_TOKEN", {
                        CONTACTID: userData.CONTACTID,
                        AXTOKEN: userData.AXTOKEN,
                        ROLETYPEID: userData.ROLETYPEID
                    });
                });
            } else {
                enroller._alert("Sorry you do not have access to this system.");
            }
        },
        _confirmContactIsInAccount: function (contactID, callback) {
            var enroller = this;
            var axToken;
            var axTokenAll = enroller.element.data("USER_AX_TOKEN");
            if (axTokenAll != null) {
                if (axTokenAll.ROLETYPEID !== enroller.LEARNER_ID) {
                    axToken = axTokenAll.AXTOKEN;
                }
            }
            enroller.options.get_contact(
                { contactID: contactID },
                function (contactData) {
                    if (contactData.CONTACTID === undefined) {
                        if (contactData[0] !== undefined) {
                            if (contactData[0].CONTACTID !== undefined) {
                                contactData = contactData[0];
                            }
                        } else {
                            enroller._alert("Your user credentials are invalid for this account");
                        }
                    }
                    if (contactData.CONTACTID !== undefined) {
                        if (enroller.element.data("contact_data") != null) {
                            if (
                                enroller.element.data("contact_data").CONTACTID ===
                                contactData.CONTACTID
                            ) {
                                enroller.element.data("contact_data", contactData);
                            }
                        }

                        if (enroller.element.data("user_contact_data") != null) {
                            if (
                                enroller.element.data("user_contact_data").CONTACTID ===
                                contactData.CONTACTID
                            ) {
                                enroller.element.data("user_contact_data", contactData);
                            }
                        }

                        callback(contactData);
                    } else {
                        enroller._alert("Your user credentials are invalid for this account");
                    }
                },
                axToken
            );
        },

        _checkForExistingEnrolment: function (callback, paramsOverride) {
            var alreadyEnrolled = false;
            var params = {
                instanceID: enroller.options.course.INSTANCEID,
                contactID: enroller.options.contact_id,
                type: enroller.options.course.TYPE
            };
            if (paramsOverride != null) {
                params = paramsOverride;
            }
            enroller.options.enrolment_check(params, function (response) {
                if (response != null) {
                    if (response[0] != null) {
                        if (response[0].CONTACTID == null) {
                            $.each(response, function (i, enrolment) {
                                if (response[i].INSTANCEID == params.instanceID) {
                                    alreadyEnrolled = true;
                                    callback(alreadyEnrolled);
                                }
                            });
                        } else {
                            if (response[0].CONTACTID == params.contactID) {
                                var status = response[0].STATUS + "";
                                var status = status.toLowerCase();

                                if (status != "tentative") {
                                    alreadyEnrolled = true;
                                    callback(alreadyEnrolled);
                                } else if (params.type == "el") {
                                    callback(true);
                                } else {
                                    enroller._checkInvoiceStatus(params, callback);
                                }
                            } else if (params.type == "el") {
                                callback(true);
                            } else {
                                callback(alreadyEnrolled);
                            }
                        }
                    } else {
                        callback(alreadyEnrolled);
                    }
                } else {
                    callback(alreadyEnrolled);
                }
            });
        },
        _checkInvoiceStatus: function (enrolment, callback, tentative) {
            var params = {
                contactID: enrolment.contactID,
                status: "tentative",
                type: enrolment.type
            };
            if (enrolment.instanceID) {
                params.instanceID = enrolment.instanceID;
            }
            if (tentative === false) {
                delete params.status;
            }
            enroller.options.enrol_invoice_check(params, function (data) {
                var returned = false;
                if (data != null) {
                    if (data[0] != null) {
                        $.each(data, function (i) {
                            if (data[i].INSTANCEID == enrolment.instanceID) {
                                if (data[i].INVOICEPAID == true) {
                                    callback(true);
                                    returned = true;
                                    return false;
                                } else if (data[i].INVOICEID != null) {
                                    if (parseInt(data[i].INVOICEID) > 0) {
                                        if (data[i].INVOICEID != enroller.options.invoice_id) {
                                            callback(true);
                                            returned = true;
                                            return false;
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
                if (!returned) {
                    callback(false);
                }
            });
        },
        _fetchAndUpdateContactData: function (params, callback) {
            var axToken;
            var axTokenAll = enroller.element.data("USER_AX_TOKEN");
            if (axTokenAll != null) {
                if (axTokenAll.ROLETYPEID !== enroller.LEARNER_ID) {
                    axToken = axTokenAll.AXTOKEN;
                }
            }

            enroller.options.get_contact(
                params,
                function (updatedContactData) {
                    if (updatedContactData.CONTACTID === undefined) {
                        if (updatedContactData[0] !== undefined) {
                            if (updatedContactData[0].CONTACTID !== undefined) {
                                updatedContactData = updatedContactData[0];
                            }

                            if (enroller.element.data("user_contact_data") != null) {
                                if (
                                    enroller.element.data("user_contact_data").CONTACTID ==
                                    updatedContactData.CONTACTID
                                ) {
                                    enroller.element.data("user_contact_data", updatedContactData);
                                }
                            }
                        } else {
                            enroller._setOption("contact_id", 0);
                        }
                    }

                    callback(updatedContactData);
                },
                axToken
            );
        },
        _fetchAndUpdateInstanceData: function (callback, overrideParams) {
            var params = {};
            params.startDate_min = "2000-01-01";
            params.startDate_max = "2030-01-01";
            params.finishDate_min = "2000-01-01";
            params.finishDate_max = "2030-01-01";
            params.INSTANCEID = enroller.options.course.INSTANCEID;
            params.TYPE = enroller.options.course.TYPE;
            if (overrideParams != null) {
                params = overrideParams;
            }

            enroller.options.search_courses(params, function (data) {
                var allow = true;
                var mixed = false;
                if (data[0] != null) {
                    var allowPublicInhouse = enroller.element.data("allow_public_inhouse");
                    if (data[0].PUBLIC == false) {
                        if (
                            allowPublicInhouse == "public" &&
                            enroller.options.allow_mixed_inhouse_public !== true
                        ) {
                            allow = false;
                            mixed = true;
                        } else if (
                            (allowPublicInhouse == null || allowPublicInhouse == "inhouse") &&
                            enroller.options.allow_inhouse_enrolment == true
                        ) {
                            enroller.element.data("allow_public_inhouse", "inhouse");
                        } else if (
                            (allowPublicInhouse == "public" || allowPublicInhouse == "mixed") &&
                            enroller.options.allow_inhouse_enrolment == true &&
                            enroller.options.allow_mixed_inhouse_public == true
                        ) {
                            enroller.element.data("allow_public_inhouse", "mixed");
                        } else {
                            allow = false;
                        }
                    } else {
                        if (
                            allowPublicInhouse == "inhouse" &&
                            enroller.options.allow_mixed_inhouse_public !== true
                        ) {
                            allow = false;
                            mixed = true;
                        } else if (
                            allowPublicInhouse == "inhouse" &&
                            enroller.options.allow_mixed_inhouse_public === true
                        ) {
                            enroller.element.data("allow_public_inhouse", "mixed");
                        } else if (enroller.options.allow_mixed_inhouse_public !== true) {
                            enroller.element.data("allow_public_inhouse", "public");
                        }
                    }
                    if (allow) {
                        callback(data[0]);
                    }
                } else {
                    allow = false;
                }
                if (!allow) {
                    // TODO: THIS DOES NOT FIRE THE ALERT IF IN MULTIPLE MODEEEE
                    enroller._setOption("course", {
                        INSTANCEID: 0,
                        ID: enroller.options.course.ID,
                        TYPE: enroller.options.course.TYPE
                    });
                    enroller.element.trigger("enroller:unavailable_course", {
                        instance_id: params.INSTANCEID,
                        type: params.TYPE
                    });
                    var message = "A selected instance is not available for enrolment.";
                    if (mixed) {
                        message =
                            "A selected course is not compatible with other selected courses, and cannot be included in this booking. It may be possible to enrol into this course separately.";
                    }

                    if (jQuery.active > 0) {
                        $(document).one("ajaxStop", function () {
                            setTimeout(function () {
                                enroller._alert(message);
                            }, 1000);
                        });
                    } else {
                        setTimeout(function () {
                            enroller._alert(message);
                        }, 1000);
                    }
                }
            });
        },

        _getItem: function (id) {
            var items = enroller.element.data("items_list");
            if (items !== null) {
                if (items[id] != null) {
                    return items[id];
                }
            }
            return { error: "Not found" };
        },
        _getTotalItemCostByEnrolment: function (enrolment) {
            var total = 0;
            if (enroller.options.workshop_extra_billable_items && enrolment.type === "w") {
                var selected =
                    enrolment.extraBookingItemIDs != null
                        ? enrolment.extraBookingItemIDs.split(",")
                        : null;
                var bookingLookup =
                    enrolment.extraItemBookingIDs != null
                        ? enrolment.extraItemBookingIDs.split(",")
                        : null;
                if (selected != null && bookingLookup != null) {
                    $.each(bookingLookup, function (i, id) {
                        var item = enroller._getItem(id);
                        if (selected.indexOf(item.ITEMID + "") > -1) {
                            if (item != null && item.error == null) {
                                total += parseFloat(item.DEFAULTPRICE);
                            }
                        }
                    });
                }
            }
            return total;
        },
        _calculateTotalCost: function () {
            var contactID = enroller.options.contact_id;
            var total = 0;
            if (enroller.options.multiple_courses != null) {
                if (enroller.options.multiple_courses[contactID] != null) {
                    if (!$.isEmptyObject(enroller.options.multiple_courses[contactID])) {
                        $.each(
                            enroller.options.multiple_courses[contactID],
                            function (i, instance) {
                                if (i != "CONTACT_NAME") {
                                    var cost = parseFloat(instance.cost);
                                    if (isNaN(cost)) {
                                        cost = 0;
                                    }
                                    total += cost;
                                    // Add Extra Items cost
                                    var itemCost = enroller._getTotalItemCostByEnrolment(instance);

                                    if (itemCost != null) {
                                        total += itemCost;
                                    }
                                }
                            }
                        );
                    }
                }
            }

            if (total > 0) {
                return total;
            } else if (!isNaN(enroller.options.cost)) {
                return parseFloat(enroller.options.cost);
            } else {
                return total;
            }
        },
        _calculateTotalCostGroupBooking: function () {
            var total = 0;
            if (enroller.options.multiple_courses != null) {
                $.each(enroller.options.multiple_courses, function (contact, courses) {
                    $.each(courses, function (i, instance) {
                        if (i != "CONTACT_NAME") {
                            var cost = parseFloat(instance.cost);
                            if (isNaN(cost)) {
                                cost = 0;
                            }
                            total += cost;
                            // Add Extra Items cost
                            var itemCost = enroller._getTotalItemCostByEnrolment(instance);

                            if (itemCost != null) {
                                total += itemCost;
                            }
                        }
                    });
                });
            }
            if (total >= 0) {
                return total;
            } else if (!isNaN(enroller.options.cost)) {
                return parseFloat(enroller.options.cost);
            } else {
                return total;
            }
        },

        /* REVIEW STEP - DISCOUNTS */

        /*
         * Calculate the discount to be applied, set the options and call the display method;
         * */
        _calculateDiscount: function (concessions, callback) {
            var params = {
                contactID: enroller.options.contact_id,
                instanceID: enroller.options.course.INSTANCEID,
                type: enroller.options.course.TYPE
            };

            var advancedParams = enroller._enrolAdvancedParams();
            if (advancedParams) {
                var keys = Object.keys(advancedParams);
                if (keys && keys.length) {
                    params.bookingInfo = {
                        customFields: {}
                    };
                    for (var i = 0; i < keys.length; i++) {
                        var key = keys[i];
                        if (key.indexOf("CUSTOMFIELD") > -1) {
                            params.bookingInfo.customFields[key.replace("CUSTOMFIELD_", "")] =
                                advancedParams[key];
                        }
                    }
                    params.bookingInfo = JSON.stringify(params.bookingInfo);
                } else {
                    params.bookingInfo = "";
                }
            } else {
                params.bookingInfo = "";
            }

            if (!$.isEmptyObject(enroller.options.original_cost)) {
                params.originalPrice = enroller.options.original_cost;
            } else {
                var instanceData = enroller.element.data("selected_instance");
                params.originalPrice = instanceData.COST;
                enroller._setOption("original_cost", instanceData.COST);
            }

            if (concessions != null && concessions != "") {
                params.concessionDiscountIDs = concessions;
            } else {
                params.concessionDiscountIDs = 0;
            }
            if ($("#promoCode").length) {
                var promoCode = $("#promoCode").val();
                if (promoCode != null && promoCode != "") {
                    params.PromoCode = promoCode;
                }
            }
            let discountParamsSnapshot = $.extend({}, params);
            enroller.options.calculate_discount(params, function (discounts) {
                if (enroller.options.original_cost == null) {
                    enroller._setOption("original_cost", params.originalPrice);
                }
                /*if they are rounding, then round the cost at this point to prevent errors*/
                if (enroller.options.round_to_dollar) {
                    discounts.REVISEDPRICE = Math.ceil(discounts.REVISEDPRICE);
                }

                if (discounts.REVISEDPRICE < enroller.options.original_cost) {
                    enroller._setOption("cost", discounts.REVISEDPRICE);
                    enroller._setOption("discounts_selected", discounts.DISCOUNTSAPPLIED);

                    var advanced = enroller.element.data("enrol_advanced") || {};
                    advanced.discountParams = discountParamsSnapshot;
                    enroller.element.data("enrol_advanced", advanced);
                } else {
                    enroller._setOption("cost", enroller.options.original_cost);
                    enroller._setOption("discounts_selected", null);

                    var advanced = enroller.element.data("enrol_advanced");
                    if (advanced && advanced.discountParams) {
                        delete advanced.discountParams;
                    }
                    enroller.element.data("enrol_advanced", advanced);
                }
                if (callback != null) {
                    callback(discounts);
                }
            });
        },
        /*
         * Update the UI with the discounted price.
         * */
        _displayOrUpdateDiscountDisplay: function (discounts, location) {
            var discountDisplay = $(location);
            if (discountDisplay.length) {
                discountDisplay.empty();
            }
            if (discounts != null) {
                if (discounts.REVISEDPRICE < discounts.INITIALPRICE) {
                    var discHeader = {
                        DISPLAY: "Discounts Applied",
                        TYPE: "information",
                        INFO_ONLY: true
                    };
                    var discFooter = {
                        DISPLAY: enroller.options.cost_terminology + " After Discount:",
                        TYPE: "information",
                        INFO_ONLY: true
                    };
                    discountDisplay.append(enroller._createInputField("dis_header", discHeader));

                    var discountedPrice = enroller._createInformationField(
                        "Discounted " + enroller.options.cost_terminology,
                        enroller._currencyDisplayFormat(discounts.REVISEDPRICE)
                    );
                    discountedPrice.addClass("enroller-discount-fee").css("font-weight", 600);
                    if ($(".enroller-discount-fee:visible").length) {
                        $(".enroller-discount-fee:visible").remove();
                    }
                    discountedPrice.insertAfter(discountDisplay);

                    $.each(discounts.DISCOUNTSAPPLIED, function (i, discountApplied) {
                        discountDisplay.append(
                            enroller._createInformationField(
                                discountApplied.NAME,
                                discountApplied.CALCULATIONDESCRIPTION
                            )
                        );
                    });
                    discountDisplay.append(enroller._createInputField("dis_footer", discFooter));
                    discountDisplay.show();
                    //TODO: JQM Replace
                    discountDisplay.enhanceWithin();
                } else {
                    if ($(".enroller-discount-fee:visible").length) {
                        $(".enroller-discount-fee:visible").remove();
                    }
                    discountDisplay.hide();
                }
            } else {
                if ($(".enroller-discount-fee").length) {
                    $(".enroller-discount-fee").remove();
                }
                discountDisplay.hide();
            }
        },
        /*
         * Retrieve Concessions from the API - then call display method if they are found;
         * */
        _getConcessions: function (callback, overrideParams) {
            var params = {
                status: "ACTIVE",
                discountTypeID: 7,
                type: enroller.options.course.TYPE,
                instanceID: enroller.options.course.INSTANCEID,
                ID: enroller.options.course.ID
            };

            if (overrideParams != null) {
                params = overrideParams;
            }
            enroller.options.get_discounts(params, function (discounts) {
                if (discounts[0] != null) {
                    if (callback != null) {
                        callback(discounts);
                    }
                }
            });
        },
        _cleanNames: function (contactData) {
            if (contactData.GIVENNAME == null) {
                contactData.GIVENNAME = "";
            }
            if (contactData.SURNAME == null) {
                contactData.SURNAME = "";
            }
            return contactData;
        },

        /* USER CREATION */
        _createUser: function (contactID, callback, roleOverride) {
            if (roleOverride != null) {
            } else {
                if (enroller.element.data("contact_data") != null) {
                    var username =
                        enroller.element.data("contact_data").GIVENNAME +
                        "." +
                        enroller.element.data("contact_data").SURNAME;
                    username = username.replace("#[ -]+#", "");
                    var params = {
                        contactID: contactID,
                        username: username,
                        password: new Date().getTime()
                    };
                    enroller.options.create_user(params, function (response) {
                        if (response.ERROR) {
                            var time = new Date().getTime();
                            time = time.toString().slice(-2);
                            params.username = params.username + "_" + time;
                            enroller.options.create_user(params, function (response) {
                                enroller.element.data("temp_user_credentials", {
                                    CONTACTID: contactID,
                                    password: params.password,
                                    username: params.username
                                });
                                callback(response);
                            });
                        } else {
                            enroller.element.data("temp_user_credentials", {
                                CONTACTID: contactID,
                                password: params.password,
                                username: params.username
                            });
                            callback(response);
                        }
                    });
                }
            }
        },

        /* API RESPONSE MESSAGE FUNCTIONS */

        _enrolmentResponse: function (success, response) {
            var message = "";
            var responseHolder = $('<div id="enrolmentResponse" />');
            if (success) {
                responseHolder.addClass("enrolment-success");
                message =
                    "Enrolment was successfully completed. A confirmation will be sent to the student along with an invoice / receipt, if generated.";
                if (enroller.options.enrolment_response_text != null) {
                    message = enroller.options.enrolment_response_text;
                }

                responseHolder.append(message);
                if (enroller.options.disable_on_complete) {
                    enroller._disable();
                }
            } else {
                responseHolder.addClass("enrolment-failure");
                message = "";
                message += "<br/>" + enroller._loopResponse(message, response);

                message =
                    "There was an error during the enrolment, please review the enrolment details and try again. <br/>If an error occurs again please contact us to correct the issue" +
                    message;

                responseHolder.append(message);
            }
            return responseHolder;
        },
        _loopResponse: function (message, response) {
            $.each(response, function (key, record) {
                var keyToMatch = key.toUpperCase();
                if (
                    keyToMatch === "MESSAGE" ||
                    keyToMatch === "DETAILS" ||
                    keyToMatch === "MESSAGES"
                ) {
                    if (!$.isArray(record)) {
                        message += record + "<br/>";
                    } else {
                        message = enroller._loopResponse(message, record);
                    }
                } else if (typeof record === "object") {
                    message = enroller._loopResponse(message, record);
                }
            });
            return message;
        },

        _enquiryResponse: function (success, response) {
            var responseHolder = $('<div id="enquiryResponse" />');
            if (success) {
                responseHolder.addClass("enrolment-success");
                var message = "Your Enquiry was successfully submitted.";
                if (enroller.options.enquiry_response_text != null) {
                    message = enroller.options.enquiry_response_text;
                }
                responseHolder.append(message);
            } else {
                responseHolder.addClass("enrolment-failure");
                var message = "";
                message += "<br/>" + enroller._loopResponse(message, response);

                message = "There was an error submitting your enquiry." + message;

                responseHolder.append(message);
            }
            return responseHolder;
        },

        _contactNoteResponse: function (success, response) {
            var responseHolder = $('<div class="enroller-note-response" />');
            if (success) {
                responseHolder.addClass("enrolment-success");
                var message = "Successfully submitted.";
                if (enroller.options.note_response_text != null) {
                    message = enroller.options.note_response_text;
                }
                responseHolder.append(message);
            } else {
                responseHolder.addClass("enrolment-failure");
                var message = "";
                message += "<br/>" + enroller._loopResponse(message, response);

                message = "There was an error submitting your data." + message;

                responseHolder.append(message);
            }
            return responseHolder;
        },

        /* INPUT / FORM PROCESSING */

        /*update a data field - may be select/chosen/other*/
        _updateInputValue: function (inputField, value) {
            fieldType = inputField.data("field-type");
            var fieldID = inputField.attr('id');

            // any special logic for handling a specific field;
            value = enroller._handleSpecialFieldsUpdate(fieldID, value);
            
            if (fieldType === undefined) {
            } else if (fieldType == "checkbox") {
                var checked = value !== "";
                inputField.attr("checked", checked).prop("checked", checked).trigger("change");
            } else if (fieldType == "modifier") {
                var selected = "";
                var checked = false;
                if (value !== "") {
                    selected = inputField.attr("value");
                    checked = true;
                }
                inputField.closest("select").val(selected).trigger("change");
                if (enroller.options.selects_as_chosens) {
                    inputField.closest("select").trigger("chosen:updated");
                } else {
                    inputField.closest("select").selectmenu().selectmenu("refresh");
                }

                checkboxID = inputField.data("checkbox-id");

                $("#" + checkboxID)
                    .attr("checked", checked)
                    .prop("checked", checked);
            } else if (fieldType == "date") {
                var newDate = value;
                var fp = inputField[0] && inputField[0]._flatpickr;
                if (!fp) {
                    fp = flatpickr(inputField);
                }
                if (fp) {
                    fp.setDate(newDate);
                } else {
                    if (inputField.prop("type") != "date") {
                        if (value != null && value != "") {
                            newDate = enroller._dateFullFormat(new Date(value));
                        }
                        inputField.attr("type", "text").val(newDate);
                        inputField.attr("type", "date").trigger("change");
                    } else {
                        inputField.val(value);
                    }
                }
            } else if (fieldType == "flip-switch") {
                if (value == true) {
                    inputField
                        .attr("checked", value)
                        .prop("checked", value)
                        .trigger("change")
                        .flipswitch()
                        .flipswitch("refresh");
                } else {
                    inputField
                        .attr("checked", false)
                        .prop("checked", false)
                        .trigger("change")
                        .flipswitch()
                        .flipswitch("refresh");
                }
            } else {

                inputField.val(value);
                if (enroller.options.selects_as_chosens) {
                    if (fieldType == "select" || fieldType == "modifier-select") {
                        if (value === true) {
                            inputField.val("true");
                        } else if (value === false) {
                            inputField.val("false");
                        }
                        inputField.trigger("chosen:updated").trigger("change");
                    }
                } else {
                    if (fieldType == "select" || fieldType == "modifier-select") {
                        inputField.trigger("change").selectmenu().selectmenu("refresh");
                    }
                }

                if (
                    fieldType == "multi-select" ||
                    fieldType == "search-select" ||
                    fieldType == "search-select-add"
                ) {
                    if (value === true) {
                        inputField.val("true");
                    } else if (value === false) {
                        inputField.val("false");
                    }
                    inputField.trigger("change").trigger("chosen:updated");
                }
            }
        },

        // Looks up the tree to see if anything is display none between it and the step (for grouped hidden fields)
        _getParentTreeVisible: function (element) {
            if (
                element.hasClass("enroller-step") ||
                element.hasClass("enroller-widget") ||
                element.hasClass("enroller-content")
            ) {
                return true;
            }
            if (element && element.parent()) {
                var parentVisible = element.parent().css("display") != "none";
                if (parentVisible) {
                    return enroller._getParentTreeVisible(element.parent());
                }
                return false;
            }
        },
        _handleSpecialFieldsUpdate: function(key, value){
            if (key === "COMMENCINGPROGRAMCOHORTIDENTIFIERS") {
                if(typeof value === 'string' && value.length > 2 && value !== "NNNNNN"){
                    value = value.match(/.{1,2}/g) ?? [];
                }
                console.log(value);
            }
            
            return value;
        },
        _handleSpecialFieldsSave: function(key, value){
            if (key === "COMMENCINGPROGRAMCOHORTIDENTIFIERS") {
                if(typeof value !== "string"){
                    value = value.join('');
                }
                else if (value.indexOf(',')> -1){
                    value = value.replace(/,/g, '');
                }
               
            }
            
            return value;
        },

        _getInputVisible: function (key, field) {
            var Field;
            switch (field.TYPE) {
                case "checkbox":
                case "modifier-checkbox":
                    Field = $("#" + key + "_" + field.VALUES[0].VALUE).closest(
                        ".enroller-field-holder"
                    );
                    break;
                case "multi-select":
                case "search-select":
                case "search-select-add":
                case "flip-switch":
                case "select":
                case "email":
                case "text":
                case "date":
                case "signature":
                case "text-area":
                default:
                    Field = $("#" + key).closest(".enroller-field-holder");
                    if (Field.length === 0) {
                        Field = $("#" + key);
                    }
                    break;
            }
            if (!Field) {
                return false;
            }
            if (Field.is(":visible")) {
                return true;
            }
            if (!Field.is(":visible") && !Field.css("display") == "none") {
                // check the tree, as it's not explicitly hidden
                var isTreeVisible = enroller._getParentTreeVisible(Field);
                return isTreeVisible;
            }
            if (Field.css("display") == "none") {
                return false;
            }
            return true;
        },
        _getInputValue: function (key, field, skipRegex) {
            // run the value through _handleSpecialFieldsSave to apply any business rules
            var value = enroller._internalGetInputValue(key, field, skipRegex);
            return enroller._handleSpecialFieldsSave(key, value);
        },
        _internalGetInputValue: function (key, field, skipRegex) {
            /*add override here for any custom logic for the input type*/

            if (field.TYPE == "checkbox") {
                var checkboxValues = [];
                $.each(field.VALUES, function (i, box) {
                    var cleanedValue = (box.VALUE + "").replace(/ /g, "_");
                    var checkbox = $("#" + key + "_" + cleanedValue);
                    if (checkbox.is(":checked")) {
                        checkboxValues.push(box.VALUE);
                    }
                });
                if (checkboxValues.length > 0) {
                    return checkboxValues.toString();
                } else {
                    return "";
                }
            } else if (field.TYPE == "email") {
                if (enroller._isEmail($("#" + key).val())) {
                    return $("#" + key).val();
                } else {
                    return "";
                }
            } else if (field.TYPE == "multi-select") {
                var msVal = $("#" + key).val();
                if ($.isArray(msVal)) {
                    return msVal.join();
                } else {
                    return msVal;
                }
            } else if (field.TYPE == "date") {
                var fieldObj = $("#" + key);
                if (fieldObj.length) {
                    if (fieldObj.prop("type") == "text") {
                        if (fieldObj.val() === null && fieldObj.val() === "") {
                            return "";
                        } else {
                            if (fieldObj.val().indexOf("/") > -1) {
                                var parts = fieldObj.val().split("/");
                                return parts[2] + "-" + parts[1] + "-" + parts[0];
                            }
                            return fieldObj.val();
                        }
                    } else {
                        return fieldObj.val();
                    }
                }
            } else if (field.TYPE == "modifier-checkbox") {
                var checkboxValues = [];
                $.each(field.VALUES, function (i, box) {
                    var checkboxVal = "";
                    var checkbox = $("#" + key + "_" + box.VALUE);
                    if (checkbox.is(":checked")) {
                        checkboxVal = box.VALUE;
                        var modifierVal = $("#" + key + "_" + box.VALUE + "_modifier").val();
                        if (modifierVal != null) {
                            checkboxVal += modifierVal;
                        }

                        checkboxValues.push(checkboxVal);
                    }
                });
                if (checkboxValues.length > 0) {
                    return checkboxValues.toString();
                } else {
                    return "";
                }
            } else if (field.TYPE == "flip-switch") {
                return $("#" + key).is(":checked");
            } else if (field.TYPE == "signature") {
                if (typeof jQuery.fn.jSignature != "undefined") {
                    var imgData = $("#" + key).jSignature("getData", "image");
                    if (
                        imgData != null &&
                        $("#" + key).jSignature("getData", "native").length != 0
                    ) {
                        return '<img src="data:' + imgData[0] + "," + imgData[1] + '">';
                    } else {
                        return "";
                    }
                }
            } else {
                var val = $("#" + key).val();
                if (skipRegex !== true) {
                    if (field.PATTERN != null) {
                        var isValid = enroller._regexIsValid(field.PATTERN, val);
                        if (isValid) {
                            return val;
                        } else {
                            return "";
                        }
                    }
                }
                return val;
            }
        },
        _checkStatusAndBuildParams: function (fields, callback) {
            var complete = true;
            var requiredComplete = true;
            var params = {};
            var incompleteFields = [];

            var OVERRIDE_ADDRESSFIELDS = [
                "CITY",
                "STATE",
                "POSTCODE",
                "POBOX",
                "BUILDINGNAME",
                "STREETNO",
                "UNITNO",
                "STREETNAME",
                "SCITY",
                "SSTATE",
                "SPOSTCODE",
                "SPOBOX",
                "SBUILDINGNAME",
                "SSTREETNO",
                "SUNITNO",
                "SSTREETNAME",
                "COUNTRY",
                "SCOUNTRY",
                "COUNTRYID",
                "SCOUNTRYID"
            ];
            var SKIP_REGEX = true; // skip regex so that invalid fields will be detected here.
            $.each(fields, function (key, field) {
                var visible = enroller._getInputVisible(key, field);
                //TODO: something here
                if (field.INFO_ONLY == true) {
                    /*Do nothing, not required*/
                } else if (!visible && enroller.options.ignore_invisible_fields) {
                    // do nothing, is invisible.
                } else {
                    var data = enroller._getInputValue(key, field, SKIP_REGEX);

                    if (field.REQUIRED == true) {
                        if (data == null || (data == "" && data !== false)) {
                            if (field.VALUES != null) {
                                var hasNullOption = false;
                                $.each(field.VALUES, function (i, value) {
                                    if (value.VALUE == "" && value.VALUE !== false) {
                                        hasNullOption = true;
                                    }
                                });

                                if (!hasNullOption) {
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                requiredComplete = false;
                                incompleteFields.push(key);
                            }
                        } else {
                            if (field.PATTERN != null) {
                                var isValid = enroller._regexIsValid(
                                    field.PATTERN,
                                    data,
                                    SKIP_REGEX
                                );
                                if (isValid) {
                                    params[key] = data;
                                } else {
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                params[key] = data;
                            }
                        }
                    } else {
                        if (
                            (data == null || data == "") &&
                            OVERRIDE_ADDRESSFIELDS.indexOf(key) < 0
                        ) {
                            if (field.VALUES != null) {
                                var hasNullOption = false;
                                $.each(field.VALUES, function (i, value) {
                                    if (value.VALUE == "") {
                                        hasNullOption = true;
                                    }
                                });
                                if (!hasNullOption) {
                                    complete = false;
                                }
                            } else {
                                complete = false;
                            }
                        } else {
                            if (field.PATTERN != null) {
                                var isValid = enroller._regexIsValid(
                                    field.PATTERN,
                                    data,
                                    SKIP_REGEX
                                );
                                if (isValid) {
                                    params[key] = data;
                                } else {
                                    if ($("#" + key).length) {
                                        $("#" + key).trigger("input");
                                    }
                                    complete = false;
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                params[key] = data;
                            }
                        }
                    }
                }
            });
            if (callback != null) {
                if (requiredComplete == false) {
                    complete = false;
                }
                callback(params, requiredComplete, complete, incompleteFields);
            }
        },

        _markFieldIncomplete: function (fieldID, field) {
            var fieldKey = "#" + fieldID;
            if (field.TYPE != null) {
                if (field.TYPE == "checkbox" || field.TYPE == "modifier-checkbox") {
                    fieldKey = "#" + fieldID + "_" + field.VALUES[0].VALUE;
                }
            }

            enroller.element
                .find(fieldKey)
                .closest(".enroller-field-holder")
                .addClass("enroller-incomplete-field");
        },
        _checkStatusNoCallbackTest: function (fields) {
            return enroller._checkStatusAndBuildParams(
                fields,
                function (params, requiredComplete, complete) {
                    return {
                        params: params,
                        requiredComplete: requiredComplete,
                        compete: complete
                    };
                }
            );
        },
        _checkStatusNoCallback: function (fields) {
            var complete = true;
            var requiredComplete = true;
            var params = {};
            var incompleteFields = [];
            var SKIP_REGEX = true; // skip regex so that invalid fields will be detected here.
            var OVERRIDE_ADDRESSFIELDS = [
                "CITY",
                "STATE",
                "POSTCODE",
                "POBOX",
                "BUILDINGNAME",
                "STREETNO",
                "UNITNO",
                "STREETNAME",
                "SCITY",
                "SSTATE",
                "SPOSTCODE",
                "SPOBOX",
                "SBUILDINGNAME",
                "SSTREETNO",
                "SUNITNO",
                "SSTREETNAME",
                "COUNTRY",
                "SCOUNTRY",
                "COUNTRYID",
                "SCOUNTRYID"
            ];

            $.each(fields, function (key, field) {
                var visible = enroller._getInputVisible(key, field);

                //TODO: something here
                if (field.INFO_ONLY == true) {
                    /*Do nothing, not required*/
                } else if (!visible && enroller.options.ignore_invisible_fields) {
                } else {
                    var data = enroller._getInputValue(key, field, SKIP_REGEX);

                    if (field.REQUIRED == true) {
                        if (data == null || (data == "" && data !== false)) {
                            if (field.VALUES != null) {
                                var hasNullOption = false;
                                $.each(field.VALUES, function (i, value) {
                                    if (value.VALUE == "" && value.VALUE !== false) {
                                        hasNullOption = true;
                                    }
                                });

                                if (!hasNullOption) {
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                requiredComplete = false;
                                incompleteFields.push(key);
                            }
                        } else {
                            if (field.PATTERN != null) {
                                var isValid = enroller._regexIsValid(
                                    field.PATTERN,
                                    data,
                                    SKIP_REGEX
                                );
                                if (isValid) {
                                    params[key] = data;
                                } else {
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                params[key] = data;
                            }
                        }
                    } else {
                        if (
                            (data == null || data == "") &&
                            OVERRIDE_ADDRESSFIELDS.indexOf(key) < 0
                        ) {
                            if (field.VALUES != null) {
                                var hasNullOption = false;
                                $.each(field.VALUES, function (i, value) {
                                    if (value.VALUE == "") {
                                        hasNullOption = true;
                                    }
                                });
                                if (!hasNullOption) {
                                    complete = false;
                                }
                            } else {
                                complete = false;
                            }
                        } else {
                            if (field.PATTERN != null) {
                                var isValid = enroller._regexIsValid(
                                    field.PATTERN,
                                    data,
                                    SKIP_REGEX
                                );
                                if (isValid) {
                                    params[key] = data;
                                } else {
                                    if ($("#" + key).length) {
                                        $("#" + key).trigger("input");
                                    }
                                    complete = false;
                                    requiredComplete = false;
                                    incompleteFields.push(key);
                                }
                            } else {
                                params[key] = data;
                            }
                        }
                    }
                }
            });

            if (requiredComplete == false) {
                complete = false;
            }
            return { params: params, requiredComplete: requiredComplete, complete: complete };
        },

        _updateContactFields: function (contactData, contactType) {
            $.each(contactData, function (key, value) {
                var updatedKey = key;
                if (contactType) {
                    updatedKey = enroller._renameField(key, contactType);
                }
                if (value != null) {
                    if (!$.isArray(value)) {
                        if ($("#" + updatedKey).length) {
                            var inputField = $("#" + updatedKey);
                            enroller._updateInputValue(inputField, value);
                        } else {
                            /*handle comma separated lists*/
                            if ($("." + updatedKey + "-checkbox").length) {
                                var valClean = (value + "").replace(/ /g, "_");
                                if ($("#" + updatedKey + "_" + valClean).length) {
                                    var inputField = $("#" + updatedKey + "_" + valClean);
                                    enroller._updateInputValue(inputField, value);
                                } else if (value.toString().indexOf(",") > -1) {
                                    /*check for multiple checkboxes*/
                                    var splitValues = value.split(",");
                                    /*works for both checkboxes and for modified checkboxes*/

                                    $.each(splitValues, function (i, splitVal) {
                                        var splitClean = (splitVal + "").replace(/ /g, "_");
                                        var inputField = $("#" + updatedKey + "_" + splitClean);
                                        if (inputField.length) {
                                            enroller._updateInputValue(inputField, splitVal);
                                        }
                                    });
                                }
                            }
                        }
                    } else {
                        if ($("." + updatedKey + "-checkbox").length) {
                            $.each(value, function (i, splitVal) {
                                var valClean = (splitVal + "").replace(/ /g, "_");
                                var inputField = $("#" + updatedKey + "_" + valClean);
                                if (inputField.length) {
                                    enroller._updateInputValue(inputField, splitVal);
                                }
                            });
                        } else if ($("#" + updatedKey).length) {
                            enroller._updateInputValue($("#" + updatedKey), value);
                        }
                    }
                }
            });

            $.each(enroller.options.enroller_steps, function (key, step) {
                switch (step.TYPE) {
                    case "contact-update":
                    case "address":
                        if (
                            step.CONTACT_TYPE === contactType ||
                            (step.CONTACT_TYPE == null && contactType === "student")
                        ) {
                            $("#" + key + "_step").data("changed", false);
                        }

                        break;

                    default:
                        break;
                }
            });
        },
        /*populate the contact related fields with data*/
        _processContactData: function (contactData) {
            /*make sure /contacts is converted to /contact response format*/
            if (contactData.CONTACTID === undefined) {
                if (contactData[0] !== undefined) {
                    if (contactData[0].CONTACTID !== undefined) {
                        contactData = contactData[0];
                    }
                } else {
                    /*
                     * reset the contactID to 0 as the contact is not in the account
                     */
                    enroller._setOption("contact_id", 0);
                    enroller.element.trigger("enroller:contact_not_found");
                    enroller.element.trigger("enroller:update_enroller_status");
                }
            }
            /*double check that the result was not just empty*/
            if (contactData.CONTACTID !== undefined) {
                enroller.element.data("contact_data", contactData);
                if (enroller._contactAdded) {
                    enroller._contactAdded(contactData);
                }

                /*explicitly set the contact_id, bypassing _setOption*/
                enroller.options.contact_id = contactData.CONTACTID;

                /*identify the field type and update*/
                enroller._updateContactFields(contactData, "student");

                // also update these if it's the same contact;
                if (contactData.CONTACTID === enroller.options.payer_id) {
                    enroller._updateContactFields(contactData, "payer");
                }
                if (contactData.CONTACTID === enroller.options.user_contact_id) {
                    enroller._updateContactFields(contactData, "user");
                }

                enroller.element.trigger("enroller:update_enroller_status");
            }
        },
        _adjustLabelHeight: function (location) {
            $(location)
                .find(".enroller-field-input")
                .closest("div")
                .each(function (i) {
                    var innerDiv = $(this);
                    var outerDiv = innerDiv.closest(".enroller-field-holder");
                    var label = outerDiv.find(".enroller-field-label");
                    if (label.outerHeight() > innerDiv.outerHeight()) {
                        label.addClass("no-select");
                        if (label.find("span").length < 1) {
                            var newlabel = $("<span></span>").text(label.text());
                            label.empty().append(newlabel);
                            label.css("padding-top", ".9em");
                            label.css("padding-bottom", ".6em");
                        }
                    }
                });
        },
        _addInputSelectionEvent: function (parentElement) {
            $(parentElement)
                .find("input, select, textarea")
                .off("focus")
                .on("focus", function (e) {
                    var element = $(this);
                    var innerDiv = element.closest("div");
                    var label = element
                        .closest(".enroller-field-holder")
                        .find(".enroller-field-label");
                    innerDiv.addClass("no-hover");

                    if (label.outerHeight() > innerDiv.outerHeight()) {
                        label.addClass("no-select");
                    } else {
                        element
                            .closest(".enroller-field-holder")
                            .find(".enroller-field-label")
                            .addClass("enroller-field-selected");
                    }
                })
                .off("focusout")
                .on("focusout", function (e) {
                    var element = $(this);
                    element.closest("div").removeClass("no-hover");
                    element
                        .closest(".enroller-field-holder")
                        .find(".enroller-field-label")
                        .removeClass("enroller-field-selected");
                });
        },

        _scrollToTop: function () {
            enroller._scrollToElement(enroller.element);
        },

        _scrollToElement: function (element, callback) {
            var element = $(element);
            if (element.length) {
                var position = element.offset();
                if (callback == null) {
                    $("body,html")
                        .stop(true, true)
                        .animate({ scrollTop: position.top - 100 }, "slow");
                } else {
                    $("body,html")
                        .stop(true, true)
                        .animate({ scrollTop: position.top - 100 }, "slow", callback);
                }
            } else if (callback != null) {
                callback();
            }
        },

        /* UTILITY FUNCTIONS */
        _dateTransform: function (d) {
            d = new Date(d);
            var day = ("0" + d.getDate()).slice(-2);
            var month = ("0" + (d.getMonth() + 1)).slice(-2);
            var converted = d.getFullYear() + "-" + month + "-" + day;
            return converted;
        },
        _dateShortFormat: function (date) {
            date = new Date(date);
            if (date.getFullYear() === 1900) {
                return "Unknown";
            }
            days = "0" + date.getDate();
            month = "0" + (date.getMonth() + 1);
            date =
                days.substr(-2) +
                "/" +
                month.substr(-2) +
                "/" +
                (date.getFullYear() + "").substr(-2);

            return date;
        },
        _dateFullFormat: function (date) {
            date = new Date(date);
            if (date.getFullYear() === 1900) {
                return "Unknown";
            }
            days = "0" + date.getDate();
            month = "0" + (date.getMonth() + 1);
            date = days.substr(-2) + "/" + month.substr(-2) + "/" + (date.getFullYear() + "");

            return date;
        },
        _isEmail: function (value) {
            var filter = /^([._%\-a-zA-Z0-9]+[a-zA-Z0-9._%\-\+]*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]*)$/;
            return filter.test(value);
        },
        _dateFixDatepickers: function () {
            $("input.enroller-date-field").each(function (index) {
                var input = $(this);
                if (input.hasClass("hasDatepicker")) {
                    //input.date().date("destroy");
                } else {
                    input.addClass("hasDatepicker");
                    var inputVal = input.val();
                    input.attr("placeholder", "Select Date...");
                    input.flatpickr({
                        altInput: isIE != true,
                        altFormat: "F j, Y",
                        showMonths: 1,
                        dateFormat: "Y-m-d",
                        minDate: "1901-01-01",
                        defaultDate: inputVal || "",
                        monthSelectorType: "dropdown"
                    });
                }
            });
        },
        _resetAllSignatures: function () {
            enroller.element.find(".enroller-field-signature").each(function (i, signature) {
                // Simply destroy it, as IE has issues with it not being visible.
                signature = $(signature);
                signature.empty();
                // Removing this will cause it to be regenerated.
                signature.removeClass("signature-markup");
                signature.data("updated", false);
            });
        },

        _loadSignatureFields: function (step) {
            if (step == null) {
                step = "";
            }
            enroller.element
                .find(
                    ".enroller-field-signature:visible, #" +
                        step +
                        "_step .enroller-field-signature:visible"
                )
                .each(function (i, signature) {
                    signature = $(signature);
                    if (!signature.hasClass("signature-markup")) {
                        if (typeof jQuery.fn.jSignature != "undefined") {
                            var sig = signature.jSignature();
                            signature.on("change", function (e) {
                                signature.data("updated", true);
                            });
                            var undo = signature
                                .closest(".enroller-field-holder")
                                .find(".signature-undo-last");
                            undo.on("click", function (e) {
                                jSignatureInstance = sig.find("canvas").data()["jSignature.this"];

                                var data = jSignatureInstance.dataEngine.data;
                                if (data.length) {
                                    data.pop();
                                    jSignatureInstance.resetCanvas(data);
                                }
                                if (!data.length) {
                                    sig.data("updated", false);
                                }
                            });
                            var reset = signature
                                .closest(".enroller-field-holder")
                                .find(".signature-clear-all");
                            reset.on("click", function (e) {
                                sig.jSignature("reset");
                                sig.data("updated", false);
                            });

                            signature.addClass("signature-markup");
                        }
                    }
                });
        },

        _removeFieldContactType: function (fieldName) {
            var splitName = fieldName.split("_");
            if (splitName[0] === "payer" || splitName[0] === "user") {
                splitName.splice(0, 1);
            }
            return splitName.join("_");
        },

        _renameField: function (fieldName, contactType) {
            var splitName = fieldName.split("_");
            if (splitName[0] === "payer" || splitName[0] === "user") {
                splitName.splice(0, 1);
            }
            if (contactType === "student") {
                return splitName.join("_");
            } else {
                return [contactType].concat(splitName).join("_");
            }
        },

        /*unused*/
        _validityMessage: function (field, message) {
            $(field).each(function () {
                this.setCustomValidity(message);
            });
        },

        _toFixedFix: function (value) {
            return (value * 100).toFixed(0) / 100;
        },

        _currencyDisplayFormat: function (value) {
            if (value == null || value == "") {
                value = 0;
            }
            try {
                value = parseFloat(value);
                value = value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
            } catch (e) {
                return value;
            }
            return value;
        },
        TOOLTIP_H_OFFSET: 150,
        TOOLTIP_V_OFFSET: 40,

        _toolTip: function (selector, message, sticky) {
            var popupCurrent = $("#tooltipPop");
            if (popupCurrent.length) {
                popupCurrent.popup().popup("destroy");
                popupCurrent.remove();
            }

            var popup = $(
                '<div data-role="popup" data-theme="b" id="tooltipPop">' + message + "</div>"
            );
            enroller.element.append(popup);
            popup.popup({
                closeButton: sticky || false,
                noOverlay: true,
                open: true,
                destroyOnClose: true,
                isToolTip: true,
                closeByClick: true
            });
        },

        _checkVisible: function (elm, evalType) {
            evalType = evalType || "visible";

            var vpH = $(window).height(), // Viewport Height
                st = $(window).scrollTop(), // Scroll Top
                y = $(elm).offset().top,
                elementHeight = $(elm).height();

            if (evalType === "visible") return y < vpH + st && y > st - elementHeight;
            if (evalType === "above") return y < vpH + st;
        },
        hideAllSteps: function () {
            $(".enroller-step").hide().addClass("hidden-step");
        },
        hideStep: function (stepID) {
            $("#" + stepID + "_step")
                .hide()
                .addClass("hidden-step");
        },
        showStep: function (stepID) {
            $("#" + stepID + "_step")
                .show()
                .removeClass("hidden-step");
        }
    });
});
